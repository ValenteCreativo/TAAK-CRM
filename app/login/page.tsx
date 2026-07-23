"use client";
import { useState } from "react";

export default function Login(){
 const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setError("");const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});if(r.ok)location.href="/";else{setError("Contraseña incorrecta");setLoading(false)}}
 return <main className="login"><form className="login-box" onSubmit={submit}><img src="/Logo-TAAK.png" alt="TAAK" style={{width:82,height:82,objectFit:"cover",borderRadius:"50%",marginBottom:13}}/><div style={{font:"600 24px 'Space Grotesk'",letterSpacing:"-.8px"}}>TAAK Studio <span style={{color:"#8c70bd"}}>CRM</span></div><p style={{color:"var(--muted)",fontSize:12,margin:"7px 0 22px"}}>Acceso privado</p><div className="field" style={{width:"100%",textAlign:"left"}}><label>CONTRASEÑA</label><input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Escribe tu contraseña" /></div>{error&&<div className="error" style={{width:"100%",textAlign:"left"}}>{error}</div>}<button className="action lime" style={{width:"100%",marginTop:18,justifyContent:"center"}} disabled={loading}>{loading?"Entrando…":"Entrar"}</button></form></main>
}
