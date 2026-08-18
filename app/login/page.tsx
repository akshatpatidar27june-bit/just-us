'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const saved = window.localStorage.getItem('just_us_name');
    if (saved === 'Aarna' || saved === 'Akshat') setName(saved);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim().toLowerCase();
    if (value === 'aarna') {
      window.localStorage.setItem('just_us_name', 'Aarna');
      document.cookie = 'just_us_access=granted; Path=/; Max-Age=86400; SameSite=Lax';
      router.replace('/?role=her');
      return;
    }
    if (value === 'akshat') {
      window.localStorage.setItem('just_us_name', 'Akshat');
      document.cookie = 'just_us_access=granted; Path=/; Max-Age=86400; SameSite=Lax';
      router.replace('/?role=him');
      return;
    }
    setError('Please enter your name.');
  }

  return (
    <main className="entry" style={{ minHeight: '100vh' }}>
      <section className="entry-card">
        <div className="eyebrow">JUST US</div>
        <h1>Welcome back ❤️</h1>
        <p>Enter your name to continue.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Your name"
            autoComplete="name"
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 14, border: '1px solid #ddd', fontSize: 16 }}
          />
          {error && <div style={{ color: '#c0395a', fontSize: 14 }}>{error}</div>}
          <button type="submit" className="role him">CONTINUE</button>
        </form>
      </section>
    </main>
  );
}
