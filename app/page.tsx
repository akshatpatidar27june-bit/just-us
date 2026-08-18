'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/client';

type Role = 'her' | 'him';
type Message = { id: string; room_id: string; sender: Role; content: string; her_seen: boolean; him_seen: boolean; created_at: string };

function Chat({ role, onBack }: { role: Role; onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function initialize() {
      const { data: room, error: roomError } = await supabase.from('rooms').select('id').limit(1).single();
      if (!alive) return;
      if (roomError || !room) { setError(roomError?.message ?? 'Chat room unavailable.'); setLoading(false); return; }
      setRoomId(room.id);
      const { data, error: messagesError } = await supabase.from('messages').select('*').eq('room_id', room.id).order('created_at', { ascending: true });
      if (!alive) return;
      if (messagesError) setError(messagesError.message); else setMessages((data ?? []) as Message[]);
      setLoading(false);
      channel = supabase.channel(`just-us-${room.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, (payload) => {
        if (!alive) return;
        if (payload.eventType === 'INSERT') {
          const message = payload.new as Message;
          setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        } else if (payload.eventType === 'UPDATE') {
          const message = payload.new as Message;
          setMessages((current) => current.map((item) => item.id === message.id ? message : item));
        } else if (payload.eventType === 'DELETE') {
          setMessages((current) => current.filter((item) => item.id !== payload.old.id));
        }
      }).subscribe((status) => { if (alive) setOnline(status === 'SUBSCRIBED'); });
    }
    void initialize();
    return () => { alive = false; setOnline(false); if (channel) void supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!roomId) return;
    const unseenIds = messages.filter((message) => message.sender !== role).filter((message) => role === 'her' ? !message.her_seen : !message.him_seen).map((message) => message.id);
    if (unseenIds.length) void supabase.rpc('mark_seen', { p_message_ids: unseenIds, p_viewer: role });
  }, [messages, role, roomId]);

  async function send(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const content = text.trim();
    if (!content || !roomId || sending) return;
    setSending(true); setError('');
    const { data, error: sendError } = await supabase.rpc('send_message', { p_room_id: roomId, p_sender: role, p_content: content });
    if (sendError) setError(sendError.message);
    else if (data) {
      const message = data as Message;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setText('');
    }
    setSending(false);
  }

  return <main className="chat-page">
    <header className="chat-header"><button type="button" onClick={onBack} aria-label="Back">←</button><div><b>💙 Just Us</b><small>{online ? '● Live' : '○ Connecting…'}</small></div></header>
    <section className="messages" aria-live="polite">
      {loading ? <div>Opening your little corner…</div> : messages.length === 0 ? <div className="empty"><span>♡</span><strong>Nothing here yet</strong><span>Say hello. It can be anything.</span></div> : messages.map((message) => <article key={message.id} className={message.sender === role ? 'mine' : 'theirs'}><div className={`bubble ${message.sender}`}>{message.content}</div><time>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></article>)}
      <div ref={bottomRef} />
    </section>
    <form onSubmit={send} className="composer"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write something…" maxLength={4000} disabled={loading} aria-label="Message"/><button type="submit" disabled={!text.trim() || sending || !roomId} aria-label="Send message">{sending ? '…' : '↑'}</button></form>
    {error && <div className="error">{error}</div>}
  </main>;
}

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [counts, setCounts] = useState({ her: 0, him: 0 });
  useEffect(() => {
    async function loadUnreadCounts() {
      const { data: room } = await supabase.from('rooms').select('id').limit(1).single();
      if (!room) return;
      const { data: rows } = await supabase.from('messages').select('sender,her_seen,him_seen').eq('room_id', room.id);
      if (!rows) return;
      setCounts({ her: rows.filter((row) => row.sender === 'him' && !row.her_seen).length, him: rows.filter((row) => row.sender === 'her' && !row.him_seen).length });
    }
    void loadUnreadCounts();
  }, [role]);
  if (role) return <Chat role={role} onBack={() => setRole(null)} />;
  return <main className="entry"><section className="entry-card"><div className="eyebrow">JUST US</div><h1>A little place for us ❤️</h1><p>our little corner of the internet</p><div className="role-buttons"><button type="button" className="role her" onClick={() => setRole('her')}>I'M HER 🟢{counts.her > 0 && <small>{counts.her} new</small>}</button><button type="button" className="role him" onClick={() => setRole('him')}>I'M HIM 🔵{counts.him > 0 && <small>{counts.him} new</small>}</button></div></section></main>;
}
