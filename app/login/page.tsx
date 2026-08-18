'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = window.localStorage.getItem('just_us_name');
    if (saved === 'Aarna') {
      router.replace('/?role=her');
    } else if (saved === 'Akshat') {
      router.replace('/?role=him');
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <main className="entry">
      <section className="entry-card">
        <div className="eyebrow">JUST US</div>
        <h1>Opening Just Us</h1>
        <p>Please wait…</p>
      </section>
    </main>
  );
}
