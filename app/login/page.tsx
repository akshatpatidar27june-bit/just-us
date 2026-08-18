'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== 'JUST-US-2026') {
      setError('Incorrect password.');
      return;
    }
    document.cookie = 'just_us_access=granted; Path=/; Max-Age=86400; SameSite=Lax';
    router.replace('/');
  }

  return (
    <main className="entry" style={{ minHeight: '100vh' }}>
      <section className="entry-card">
        <div className="eyebrow">JUST US</div>
        <h1>Private space ❤️</h1>
        <p>Enter the password to continue.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14, border: '1px solid #ddd', fontSize: 16 }} />
          {error && <div style={{ color: '#c0395a', fontSize: 14 }}>{error}</div>}
          <button type="submit" className="role him">CONTINUE</button>
        </form>
      </section>
    </main>
  );
}
