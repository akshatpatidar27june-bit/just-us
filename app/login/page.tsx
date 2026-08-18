'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Keep the user-facing URL clean even though the legacy middleware enters here.
    window.history.replaceState({}, '', '/');
    const saved = window.localStorage.getItem('just_us_name');
    if (saved === 'Aarna' || saved === 'Akshat') {
      const role = saved === 'Aarna' ? 'her' : 'him';
      document.cookie = 'just_us_access=granted; Path=/; Max-Age=31536000; SameSite=Lax';
      router.replace(`/?role=${role}`);
    }
  }, [router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = name.trim().toLowerCase();
    const canonical = value === 'aarna' ? 'Aarna' : value === 'akshat' ? 'Akshat' : null;
    if (!canonical) {
      setError('Please enter your name.');
      return;
    }
    const role = canonical === 'Aarna' ? 'her' : 'him';
    window.localStorage.setItem('just_us_name', canonical);
    document.cookie = 'just_us_access=granted; Path=/; Max-Age=31536000; SameSite=Lax';
    router.replace(`/?role=${role}`);
  }

  return (
    <main className="entry">
      <section className="entry-card">
        <div className="eyebrow">JUST US</div>
        <h1>A little place for us ❤️</h1>
        <p>Type your name to continue.</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 24 }}>
          <input
            autoFocus
            className="name-entry"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Type your name…"
            autoComplete="name"
          />
          {error && <small style={{ color: '#b91c1c' }}>{error}</small>}
          <button type="submit" className="role him">CONTINUE</button>
        </form>
      </section>
    </main>
  );
}
