'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

type Role = 'her' | 'him';
type Message = { id: string; room_id: string; sender: Role; content: string; her_seen: boolean; him_seen: boolean; created_at: string };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

function Chat({ role, onBack }: { role: Role; onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const channel = useRef<RealtimeChannel | null>(null);

  const unread = useMemo(() => messages.filter(m => m.sender !== role && !(role === 'her' ? m.her_seen : m.him_seen)).length, [messages, role]);

  useEffect(() => {
    let active = true;
    if (!supabase) { setError('Supabase is not configured. Add the environment variables from .env.example.'); setLoading(false); return; }
    (async () => {
      const { data: rooms, error: roomError } = await supabase.from('rooms').select('id').limit(1);
      if (roomError || !rooms?.[0]) { if (active) { setError(roomError?.message || 'Chat room not found. Run the Supabase migration.'); setLoading(false); } return; }
      const id = rooms[0].id as string;
      if (!active) return;
      setRoomId(id);
      const { data, error: messageError } = await supabase.from('messages').select('*').eq('room_id', id).order('created_at', { ascending: true });
      if (messageError) setError(messageError.message); else if (active) setMessages((data || []) as Message[]);
      const c = supabase.channel(`just-us-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${id}` }, payload => {
          if (!active) return;
          if (payload.eventType === 'INSERT') setMessages(prev => prev.some(m => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]);
          if (payload.eventType === 'UPDATE') setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
          if (payload.eventType === 'DELETE') setMessages(prev => prev.filter(m => m.id !== (payload.old as Message).id));
        })
        .subscribe(status => { if (active) setOnline(status === 'SUBSCRIBED'); });
      channel.current = c;
      setLoading(false);
    })();
    return () => { active = false; if (channel.current && supabase) supabase.removeChannel(channel.current); channel.current = null; };
  }, []);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  useEffect(() => {
    if (!supabase || !roomId) return;
    const unseen = messages.filter(m => m.sender !== role && !(role === 'her' ? m.her_seen : m.him_seen)).map(m => m.id);
    if (unseen.length) supabase.rpc('mark_seen', { p_message_ids: unseen, p_viewer: role });
  }, [messages, role, roomId]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const content = text.trim();
    if (!content || !roomId || !supabase || sending) return;
    setSending(true); setError('');
    const { data, error: sendError } = await supabase.rpc('send_message', { p_room_id: roomId, p_sender: role, p_content: content });
    if (sendError) setError(sendError.message); else if (data?.[0] && !messages.some(m => m.id === data[0].id)) setMessages(prev => [...prev, data[0] as Message]);
    setText(''); setSending(false);
  }

  return <main className="chat-page"><header className="chat-header"><button className="back" onClick={onBack} aria-label="Back">←</button><div><div className="brand">💙 Just Us</div><div className="status"><span className={online ? 'dot on' : 'dot'} />{online ? 'Live' : 'Connecting…'}</div></div>{unread > 0 && <span className="unread">{unread} new</span>}</header><section className="messages" aria-live="polite">{loading ? <div className="center">Opening your little corner…</div> : messages.length === 0 ? <div className="empty"><div>♡</div><strong>Nothing here yet</strong><span>Say hello. It can be anything.</span></div> : messages.map(m => <article key={m.id} className={`bubble-wrap ${m.sender === role ? 'mine' : 'theirs'}`}><div className={`bubble ${m.sender}`}>{m.content}</div><time>{new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></article>)}<div ref={bottom} /></section><form className="composer" onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Write something…" aria-label="Message" maxLength={4000} disabled={loading}/><button type="submit" disabled={!text.trim() || sending || !roomId} aria-label="Send">{sending ? '…' : '↑'}</button></form>{error && <div className="error">{error}</div>}</main>;
}

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [counts, setCounts] = useState({ her: 0, him: 0 });
  useEffect(() => {
    if (!supabase) return;
    supabase.from('rooms').select('id').limit(1).single().then(async ({ data }) => {
      if (!data) return;
      const { data: rows } = await supabase.from('messages').select('sender,her_seen,him_seen').eq('room_id', data.id);
      if (rows) setCounts({ her: rows.filter(m => m.sender === 'him' && !m.her_seen).length, him: rows.filter(m => m.sender === 'her' && !m.him_seen).length });
    });
  }, [role]);
  if (role) return <Chat role={role} onBack={() => setRole(null)} />;
  return <main className="entry"><section className="entry-card"><div className="eyebrow">JUST US</div><h1>A little place for us <span>❤️</span></h1><p>our little corner of the internet</p><div className="role-buttons"><button className="role her" onClick={() => setRole('her')}>I'M HER <b>🟢</b>{counts.her > 0 && <small>{counts.her} new</small>}</button><button className="role him" onClick={() => setRole('him')}>I'M HIM <b>🔵</b>{counts.him > 0 && <small>{counts.him} new</small>}</button></div></section></main>;
}
