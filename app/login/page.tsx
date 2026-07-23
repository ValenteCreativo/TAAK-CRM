"use client";
import { useState } from "react";

export default function Login(){
 const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setLoading(true);setError("");const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});if(r.ok)location.href="/";else{setError("Contraseña incorrecta");setLoading(false)}}
 return <main className="login" style={{background:"#050708",padding:20}}><form className="login-box" onSubmit={submit} style={{width:"min(390px,100%)",background:"#fff",borderRadius:20,padding:"38px 32px",boxShadow:"0 22px 80px #00000080"}}><img src="/Logo-TAAK.png" alt="TAAK" style={{width:82,height:82,objectFit:"cover",borderRadius:"50%",marginBottom:16}}/><div style={{font:"600 25px 'Space Grotesk'",letterSpacing:"-.8px"}}>TAAK Studio <span style={{color:"#8c70bd"}}>CRM</span></div><p style={{color:"#728083",fontSize:12,margin:"8px 0 25px"}}>Acceso privado</p><div className="field" style={{width:"100%",textAlign:"left",margin:0}}><label>CONTRASEÑA</label><input autoFocus type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••" /></div>{error&&<div className="error" style={{width:"100%",textAlign:"left",marginTop:9}}>{error}</div>}<button className="action lime" style={{width:"100%",marginTop:19,justifyContent:"center",padding:12}} disabled={loading}>{loading?"Entrando…":"Entrar"}</button></form></main>
}
