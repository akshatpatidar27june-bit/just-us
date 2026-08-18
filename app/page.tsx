'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../supabase/client';

type Role = 'her' | 'him';
type Message = {
  id: string;
  room_id: string;
  sender: Role;
  content: string;
  her_seen: boolean;
  him_seen: boolean;
  created_at: string;
};

async function getRoomId() {
  const { data, error } = await supabase
    .from('rooms')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function getUnreadCounts(roomId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('sender,her_seen,him_seen')
    .eq('room_id', roomId);
  if (error) throw error;

  return {
    her: (data ?? []).filter(
      (r) => r.sender === 'him' && !r.her_seen,
    ).length,
    him: (data ?? []).filter(
      (r) => r.sender === 'her' && !r.him_seen,
    ).length,
  };
}

function Chat({ role, onBack }: { role: Role; onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refreshMessages(id: string) {
    const { data, error: refreshError } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true });
    if (!refreshError) setMessages((data ?? []) as Message[]);
  }

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      setLoading(true);
      setError('');

      if (!isSupabaseConfigured()) {
        setError('Supabase is not configured.');
        setLoading(false);
        return;
      }

      try {
        const id = await getRoomId();
        if (!alive) return;
        if (!id) {
          setError('The Just Us chat room was not found.');
          setLoading(false);
          return;
        }

        setRoomId(id);
        const { data, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', id)
          .order('created_at', { ascending: true });

        if (!alive) return;
        if (messagesError) setError(messagesError.message);
        else setMessages((data ?? []) as Message[]);
        setLoading(false);

        channel = supabase
          .channel(`just-us-${id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${id}`,
            },
            (payload) => {
              if (!alive) return;

              if (payload.eventType === 'INSERT') {
                const message = payload.new as Message;
                setMessages((current) =>
                  current.some((item) => item.id === message.id)
                    ? current
                    : [...current, message],
                );
              } else if (payload.eventType === 'UPDATE') {
                const message = payload.new as Message;
                setMessages((current) =>
                  current.map((item) =>
                    item.id === message.id ? message : item,
                  ),
                );
              } else if (payload.eventType === 'DELETE') {
                setMessages((current) =>
                  current.filter((item) => item.id !== payload.old.id),
                );
              }
            },
          )
          .subscribe((status) => {
            if (!alive) return;
            setOnline(status === 'SUBSCRIBED');
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setError('Realtime connection unavailable.');
            }
          });
      } catch (caught) {
        if (alive) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Unable to open the chat.',
          );
        }
        setLoading(false);
      }
    }

    void initialize();

    return () => {
      alive = false;
      setOnline(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const id = roomId;
    if (!id || !messages.length) return;

    const unseenIds = messages
      .filter(
        (message) =>
          message.sender !== role &&
          (role === 'her' ? !message.her_seen : !message.him_seen),
      )
      .map((message) => message.id);

    if (!unseenIds.length) return;

    let cancelled = false;

    async function markAndRefresh() {
      const { error: seenError } = await supabase.rpc('mark_seen', {
        p_message_ids: unseenIds,
        p_viewer: role,
      });

      if (cancelled) return;
      if (seenError) {
        setError(`Seen update failed: ${seenError.message}`);
        return;
      }
      await refreshMessages(id);
    }

    void markAndRefresh();

    return () => {
      cancelled = true;
    };
  }, [messages, role, roomId]);

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    const id = roomId;
    if (!id) {
      setError('Chat is still connecting.');
      return;
    }

    setSending(true);
    setError('');

    const { data, error: sendError } = await supabase
      .from('messages')
      .insert({
        room_id: id,
        sender: role,
        content,
        her_seen: role === 'her',
        him_seen: role === 'him',
      })
      .select('*')
      .single();

    if (sendError) {
      setError(`Message failed: ${sendError.message}`);
    } else if (data) {
      const message = data as Message;
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
      setText('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }

    setSending(false);
  }

  async function deleteMessage(id: string) {
    if (!window.confirm('Delete this message?')) return;

    const currentRoomId = roomId;
    if (!currentRoomId) {
      setError('Chat is still connecting.');
      return;
    }

    setError('');
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('room_id', currentRoomId);

    if (deleteError) {
      setError(`Delete failed: ${deleteError.message}`);
    } else {
      setMessages((current) => current.filter((message) => message.id !== id));
    }
  }

  async function deleteChat() {
    const currentRoomId = roomId;
    if (!currentRoomId || deletingChat) return;
    if (!window.confirm('Delete the entire chat? This cannot be undone.')) return;

    setDeletingChat(true);
    setError('');

    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('room_id', currentRoomId);

    if (deleteError) {
      setError(`Chat deletion failed: ${deleteError.message}`);
    } else {
      setMessages([]);
    }

    setDeletingChat(false);
  }

  return (
    <main className="chat-page">
      <header className="chat-header">
        <button type="button" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div>
          <b>💙 Just Us</b>
          <small>
            {online ? '● Live' : loading ? '○ Connecting…' : '○ Offline'}
          </small>
        </div>
        <button
          type="button"
          onClick={() => void deleteChat()}
          disabled={deletingChat || !roomId}
          aria-label="Delete entire chat"
          title="Delete entire chat"
        >
          🗑️
        </button>
      </header>

      <section className="messages" aria-live="polite">
        {loading ? (
          <div>Opening your little corner…</div>
        ) : messages.length === 0 ? (
          <div className="empty">
            <span>♡</span>
            <strong>Nothing here yet</strong>
            <span>Say hello. It can be anything.</span>
          </div>
        ) : (
          messages.map((message) => (
            <article
              key={message.id}
              className={message.sender === role ? 'mine' : 'theirs'}
            >
              <div>
                <div className={`bubble ${message.sender}`}>
                  {message.content}
                </div>
                <time>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <button
                type="button"
                className="delete-message"
                onClick={() => void deleteMessage(message.id)}
                aria-label="Delete message"
                title="Delete message"
              >
                ×
              </button>
            </article>
          ))
        )}
        <div ref={bottomRef} />
      </section>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <form
        onSubmit={send}
        className="composer"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          placeholder="Write something…"
          maxLength={4000}
          aria-label="Message"
          autoComplete="off"
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send message"
        >
          {sending ? '…' : '↑'}
        </button>
      </form>
    </main>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [counts, setCounts] = useState({ her: 0, him: 0 });

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadUnreadCounts() {
      if (!isSupabaseConfigured()) return;

      try {
        const roomId = await getRoomId();
        if (!roomId || !alive) return;

        const next = await getUnreadCounts(roomId);
        if (alive) setCounts(next);

        channel = supabase
          .channel(`just-us-unread-${roomId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `room_id=eq.${roomId}`,
            },
            async () => {
              try {
                const latest = await getUnreadCounts(roomId);
                if (alive) setCounts(latest);
              } catch {
                // Ignore transient unread-count refresh failures.
              }
            },
          )
          .subscribe();
      } catch {
        // Ignore initial unread-count failures.
      }
    }

    void loadUnreadCounts();

    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  if (role) return <Chat role={role} onBack={() => setRole(null)} />;

  return (
    <main className="entry">
      <section className="entry-card">
        <div className="eyebrow">JUST US</div>
        <h1>A little place for us ❤️</h1>
        <p>our little corner of the internet</p>
        <div className="role-buttons">
          <button
            type="button"
            className="role her"
            onClick={() => setRole('her')}
          >
            I'M HER 🟢
            {counts.her > 0 && <small>{counts.her} new</small>}
          </button>
          <button
            type="button"
            className="role him"
            onClick={() => setRole('him')}
          >
            I'M HIM 🔵
            {counts.him > 0 && <small>{counts.him} new</small>}
          </button>
        </div>
      </section>
    </main>
  );
}
