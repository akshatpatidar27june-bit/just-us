'use client';

import { useState } from 'react';

type Role = 'her' | 'him';

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  if (role) return <main style={{maxWidth:720,margin:'0 auto',minHeight:'100vh',padding:24}}><header style={{padding:'18px 0',fontSize:22,fontWeight:700}}>💙 Just Us</header><section style={{borderRadius:28,background:'#fff',padding:24,boxShadow:'0 10px 40px rgba(80,40,70,.08)'}}><p style={{textAlign:'center',opacity:.6}}>Chat is ready for {role === 'her' ? 'Her 🟢' : 'Him 🔵'}.</p><div style={{display:'flex',gap:10,marginTop:20}}><input aria-label="Message" placeholder="Write something…" style={{flex:1,border:'1px solid #eadfe7',borderRadius:16,padding:14}}/><button style={{border:0,borderRadius:16,padding:'0 20px',background:role==='her'?'#c8efcf':'#c9dcff'}}>Send</button></div></section></main>;
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><section style={{width:'100%',maxWidth:460,textAlign:'center'}}><div style={{fontSize:13,letterSpacing:4,opacity:.55}}>JUST US</div><h1 style={{fontSize:44,margin:'14px 0 8px'}}>A little place for us ❤️</h1><p style={{opacity:.55,marginBottom:32}}>our little corner of the internet</p><div style={{display:'grid',gap:12}}><button onClick={()=>setRole('her')} style={{padding:18,borderRadius:20,border:'1px solid #b9dfc0',background:'#effaf1',fontWeight:700}}>I'M HER 🟢</button><button onClick={()=>setRole('him')} style={{padding:18,borderRadius:20,border:'1px solid #b8cef0',background:'#eff5ff',fontWeight:700}}>I'M HIM 🔵</button></div></section></main>;
}