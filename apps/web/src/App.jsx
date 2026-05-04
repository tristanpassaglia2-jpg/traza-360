import React, { useEffect, useRef, useState } from "react";
import { signUp, signIn, signOut, getCurrentUser, supabase, getContactos, addContacto, deleteContacto, getMedicamentos, addMedicamento, deleteMedicamento, getTomasHoy, getTomasSemana, marcarTomado, crearTomasDelDia } from "./lib/supabase";

/* ═══════════════════════════════════════════════════════════════
   TRAZA 360 — v18
   Mayo 2026
   ─────────────────────────────────────────────────────────────
   NUEVO v18:
   · Fallback multicanal: WhatsApp → SMS → Llamada de voz
   · Cola de mensajes con retry automático
   · Logs de entrega (sabe si llegó o no)
   · Botón de pánico con micro-animación premium
   · Branding fuerte en alertas (no texto plano)
   · Onboarding guiado de 3 pasos
   · Dashboard semáforo de estado
   ═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ─────────────────────────────────
const WHATSAPP_DEFAULT = "5493513956879";

const PLAN_LIMITS = {
  gratis:  { contactos: 2, medicamentos: 1, audioMax: 300 },
  mensual: { contactos: 5, medicamentos: 5, audioMax: 1800 },
  anual:   { contactos: 10, medicamentos: -1, audioMax: -1 },
};
const PLAN_PRICES = {
  gratis:  { name: "Gratis",  price: "US$0" },
  mensual: { name: "Mensual", price: "US$4.99/mes" },
  anual:   { name: "Anual",   price: "US$39.99/año" },
};

const PAISES = [
  { code:"AR", flag:"\u{1F1E6}\u{1F1F7}", prefix:"54",  label:"+54 Argentina" },
  { code:"MX", flag:"\u{1F1F2}\u{1F1FD}", prefix:"52",  label:"+52 México" },
  { code:"CO", flag:"\u{1F1E8}\u{1F1F4}", prefix:"57",  label:"+57 Colombia" },
  { code:"CL", flag:"\u{1F1E8}\u{1F1F1}", prefix:"56",  label:"+56 Chile" },
  { code:"UY", flag:"\u{1F1FA}\u{1F1FE}", prefix:"598", label:"+598 Uruguay" },
  { code:"PY", flag:"\u{1F1F5}\u{1F1FE}", prefix:"595", label:"+595 Paraguay" },
  { code:"BO", flag:"\u{1F1E7}\u{1F1F4}", prefix:"591", label:"+591 Bolivia" },
  { code:"PE", flag:"\u{1F1F5}\u{1F1EA}", prefix:"51",  label:"+51 Perú" },
  { code:"BR", flag:"\u{1F1E7}\u{1F1F7}", prefix:"55",  label:"+55 Brasil" },
  { code:"US", flag:"\u{1F1FA}\u{1F1F8}", prefix:"1",   label:"+1 USA" },
  { code:"ES", flag:"\u{1F1EA}\u{1F1F8}", prefix:"34",  label:"+34 España" },
];
const RELACIONES = ["Madre","Padre","Hermana","Hermano","Pareja","Amigo/a","Hija","Hijo","Vecino/a","Otro"];
const COLORES_MED = [
  { key:"blue",   bg:"bg-blue-500/20",    border:"border-blue-500/40",    text:"text-blue-300",    dot:"bg-blue-400" },
  { key:"green",  bg:"bg-emerald-500/20", border:"border-emerald-500/40", text:"text-emerald-300", dot:"bg-emerald-400" },
  { key:"red",    bg:"bg-red-500/20",     border:"border-red-500/40",     text:"text-red-300",     dot:"bg-red-400" },
  { key:"purple", bg:"bg-purple-500/20",  border:"border-purple-500/40",  text:"text-purple-300",  dot:"bg-purple-400" },
  { key:"orange", bg:"bg-orange-500/20",  border:"border-orange-500/40",  text:"text-orange-300",  dot:"bg-orange-400" },
  { key:"pink",   bg:"bg-pink-500/20",    border:"border-pink-500/40",    text:"text-pink-300",    dot:"bg-pink-400" },
];
const DIAS_SEMANA = [
  {num:1,short:"Lun"},{num:2,short:"Mar"},{num:3,short:"Mié"},
  {num:4,short:"Jue"},{num:5,short:"Vie"},{num:6,short:"Sáb"},{num:7,short:"Dom"},
];

// ─── UTILS ──────────────────────────────────
function limpiarNumero(n) { return n.trim().replace(/\s/g,"").replace(/-/g,"").replace(/^0+/,"").replace(/^15/,""); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getRelEmoji(r) {
  return {"Madre":"\u{1F469}","Padre":"\u{1F468}","Hermana":"\u{1F46D}","Hermano":"\u{1F46C}","Pareja":"\u{1F491}","Amigo/a":"\u{1F91D}","Hija":"\u{1F467}","Hijo":"\u{1F466}","Vecino/a":"\u{1F3D8}\u{FE0F}","Otro":"\u{1F464}"}[r]||"\u{1F464}";
}

// ─── GEO ────────────────────────────────────
let _lastLoc = null;
function saveLoc(lat,lng) { _lastLoc={lat,lng,ts:Date.now()}; try{sessionStorage.setItem("t360loc",JSON.stringify(_lastLoc));}catch(e){} }
function loadLoc() { if(_lastLoc)return _lastLoc; try{const r=sessionStorage.getItem("t360loc");if(r){_lastLoc=JSON.parse(r);return _lastLoc;}}catch(e){} return null; }
function mapLink(loc) { return loc?`https://www.google.com/maps?q=${loc.lat},${loc.lng}`:null; }

function getLoc() {
  return new Promise(resolve=>{
    if(!navigator.geolocation){resolve({loc:loadLoc(),src:"fallback"});return;}
    const t=setTimeout(()=>resolve({loc:loadLoc(),src:"fallback"}),5000);
    navigator.geolocation.getCurrentPosition(
      p=>{clearTimeout(t);const loc={lat:p.coords.latitude,lng:p.coords.longitude};saveLoc(loc.lat,loc.lng);resolve({loc,src:"live"});},
      ()=>{clearTimeout(t);resolve({loc:loadLoc(),src:"fallback"});},
      {enableHighAccuracy:true,timeout:5000,maximumAge:30000}
    );
  });
}

// ─── MESSAGING MULTICANAL ────────────────────
// Estado global de canales
const channelStatus = { whatsapp: null, sms: null, voice: null };

async function sendViaAPI(to, message, priority = "normal") {
  try {
    const res = await fetch("/api/send-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message, priority, channels: ["whatsapp", "sms"] }),
    });
    return await res.json();
  } catch(e) { return { success: false, error: e.message }; }
}

async function sendVoiceCall(to, mensaje, nombre_victima) {
  try {
    const res = await fetch("/api/llamada-voz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, mensaje, nombre_victima }),
    });
    return await res.json();
  } catch(e) { return { success: false, error: e.message }; }
}

// Envío inteligente con fallback y logs
async function enviarAlerta(to, message, options = {}) {
  const { priority = "normal", withVoice = false, nombreVictima = "" } = options;
  const result = await sendViaAPI(to, message, priority);

  // Si falla completamente y se pide con voz → llamada automática
  if (!result.success && withVoice) {
    const voiceResult = await sendVoiceCall(to, null, nombreVictima);
    return { ...result, voiceFallback: voiceResult.success, channel: voiceResult.success ? "voice" : "all_failed" };
  }
  return result;
}

// Fallback a wa.me si la API falla
async function enviarWhatsApp(to, text) {
  const result = await sendViaAPI(to, text, "normal");
  if (!result.success && !result.queued) {
    const n = to.replace(/\+/g,"").replace(/\s/g,"");
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  return result;
}

function buildMsg(base, loc) {
  let m = base;
  if (loc) m += `\n\n📍 Ubicación: ${mapLink(loc)}`;
  m += "\n\n📱 Responder:\n✅ OK  👍 Recibí  🏃 Voy  🚗 Salgo  🏠 En casa  👋 Llegué  🚨 Emergencia";
  return m;
}

function openMaps(d) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}`,"_blank"); }
function openUber(d) { window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(d)}`,"_blank"); }

// ─── NOTIFICACIONES ─────────────────────────
async function askNotifPerm() {
  if(!("Notification" in window))return false;
  if(Notification.permission==="granted")return true;
  return (await Notification.requestPermission())==="granted";
}
function pushNotif(title,body) {
  if(Notification.permission==="granted") new Notification(title,{body,icon:"/favicon.ico"});
}
function playAlert() {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator(); const g=ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value=800; g.gain.value=0.3; osc.start();
    setTimeout(()=>{osc.frequency.value=1000;},200);
    setTimeout(()=>{osc.frequency.value=800;},400);
    setTimeout(()=>{osc.stop();ctx.close();},600);
  }catch(e){}
}

// ─── AUDIO RECORDING ────────────────────────
let _recorder=null, _chunks=[];
function getMime() {
  if(typeof MediaRecorder==="undefined")return"audio/webm";
  for(const t of["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg","audio/aac"]) if(MediaRecorder.isTypeSupported(t))return t;
  return"";
}
function getExt(m) { if(m.includes("mp4"))return"mp4"; if(m.includes("ogg"))return"ogg"; if(m.includes("aac"))return"aac"; return"webm"; }

async function startRec() {
  try {
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    _chunks=[];
    const opts=getMime()?{mimeType:getMime()}:{};
    _recorder=new MediaRecorder(stream,opts);
    _recorder.ondataavailable=e=>{if(e.data.size>0)_chunks.push(e.data);};
    _recorder.start();
    return {success:true};
  }catch(e){return{success:false,error:e.message};}
}
function stopRec() {
  return new Promise(resolve=>{
    if(!_recorder||_recorder.state==="inactive"){resolve(null);return;}
    _recorder.onstop=()=>{
      const mime=_recorder.mimeType||getMime()||"audio/webm";
      resolve(new Blob(_chunks,{type:mime}));
      _recorder.stream.getTracks().forEach(t=>t.stop());
    };
    _recorder.stop();
  });
}
async function saveEvidence(blob,tipo="audio") {
  const ts=new Date().toISOString().replace(/[:.]/g,"-");
  const ext=getExt(blob.type||"audio/webm");
  try {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)throw new Error("No autenticado");
    const path=`${user.id}/${tipo}_${ts}.${ext}`;
    const {data,error}=await supabase.storage.from("evidencias").upload(path,blob,{contentType:blob.type||"audio/webm",upsert:false});
    if(error)throw error;
    return{success:true,path:data.path,cloud:true};
  }catch(e){
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`evidencia_${ts}.${ext}`;document.body.appendChild(a);a.click();document.body.removeChild(a);
    return{success:true,fallback:true};
  }
}
async function listEvidence() {
  try {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return[];
    const {data,error}=await supabase.storage.from("evidencias").list(user.id,{limit:100,sortBy:{column:"created_at",order:"desc"}});
    if(error)return[];
    return(data||[]).map(f=>({...f,fullPath:`${user.id}/${f.name}`}));
  }catch(e){return[];}
}
async function getEvidenceUrl(path) { const {data}=await supabase.storage.from("evidencias").createSignedUrl(path,3600); return data?.signedUrl||null; }
async function deleteEvidence(path) { const {error}=await supabase.storage.from("evidencias").remove([path]); return !error; }

// ─── VERIFICAR CONTACTO ──────────────────────
async function verificarContacto(tel, nombreContacto, nombreUsuario) {
  return sendViaAPI(tel, `Hola ${nombreContacto} 👋 Soy ${nombreUsuario}.\n\nTe agregué como contacto de confianza en *Traza 360* 🛡️\n\nSi recibís esto, el sistema funciona correctamente.\n\nRespondé "OK" para confirmar.\n\n_traza360.app_`, "normal");
}

// ─── LOGO ─────────────────────────────────────
function EagleEyeLogo({ size=80 }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#d4af37"/><stop offset="50%" stopColor="#f5e6a3"/><stop offset="100%" stopColor="#d4af37"/></linearGradient>
        <linearGradient id="sd" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#1a1a2e"/><stop offset="100%" stopColor="#0a0a14"/></linearGradient>
        <linearGradient id="eg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#d4af37"/><stop offset="100%" stopColor="#b8860b"/></linearGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
      </defs>
      <path d="M100 10 L185 50 L185 110 C185 155 145 185 100 195 C55 185 15 155 15 110 L15 50 Z" fill="url(#sd)" stroke="url(#sg)" strokeWidth="3"/>
      <ellipse cx="100" cy="105" rx="52" ry="32" fill="none" stroke="url(#eg)" strokeWidth="2.5" filter="url(#glow)"/>
      <circle cx="100" cy="105" r="20" fill="url(#eg)" opacity="0.9"/>
      <circle cx="100" cy="105" r="10" fill="#0a0a14"/>
      <circle cx="106" cy="99" r="4" fill="rgba(245,230,163,0.7)"/>
      <path d="M48 90 Q74 65 100 68" fill="none" stroke="url(#eg)" strokeWidth="2" strokeLinecap="round"/>
      <path d="M152 90 Q126 65 100 68" fill="none" stroke="url(#eg)" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="100,28 103,36 111,36 105,41 107,49 100,45 93,49 95,41 89,36 97,36" fill="#d4af37" opacity="0.9"/>
      <text x="100" y="165" textAnchor="middle" fill="#d4af37" fontSize="11" fontWeight="800" letterSpacing="4" fontFamily="sans-serif">TRAZA 360</text>
      <text x="100" y="178" textAnchor="middle" fill="rgba(212,175,55,0.5)" fontSize="7" letterSpacing="2" fontFamily="sans-serif">PROTECCIÓN</text>
    </svg>
  );
}

// ─── SYSTEM STATUS BADGE ─────────────────────
function StatusBadge({ status }) {
  const cfg = {
    ok:      { color:"#22c55e", label:"Sistema activo",    dot:"bg-green-400",  bg:"rgba(34,197,94,0.1)",   border:"rgba(34,197,94,0.3)" },
    warning: { color:"#f59e0b", label:"Verificando...",    dot:"bg-yellow-400", bg:"rgba(245,158,11,0.1)",  border:"rgba(245,158,11,0.3)" },
    error:   { color:"#ef4444", label:"WhatsApp inactivo", dot:"bg-red-400",    bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.3)" },
  }[status] || { color:"#f59e0b", label:"Verificando...", dot:"bg-yellow-400", bg:"rgba(245,158,11,0.1)", border:"rgba(245,158,11,0.3)" };
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}

// ─── BOTÓN PÁNICO ANIMADO ────────────────────
function PanicButton({ onPress, disabled }) {
  const [pressing, setPressing] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);
  const holdMs = 1000; // 1 segundo de hold para evitar accidentales

  function handlePressStart(e) {
    e.preventDefault();
    if (disabled || sent) return;
    setPressing(true);
    setCountdown(holdMs);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, holdMs - elapsed);
      setCountdown(remaining);
      if (elapsed >= holdMs) {
        clearInterval(interval);
        setPressing(false);
        setCountdown(null);
        setSent(true);
        setTimeout(() => setSent(false), 4000);
        onPress();
      }
    }, 50);
    timerRef.current = interval;
  }

  function handlePressEnd() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPressing(false);
    setCountdown(null);
  }

  const progress = countdown !== null ? ((holdMs - countdown) / holdMs) * 100 : 0;
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="flex flex-col items-center gap-2">
      <div style={{ position: "relative", width: 88, height: 88 }}>
        {/* Anillo de progreso */}
        {pressing && (
          <svg style={{ position: "absolute", inset: -8, width: 104, height: 104, transform: "rotate(-90deg)" }}>
            <circle cx="52" cy="52" r="36" fill="none" stroke="rgba(212,175,55,0.2)" strokeWidth="4" />
            <circle cx="52" cy="52" r="36" fill="none" stroke="#d4af37" strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={circumference - (progress / 100) * circumference}
              style={{ transition: "stroke-dashoffset 50ms linear" }} />
          </svg>
        )}
        {/* Pulso exterior (cuando no se está presionando) */}
        {!pressing && !sent && (
          <>
            <div style={{ position:"absolute", inset:-10, borderRadius:"50%", border:"1px solid rgba(185,28,28,0.3)", animation:"panicRing1 2s infinite" }} />
            <div style={{ position:"absolute", inset:-18, borderRadius:"50%", border:"1px solid rgba(185,28,28,0.15)", animation:"panicRing2 2s infinite 0.5s" }} />
          </>
        )}
        {/* Botón */}
        <button
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          disabled={disabled}
          className="flex h-[88px] w-[88px] items-center justify-center rounded-full select-none"
          style={{
            background: sent
              ? "linear-gradient(145deg, #166534, #14532d)"
              : pressing
              ? "linear-gradient(145deg, #dc2626, #b91c1c)"
              : "linear-gradient(145deg, #b91c1c, #991b1b)",
            border: pressing ? "2px solid rgba(212,175,55,0.5)" : "2px solid rgba(212,175,55,0.25)",
            boxShadow: sent
              ? "0 0 30px rgba(34,197,94,0.3)"
              : pressing
              ? "0 0 40px rgba(220,38,38,0.6), inset 0 2px 0 rgba(255,255,255,0.1)"
              : "6px 6px 18px rgba(0,0,0,0.7), -2px -2px 8px rgba(139,0,0,0.1), 0 0 30px rgba(185,28,28,0.15)",
            transform: pressing ? "scale(0.93)" : "scale(1)",
            transition: "transform 100ms, box-shadow 100ms, background 200ms",
          }}>
          <span className="text-3xl">{sent ? "\u2705" : "\u{1F6A8}"}</span>
        </button>
      </div>
      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: sent ? "#22c55e" : "#d4af37" }}>
        {sent ? "Alerta enviada" : pressing ? "Mantené..." : "Pánico"}
      </div>
    </div>
  );
}

// ─── ALERT SENT MODAL (con estado de canal) ──
function AlertSentModal({ onClose, contacto, result, channels }) {
  const [responses, setResponses] = useState([]);
  const sent = result?.success || result?.queued;
  const channel = result?.channel || (result?.queued ? "queued" : "failed");

  const channelInfo = {
    whatsapp: { icon: "\u{1F4F1}", label: "WhatsApp", color: "#22c55e" },
    sms:      { icon: "\u{1F4AC}", label: "SMS",      color: "#3b82f6" },
    voice:    { icon: "\u{1F4DE}", label: "Llamada",  color: "#a855f7" },
    queued:   { icon: "\u23F3",    label: "En cola",  color: "#f59e0b" },
    failed:   { icon: "\u274C",    label: "Falló",    color: "#ef4444" },
  }[channel] || { icon: "\u{1F4F1}", label: "Enviado", color: "#22c55e" };

  function sendQuick(emoji, texto) {
    if (contacto?.telefono) enviarWhatsApp(contacto.telefono, `${emoji} ${texto}`);
    setResponses(r => [...r, texto]);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 shadow-2xl" style={{ background: "linear-gradient(180deg, #12121a, #0c0c12)", border: "1px solid rgba(212,175,55,0.15)", borderBottom: "none" }}>

        {/* Header con estado de canal */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            {/* Logo chico */}
            <EagleEyeLogo size={32} />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(212,175,55,0.5)" }}>Traza 360</div>
              <div className="text-sm font-bold" style={{ color: "#d4af37" }}>Alerta de seguridad</div>
            </div>
          </div>

          {/* Estado de envío */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xl">{channelInfo.icon}</span>
            <span className="text-sm font-semibold" style={{ color: channelInfo.color }}>
              {sent ? `Enviado vía ${channelInfo.label}` : `Error — ${channelInfo.label}`}
            </span>
            {result?.duration && <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>({result.duration}ms)</span>}
          </div>

          {/* Canal de fallback si se usó */}
          {result?.fallbackUsed && (
            <div className="mt-1 text-xs" style={{ color: "rgba(245,158,11,0.7)" }}>
              {"\u26A0\u{FE0F}"} WhatsApp falló — enviado por canal de respaldo
            </div>
          )}

          {/* Todos los canales fallaron */}
          {channel === "failed" && (
            <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <p className="text-xs text-red-300">No se pudo enviar por ningún canal. Llamá directamente al {contacto?.nombre}.</p>
              {contacto?.telefono && (
                <button onClick={() => window.open(`tel:+${contacto.telefono}`)} className="mt-2 w-full rounded-xl py-2 text-xs font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
                  {"\u{1F4DE}"} Llamar ahora a {contacto.nombre}
                </button>
              )}
            </div>
          )}
        </div>

        {sent && (
          <>
            {/* Respuestas rápidas */}
            <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(212,175,55,0.4)" }}>Seguí comunicándote</p>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  {e:"\u2705",t:"Estoy bien"},{e:"\u{1F3C3}",t:"Me muevo"},
                  {e:"\u{1F4CD}",t:"Acá estoy"},{e:"\u{1F44B}",t:"Llegué"},
                ].map((r,i)=>(
                  <button key={i} onClick={()=>sendQuick(r.e,r.t)}
                    className={`rounded-xl py-2.5 text-center transition-all active:scale-90 ${responses.includes(r.t)?"ring-1 ring-amber-400/50":""}`}
                    style={{background:"linear-gradient(145deg,#1a1a26,#0e0e14)",border:"1px solid rgba(212,175,55,0.08)"}}>
                    <div className="text-xl">{r.e}</div>
                    <div className="text-[8px] mt-0.5" style={{color:"rgba(212,175,55,0.4)"}}>{r.t}</div>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={()=>sendQuick("\u{1F6A8}","SIGO EN PELIGRO")}
                  className="rounded-xl py-2.5 text-center active:scale-90" style={{background:"rgba(220,38,38,0.12)",border:"1px solid rgba(220,38,38,0.25)"}}>
                  <div className="text-xl">{"\u{1F6A8}"}</div><div className="text-[8px] mt-0.5 text-red-400">Peligro</div>
                </button>
                <button onClick={()=>sendQuick("\u2705","Falsa alarma. Estoy bien.")}
                  className="rounded-xl py-2.5 text-center active:scale-90" style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)"}}>
                  <div className="text-xl">{"\u2705"}</div><div className="text-[8px] mt-0.5 text-green-400">Bien</div>
                </button>
                <button onClick={()=>{const t=prompt("Mensaje:");if(t&&contacto?.telefono)enviarWhatsApp(contacto.telefono,t);}}
                  className="rounded-xl py-2.5 text-center active:scale-90" style={{background:"linear-gradient(145deg,#1a1a26,#0e0e14)",border:"1px solid rgba(212,175,55,0.08)"}}>
                  <div className="text-xl">{"\u270D\u{FE0F}"}</div><div className="text-[8px] mt-0.5" style={{color:"rgba(212,175,55,0.4)"}}>Escribir</div>
                </button>
              </div>
            </div>
          </>
        )}

        <button onClick={onClose} className="w-full rounded-2xl py-3 text-sm font-semibold" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.3)"}}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── ONBOARDING ──────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);

  const steps = [
    { emoji:"\u{1F6E1}\u{FE0F}", title:"Bienvenido/a a Traza 360", sub:"Tu escudo de protección personal",
      body:"Un botón. Tus contactos alertados. Tu ubicación compartida. Todo en segundos.", cta:"Ver cómo funciona →" },
    { emoji:"\u{1F465}", title:"¿Para quién es la app?", sub:"Elegí tu perfil principal", body:"", cta:"Continuar →",
      opts:[
        {k:"mi_escudo",    e:"\u{1F6E1}\u{FE0F}", l:"Para mí — violencia o riesgo"},
        {k:"los_cuido",    e:"\u{1F9D1}\u200D\u{1F393}", l:"Mi hijo/a adolescente"},
        {k:"los_protejo",  e:"\u{1FAF6}",          l:"Mis padres / adultos mayores"},
        {k:"turno_seguro", e:"\u{1F303}",          l:"Trabajo de riesgo"},
        {k:"mi_nido",      e:"\u{1F3E0}",          l:"Seguridad en el hogar"},
      ]},
    { emoji:"\u{1F4F1}", title:"Último paso: agregá un contacto", sub:"Sin contactos, no podemos alertar a nadie",
      body:"Necesitás al menos 1 contacto con WhatsApp. Podés hacerlo ahora o desde el panel.", cta:"Empezar →" },
  ];

  const cur = steps[step];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8 text-white" style={{background:"linear-gradient(180deg,#050508,#0a0a14)"}}>
      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {steps.map((_,i)=>(
          <div key={i} className="h-1.5 rounded-full transition-all" style={{width:i===step?"32px":"8px",background:i<=step?"#d4af37":"rgba(212,175,55,0.15)"}} />
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="rounded-3xl p-8 text-center mb-5" style={{background:"linear-gradient(145deg,#13131d,#0a0a12)",border:"1px solid rgba(212,175,55,0.15)",boxShadow:"0 20px 60px rgba(0,0,0,0.6)"}}>
          <div className="text-6xl mb-4" style={{filter:"drop-shadow(0 0 20px rgba(212,175,55,0.3))"}}>{cur.emoji}</div>
          <h2 className="text-xl font-bold text-white mb-1">{cur.title}</h2>
          <p className="text-xs font-semibold mb-3" style={{color:"#d4af37"}}>{cur.sub}</p>
          {cur.body && <p className="text-sm text-slate-400 leading-relaxed">{cur.body}</p>}
          {cur.opts && (
            <div className="mt-4 space-y-2 text-left">
              {cur.opts.map(o=>(
                <button key={o.k} onClick={()=>setSelected(o.k)}
                  className="w-full rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
                  style={{background:selected===o.k?"rgba(212,175,55,0.12)":"rgba(255,255,255,0.04)",border:selected===o.k?"1px solid rgba(212,175,55,0.4)":"1px solid rgba(255,255,255,0.07)"}}>
                  <span className="text-xl">{o.e}</span>
                  <span className="text-sm font-semibold" style={{color:selected===o.k?"#d4af37":"rgba(255,255,255,0.7)"}}>{o.l}</span>
                  {selected===o.k && <span className="ml-auto text-sm" style={{color:"#d4af37"}}>{"\u2713"}</span>}
                </button>
              ))}
            </div>
          )}
          {step===2 && (
            <div className="mt-4 space-y-2">
              {[{i:"\u{1F4F2}",t:"El número debe tener WhatsApp activo"},{i:"\u2705",t:"Le enviamos un mensaje de verificación automático"},{i:"\u{1F512}",t:"Solo vos podés ver tus contactos"}].map((tip,i)=>(
                <div key={i} className="flex items-start gap-3 rounded-xl px-3 py-2 text-left" style={{background:"rgba(212,175,55,0.05)",border:"1px solid rgba(212,175,55,0.08)"}}>
                  <span className="text-lg shrink-0">{tip.i}</span>
                  <span className="text-xs text-slate-300">{tip.t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={()=>{ if(step===1&&!selected)return; if(step<steps.length-1)setStep(s=>s+1); else{try{sessionStorage.setItem("t360ob","1");}catch(e){}onComplete(selected);}}}
          disabled={step===1&&!selected}
          className="w-full rounded-2xl py-4 font-bold text-black shadow-lg disabled:opacity-40"
          style={{background:"linear-gradient(135deg,#d4af37,#f5e6a3,#d4af37)",boxShadow:"0 8px 30px rgba(212,175,55,0.25)"}}>
          {cur.cta}
        </button>
        {step>0 && <button onClick={()=>setStep(s=>s-1)} className="w-full mt-3 py-2 text-sm" style={{color:"rgba(212,175,55,0.35)"}}>← Volver</button>}
      </div>
    </div>
  );
}

// ─── GRABACION MODAL ─────────────────────────
function RecordModal({ onClose }) {
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  useEffect(()=>{if(!recording)return; const id=setInterval(()=>setTime(t=>t+1),1000); return()=>clearInterval(id);},[recording]);
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  async function start(){setErr("");const r=await startRec();if(r.success){setRecording(true);setTime(0);}else setErr("No se pudo acceder al micrófono.");}
  async function stop(){const b=await stopRec();setRecording(false);if(b){const r=await saveEvidence(b,"audio");setSaved(r.cloud?"nube":"local");}}
  return(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl p-6" style={{background:"linear-gradient(145deg,#12121a,#0c0c12)",border:"1px solid rgba(14,165,233,0.3)"}}>
        <div className="text-center">
          <div className="text-4xl mb-3">{saved?"\u2705":"\u{1F399}\u{FE0F}"}</div>
          <div className="text-lg font-bold text-white">{saved?"Evidencia guardada":"Grabación silenciosa"}</div>
          {saved?(
            <><p className="mt-2 text-xs text-slate-400">{saved==="nube"?"Guardado en la nube. Accedé desde Mis Evidencias.":"Descargado a tu dispositivo."}</p>
            <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white">Listo</button></>
          ):recording?(
            <><div className="my-5 rounded-2xl p-6" style={{background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)"}}>
              <div className="flex items-center justify-center gap-2 mb-2"><div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"/><span className="text-xs font-semibold text-red-300 uppercase tracking-widest">Grabando</span></div>
              <div className="font-mono text-4xl font-bold text-white">{fmt(time)}</div>
            </div>
            <button onClick={stop} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white">Detener y guardar</button></>
          ):(
            <><p className="mt-2 text-xs text-slate-400 mb-4">Graba el entorno sin hacer ruido.</p>
            {err&&<p className="text-xs text-red-400 mb-2">{err}</p>}
            <button onClick={start} className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 py-3 text-sm font-semibold text-white mb-2">Iniciar grabación</button>
            <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs text-slate-400">Cancelar</button></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CHECK-IN MODAL ──────────────────────────
function CheckInModal({ onClose, contactos, titulo="Check-in" }) {
  const [mins, setMins] = useState(30);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [fired, setFired] = useState(false);
  const ref = useRef(null);
  const pct = active ? (remaining / (mins * 60)) * 100 : 100;
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const C = 2 * Math.PI * 40;

  async function start() {
    setRemaining(mins * 60); setActive(true);
    if(contactos.length>0){const{loc}=await getLoc(); enviarWhatsApp(contactos[0].telefono, buildMsg(`Check-in activado — ${titulo}. Si no confirmo en ${mins} minutos que estoy bien, verificame.`, loc));}
  }
  useEffect(()=>{
    if(!active)return;
    ref.current=setInterval(()=>{
      setRemaining(t=>{
        if(t<=1){
          clearInterval(ref.current);
          playAlert(); pushNotif("TRAZA 360","No confirmaste que estás bien. Alertando contactos.");
          if(contactos.length>0){getLoc().then(({loc})=>{enviarWhatsApp(contactos[0].telefono,buildMsg("ALERTA AUTOMÁTICA — No confirmó check-in en el tiempo acordado.",loc));});}
          setFired(true); setActive(false); return 0;
        }
        return t-1;
      });
    },1000);
    return()=>clearInterval(ref.current);
  },[active]);
  function iAmOk(){clearInterval(ref.current);setActive(false);if(contactos.length>0)enviarWhatsApp(contactos[0].telefono,"\u2705 Estoy bien. Todo en orden.");onClose();}
  return(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl p-6" style={{background:"linear-gradient(145deg,#12121a,#0c0c12)",border:"1px solid rgba(245,158,11,0.3)"}}>
        <div className="text-center">
          {fired?(
            <><div className="text-5xl mb-3">{"\u{1F6A8}"}</div>
            <div className="text-lg font-bold text-red-300">Alerta enviada automáticamente</div>
            <p className="mt-2 text-xs text-slate-400">Se alertó a tus contactos.</p>
            <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-white/10 border border-white/10 py-3 text-sm text-white">Cerrar</button></>
          ):active?(
            <><div className="text-sm font-bold text-slate-200 mb-1">{titulo}</div>
            <p className="text-xs text-slate-400 mb-4">Tocá "Estoy bien" antes de que termine.</p>
            <div className="relative mx-auto mb-4" style={{width:100,height:100}}>
              <svg viewBox="0 0 100 100" className="-rotate-90" width={100} height={100}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="8"
                  strokeDasharray={C} strokeDashoffset={C-(pct/100)*C} style={{transition:"stroke-dashoffset 1s linear"}}/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-xl font-bold text-white">{fmt(remaining)}</span>
              </div>
            </div>
            <button onClick={iAmOk} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 py-3 text-sm font-semibold text-white mb-2">{"\u2705"} Estoy bien</button>
            <button onClick={()=>{clearInterval(ref.current);setActive(false);}} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs text-slate-400">Cancelar</button></>
          ):(
            <><div className="text-4xl mb-3">{"\u23F1\u{FE0F}"}</div>
            <div className="text-base font-bold text-white mb-1">{titulo}</div>
            <p className="text-xs text-slate-400 mb-4">Si no confirmás, se alerta automáticamente.</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[15,30,60,120].map(m=>(
                <button key={m} onClick={()=>setMins(m)}
                  className={`rounded-xl border py-3 text-sm font-semibold ${mins===m?"border-orange-400/50 bg-orange-500/10 text-orange-300":"border-white/10 bg-white/5 text-slate-400"}`}>
                  {m>=60?`${m/60}h`:`${m}m`}
                </button>
              ))}
            </div>
            <button onClick={start} className="w-full rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 py-3 text-sm font-semibold text-white mb-2">Activar ({mins}min)</button>
            <button onClick={onClose} className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 text-xs text-slate-400">Cancelar</button></>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADE BANNER ──────────────────────────
function UpgradeBanner({ feature }) {
  return(
    <div className="rounded-2xl p-4" style={{background:"linear-gradient(135deg,rgba(212,175,55,0.08),rgba(184,134,11,0.04))",border:"1px solid rgba(212,175,55,0.2)"}}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{"\u{1F451}"}</span>
        <div className="flex-1">
          <div className="text-sm font-bold" style={{color:"#d4af37"}}>Función Premium</div>
          <p className="text-xs text-slate-400 mt-0.5">Desbloqueá {feature} por solo <span style={{color:"#d4af37"}}>US$4.99/mes</span>.</p>
          <button className="mt-2 rounded-xl px-4 py-1.5 text-xs font-bold text-black" style={{background:"linear-gradient(135deg,#d4af37,#f5e6a3)"}}>Ver planes →</button>
        </div>
      </div>
    </div>
  );
}

// ─── PHONE INPUT ─────────────────────────────
function PhoneInput({ value, onChange, prefix, onPrefixChange }) {
  const [open, setOpen] = useState(false);
  const pais = PAISES.find(p=>p.prefix===prefix)||PAISES[0];
  return(
    <div className="relative">
      <div className="flex gap-2">
        <button type="button" onClick={()=>setOpen(!open)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white whitespace-nowrap shrink-0">
          <span>{pais.flag}</span><span className="text-slate-300">+{pais.prefix}</span><span className="text-slate-500 text-xs">{"\u25BC"}</span>
        </button>
        <input type="tel" value={value} onChange={e=>onChange(e.target.value)} placeholder="Número sin 0 ni 15"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 min-w-0"/>
      </div>
      {open&&(
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-xl border border-white/10 bg-[#0d1426] shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {PAISES.map(p=>(
            <button key={p.code} type="button" onClick={()=>{onPrefixChange(p.prefix);setOpen(false);}}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 text-left ${p.prefix===prefix?"bg-white/10 text-cyan-300":"text-slate-200"}`}>
              <span className="text-lg">{p.flag}</span><span>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CONTACTOS SCREEN ────────────────────────
function ContactosScreen({ onBack, userPlan="gratis", nombreUsuario="" }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState("lista");
  const [err, setErr] = useState("");
  const [nombre, setNombre] = useState("");
  const [relacion, setRelacion] = useState("Madre");
  const [tel, setTel] = useState("");
  const [prefix, setPrefix] = useState("54");
  const [saving, setSaving] = useState(false);
  const [verif, setVerif] = useState(false);
  const max = (PLAN_LIMITS[userPlan]||PLAN_LIMITS.gratis).contactos;

  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);setContactos(await getContactos());setLoading(false);}

  async function handleAdd(){
    setErr(""); if(!nombre.trim()||!tel.trim()){setErr("Completá nombre y teléfono.");return;}
    if(contactos.length>=max){setErr(`Límite de ${max} contactos.`);return;}
    setSaving(true);
    const numCompleto=prefix+limpiarNumero(tel);
    const r=await addContacto({nombre:nombre.trim(),telefono:numCompleto,relacion,prioridad:contactos.length+1});
    if(r.success){setVerif(true);await verificarContacto(numCompleto,nombre.trim(),nombreUsuario||"Traza 360");setVerif(false);setVista("lista");setNombre("");setTel("");load();}
    else setErr(r.error||"Error al guardar.");
    setSaving(false);
  }
  async function handleDel(id){if(!window.confirm("Eliminar?"))return;await deleteContacto(id);load();}
  async function reVerify(c){await verificarContacto(c.telefono,c.nombre,nombreUsuario);alert(`Verificación enviada a ${c.nombre} ✓`);}

  return(
    <div className="min-h-screen px-5 py-8 text-white" style={{background:"linear-gradient(180deg,#07111f,#0a0a14)"}}>
      <div className="mx-auto max-w-2xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">← Volver al panel</button>
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Mi red de contención</p>
          <h2 className="mt-1 text-xl font-bold">Mis Contactos de Confianza</h2>
          <p className="mt-1 text-sm text-slate-400">Plan: <span className="text-cyan-300 font-semibold">{PLAN_PRICES[userPlan]?.name}</span> · {contactos.length}/{max}</p>
          {contactos.length===0&&(
            <div className="mt-3 rounded-xl p-3" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>
              <p className="text-xs text-red-300">{"\u26A0\u{FE0F}"} Sin contactos el botón de pánico no puede alertar a nadie.</p>
            </div>
          )}
        </div>
        {vista==="lista"&&(
          <>
            {loading?<div className="text-center py-8 text-slate-400">Cargando...</div>
            :contactos.length===0?(<div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><div className="text-5xl mb-3">{"\u{1F465}"}</div><h3 className="text-lg font-semibold">Sin contactos</h3><p className="mt-2 text-sm text-slate-400">Agregá al menos 1 para activar la protección.</p></div>)
            :(
              <div className="space-y-3 mb-4">
                {contactos.map(c=>(
                  <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3"><div className="text-3xl shrink-0">{getRelEmoji(c.relacion)}</div>
                        <div><div className="text-base font-semibold">{c.nombre}</div><div className="text-xs text-cyan-300">{c.relacion}</div><div className="text-xs text-slate-400 mt-1">+{c.telefono}</div></div></div>
                      <div className="flex flex-col gap-2">
                        <button onClick={()=>reVerify(c)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">Verificar</button>
                        <button onClick={()=>handleDel(c.id)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {contactos.length<max?(<button onClick={()=>setVista("agregar")} className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 py-4 font-semibold text-white">+ Agregar contacto</button>)
            :(<UpgradeBanner feature="más contactos de emergencia"/>)}
          </>
        )}
        {vista==="agregar"&&(
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <button onClick={()=>{setVista("lista");setErr("");}} className="text-xs text-slate-400 mb-4">← Volver</button>
            <h3 className="text-lg font-bold mb-4">Agregar contacto</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 block mb-1">Nombre</label>
                <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: María"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"/></div>
              <div><label className="text-xs text-slate-400 block mb-2">Relación</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {RELACIONES.map(r=>(<button key={r} onClick={()=>setRelacion(r)}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold ${relacion===r?"border-cyan-400/50 bg-cyan-500/10 text-cyan-300":"border-white/10 bg-white/5 text-slate-300"}`}>
                    {getRelEmoji(r)} {r}</button>))}
                </div></div>
              <div><label className="text-xs text-slate-400 block mb-1">Teléfono (con WhatsApp)</label>
                <PhoneInput value={tel} onChange={setTel} prefix={prefix} onPrefixChange={setPrefix}/></div>
              <div className="rounded-xl p-3" style={{background:"rgba(34,197,94,0.05)",border:"1px solid rgba(34,197,94,0.15)"}}>
                <p className="text-xs text-emerald-300">{"\u2705"} Al guardar, le enviamos verificación automática por WhatsApp.</p>
              </div>
              {err&&<p className="text-xs text-red-400">{err}</p>}
              {verif&&<p className="text-xs text-emerald-300 animate-pulse">{"\u{1F4F1}"} Enviando verificación...</p>}
              <button onClick={handleAdd} disabled={saving||verif} className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {saving?"Guardando...":verif?"Verificando...":"Guardar y verificar"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EVIDENCIAS SCREEN ───────────────────────
function EvidenciasScreen({ onBack }) {
  const [files, setFiles] = useState([]); const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null); const [audioName, setAudioName] = useState(null);
  useEffect(()=>{load();},[]);
  async function load(){setLoading(true);setFiles(await listEvidence());setLoading(false);}
  async function play(f){const url=await getEvidenceUrl(f.fullPath);if(!url){alert("No se pudo obtener.");return;}setAudioUrl(url);setAudioName(f.name);}
  async function del(f){if(!window.confirm("Eliminar?"))return;await deleteEvidence(f.fullPath);if(audioName===f.name){setAudioUrl(null);setAudioName(null);}load();}
  async function dl(f){const url=await getEvidenceUrl(f.fullPath);if(url)window.open(url,"_blank");}
  return(
    <div className="min-h-screen px-5 py-8 text-white" style={{background:"linear-gradient(180deg,#0a0a10,#0d0d16)"}}>
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm font-semibold" style={{color:"#d4af37"}}>← Volver</button>
        <div className="mb-5 rounded-2xl p-5" style={{background:"linear-gradient(145deg,#13131d,#0e0e16)",border:"1px solid rgba(212,175,55,0.1)"}}>
          <p className="text-[10px] uppercase tracking-[3px]" style={{color:"#d4af37"}}>Mis archivos protegidos</p>
          <h2 className="mt-1 text-xl font-bold">Mis Evidencias</h2>
        </div>
        {audioUrl&&(
          <div className="mb-4 rounded-2xl p-4" style={{background:"linear-gradient(145deg,#16161f,#0c0c12)",border:"1px solid rgba(212,175,55,0.15)"}}>
            <div className="flex items-center gap-2 mb-2">
              <span>{"\u{1F3B5}"}</span><span className="text-xs font-semibold" style={{color:"#d4af37"}}>{audioName}</span>
              <button onClick={()=>{setAudioUrl(null);setAudioName(null);}} className="ml-auto text-xs text-slate-500">{"\u2715"}</button>
            </div>
            <audio controls autoPlay src={audioUrl} style={{width:"100%",height:"40px",borderRadius:"8px"}}/>
          </div>
        )}
        {loading?<div className="text-center py-8 text-slate-400">Cargando...</div>
        :files.length===0?(<div className="rounded-2xl p-8 text-center" style={{border:"1px solid rgba(212,175,55,0.08)"}}><div className="text-5xl mb-3">{"\u{1F4C1}"}</div><h3 className="text-lg font-semibold text-white">Sin evidencias</h3><p className="mt-2 text-sm text-slate-400">Cuando grabes audio, aparecerá acá.</p></div>)
        :(
          <div className="space-y-3">
            {files.map((f,i)=>(
              <div key={i} className="rounded-2xl p-4" style={{background:"linear-gradient(145deg,#12121a,#0c0c12)",border:audioName===f.name?"1px solid rgba(212,175,55,0.3)":"1px solid rgba(212,175,55,0.08)"}}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{"\u{1F399}\u{FE0F}"}</span>
                    <div className="min-w-0"><div className="text-sm font-semibold text-white truncate">{f.name}</div><div className="text-xs text-slate-500">{f.metadata?.size?(f.metadata.size/1024).toFixed(0)+"KB":""}</div></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>play(f)} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{background:"rgba(212,175,55,0.08)",border:"1px solid rgba(212,175,55,0.2)",color:"#d4af37"}}>{audioName===f.name?"\u{1F50A} Escuch.":"\u25B6\u{FE0F}"}</button>
                    <button onClick={()=>dl(f)} className="rounded-lg px-2 py-1.5 text-xs" style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)"}}>{"\u{2B07}\u{FE0F}"}</button>
                    <button onClick={()=>del(f)} className="rounded-lg px-2 py-1.5 text-xs" style={{background:"rgba(220,38,38,0.1)",border:"1px solid rgba(220,38,38,0.2)",color:"#f87171"}}>{"\u{1F5D1}\u{FE0F}"}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PASTILLERO ──────────────────────────────
function PastilleroScreen({ onBack, userPlan="gratis", contactos=[] }) {
  const [meds, setMeds] = useState([]); const [tomasHoy, setTomasHoy] = useState([]); const [tomasSemana, setTomasSemana] = useState([]);
  const [loading, setLoading] = useState(true); const [vista, setVista] = useState("hoy"); const [err, setErr] = useState("");
  const [nombre, setNombre] = useState(""); const [dosis, setDosis] = useState(""); const [horarios, setHorarios] = useState(["08:00"]);
  const [diasSel, setDiasSel] = useState([1,2,3,4,5,6,7]); const [colorSel, setColorSel] = useState("blue"); const [notifFam, setNotifFam] = useState(false); const [saving, setSaving] = useState(false);
  const max=(PLAN_LIMITS[userPlan]||PLAN_LIMITS.gratis).medicamentos; const timers=useRef([]);

  useEffect(()=>{load();askNotifPerm();return()=>timers.current.forEach(t=>clearTimeout(t));},[]);
  async function load(){setLoading(true);const m=await getMedicamentos();setMeds(m);if(m.length>0)await crearTomasDelDia(m);const th=await getTomasHoy();setTomasHoy(th);setTomasSemana(await getTomasSemana());setLoading(false);schedule(th);}
  function schedule(tomas){timers.current.forEach(t=>clearTimeout(t));timers.current=[];const now=new Date();tomas.filter(t=>!t.tomado).forEach(t=>{const[h,m]=t.horario_programado.split(":").map(Number);const target=new Date();target.setHours(h,m,0,0);const diff=target-now;if(diff>0&&diff<86400000){const id=setTimeout(()=>{const mn=t.medicamentos?.nombre||"Medicamento";pushNotif("Hora de tu medicación",`${mn} — ${t.horario_programado}`);playAlert();if(notifFam&&contactos.length>0){const id2=setTimeout(async()=>{const ta=await getTomasHoy();const e=ta.find(x=>x.id===t.id);if(e&&!e.tomado)sendViaAPI(contactos[0].telefono,`💊 PASTILLERO — No se confirmó la toma de ${mn} (${t.horario_programado}). Verificar.`);},600000);timers.current.push(id2);}},diff);timers.current.push(id);}});}
  async function handleTome(id){const r=await marcarTomado(id);if(r.success){playAlert();load();}}
  async function handleAdd(){setErr("");if(!nombre.trim()){setErr("Ponele un nombre.");return;}if(max>0&&meds.length>=max){setErr(`Límite de ${max}.`);return;}setSaving(true);const r=await addMedicamento({nombre:nombre.trim(),dosis:dosis.trim(),horarios,dias_semana:diasSel,color:colorSel,notificar_familiar:notifFam,contacto_familiar_id:notifFam&&contactos.length>0?contactos[0].id:null});setSaving(false);if(r.success){setVista("hoy");setNombre("");setDosis("");setHorarios(["08:00"]);setDiasSel([1,2,3,4,5,6,7]);load();}else setErr(r.error||"Error.");}
  async function handleDel(id){if(!window.confirm("Eliminar?"))return;await deleteMedicamento(id);load();}
  function getCol(k){return COLORES_MED.find(c=>c.key===k)||COLORES_MED[0];}
  function getSemana(){const dias=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const f=d.toISOString().split("T")[0];const td=tomasSemana.filter(t=>t.fecha===f);const dn=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];dias.push({f,d:dn[d.getDay()],tot:td.length,tom:td.filter(t=>t.tomado).length,hoy:i===0});}return dias;}

  return(
    <div className="min-h-screen bg-[#07111f] px-5 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-cyan-300">← Volver</button>
        <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5"><p className="text-xs uppercase tracking-[0.18em] text-amber-300">Los Protejo — Pastillero</p><h2 className="mt-1 text-2xl font-bold">Mis Medicamentos</h2><p className="mt-1 text-sm text-slate-400">Plan: <span className="text-amber-300 font-semibold">{PLAN_PRICES[userPlan]?.name}</span> · {meds.length}/{max===-1?"∞":max}</p></div>
        <div className="flex gap-2 mb-4">{[{k:"hoy",l:"Hoy"},{k:"semana",l:"Semana"},{k:"agregar",l:"+ Agregar"}].map(tab=>(
          <button key={tab.k} onClick={()=>setVista(tab.k)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${vista===tab.k?"bg-amber-500/20 text-amber-300 border border-amber-500/40":"bg-white/5 text-slate-400 border border-white/10"}`}>{tab.l}</button>
        ))}</div>
        {loading&&<div className="text-center py-8 text-slate-400">Cargando...</div>}
        {!loading&&vista==="hoy"&&(tomasHoy.length===0?(
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center"><div className="text-5xl mb-3">{"\u{1F48A}"}</div><h3 className="text-lg font-semibold">{meds.length===0?"Sin medicamentos":"No hay tomas para hoy"}</h3></div>
        ):(
          <div className="space-y-3">
            {tomasHoy.map(t=>{const col=getCol(t.medicamentos?.color);const now=new Date();const[h,m]=t.horario_programado.split(":").map(Number);const ht=new Date();ht.setHours(h,m,0,0);const past=now>ht;return(
              <div key={t.id} className={`rounded-2xl border ${col.border} ${col.bg} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`h-3 w-3 rounded-full shrink-0 ${t.tomado?"bg-emerald-400":past?"bg-red-400 animate-pulse":col.dot}`}/>
                    <div className="min-w-0"><div className="text-sm font-semibold text-slate-100">{t.medicamentos?.nombre}</div><div className="text-xs text-slate-400">{t.medicamentos?.dosis} · {t.horario_programado}hs</div></div>
                  </div>
                  {t.tomado?(<span className="text-xs text-emerald-300 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">Tomado</span>)
                  :(<button onClick={()=>handleTome(t.id)} className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-semibold text-white shrink-0">Tomé</button>)}
                </div>
              </div>
            );})}
          </div>
        ))}
        {!loading&&vista==="semana"&&(
          <div className="grid grid-cols-7 gap-2">{getSemana().map(d=>(
            <div key={d.f} className={`rounded-xl border p-3 text-center ${d.hoy?"border-amber-500/50 bg-amber-500/10":"border-white/10 bg-white/5"}`}>
              <div className="text-xs text-slate-400 mb-1">{d.d}</div>
              <div className="text-lg">{d.tot===0?"\u2796":d.tom===d.tot?"\u2705":d.tom>0?"\u26A0\u{FE0F}":"\u274C"}</div>
              <div className="text-[10px] text-slate-500">{d.tot>0?`${d.tom}/${d.tot}`:"-"}</div>
            </div>
          ))}</div>
        )}
        {!loading&&vista==="agregar"&&(
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-bold mb-4">Agregar medicamento</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-slate-400 block mb-1">Nombre</label><input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Losartán" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"/></div>
              <div><label className="text-xs text-slate-400 block mb-1">Dosis</label><input type="text" value={dosis} onChange={e=>setDosis(e.target.value)} placeholder="Ej: 50mg" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"/></div>
              <div><label className="text-xs text-slate-400 block mb-2">Horarios</label>
                {horarios.map((h,i)=>(<div key={i} className="flex items-center gap-2 mb-2"><input type="time" value={h} onChange={e=>{const hs=[...horarios];hs[i]=e.target.value;setHorarios(hs);}} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"/>{horarios.length>1&&<button onClick={()=>setHorarios(horarios.filter((_,j)=>j!==i))} className="text-red-400 text-xs">Quitar</button>}</div>))}
                <button onClick={()=>setHorarios([...horarios,"12:00"])} className="text-xs text-amber-300">+ Agregar horario</button></div>
              <div><label className="text-xs text-slate-400 block mb-2">Días</label>
                <div className="flex gap-2 flex-wrap">{DIAS_SEMANA.map(d=>(<button key={d.num} onClick={()=>setDiasSel(diasSel.includes(d.num)?diasSel.filter(x=>x!==d.num):[...diasSel,d.num].sort())} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${diasSel.includes(d.num)?"border-amber-400/50 bg-amber-500/10 text-amber-300":"border-white/10 bg-white/5 text-slate-400"}`}>{d.short}</button>))}</div></div>
              <div><label className="text-xs text-slate-400 block mb-2">Color</label>
                <div className="flex gap-2">{COLORES_MED.map(c=>(<button key={c.key} onClick={()=>setColorSel(c.key)} className={`h-8 w-8 rounded-full ${c.dot} ${colorSel===c.key?"ring-2 ring-white ring-offset-2 ring-offset-[#07111f]":"opacity-60"}`}/>))}</div></div>
              <div className="flex items-center gap-3">
                <button onClick={()=>setNotifFam(!notifFam)} className={`h-6 w-11 rounded-full shrink-0 ${notifFam?"bg-amber-500":"bg-white/20"} relative`}>
                  <div className="h-5 w-5 rounded-full bg-white absolute top-0.5 transition-all" style={{left:notifFam?"22px":"2px"}}/>
                </button>
                <span className="text-sm text-slate-300">Avisar a familiar si no confirmo en 10 min</span>
              </div>
              {err&&<p className="text-xs text-red-400">{err}</p>}
              {max>0&&meds.length>=max?(<UpgradeBanner feature="más medicamentos"/>)
              :(<button onClick={handleAdd} disabled={saving} className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?"Guardando...":"Guardar medicamento"}</button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MÓDULOS ─────────────────────────────────
const MODULES = [
  { key:"mi_escudo",    emoji:"\u{1F6E1}\u{FE0F}", title:"Mi Escudo",    desc:"Violencia de género",      color:"from-fuchsia-500 to-rose-500",   accentBorder:"border-fuchsia-500/30", accentBg:"bg-fuchsia-500/10", accentText:"text-fuchsia-300",
    actions:[
      {key:"panico",  icon:"\u{1F6A8}", name:"Botón de pánico",          type:"alert", msg:"ALERTA — Botón de pánico activado. Necesito ayuda urgente.",priority:"high"},
      {key:"share",   icon:"\u{1F4E1}", name:"Compartir ubicación",       type:"alert", msg:"Compartiendo mi ubicación en vivo."},
      {key:"checkin", icon:"\u23F1\u{FE0F}", name:"Check-in de seguridad",type:"checkin",titulo:"Check-in — Mi Escudo"},
      {key:"grabar",  icon:"\u{1F399}\u{FE0F}", name:"Grabar evidencia",  type:"record"},
      {key:"evidencias",icon:"\u{1F4C1}", name:"Mis Evidencias",          type:"evidencias"},
      {key:"entro",   icon:"\u{1F3D8}\u{FE0F}", name:"Entro a la casa de...",type:"alert",msg:"Entro a la casa de [completar]."},
      {key:"uber",    icon:"\u{1F697}", name:"Llamar Uber",                type:"uber"},
    ]},
  { key:"los_cuido",   emoji:"\u{1F9D1}\u200D\u{1F393}", title:"Los Cuido",   desc:"Adolescente seguro",       color:"from-sky-400 to-cyan-500",       accentBorder:"border-sky-500/30",     accentBg:"bg-sky-500/10",     accentText:"text-sky-300",
    actions:[
      {key:"sos",     icon:"\u{1F6A8}", name:"SOS — Estoy en peligro",    type:"alert", msg:"SOS — Estoy en peligro.",priority:"high"},
      {key:"share",   icon:"\u{1F4E1}", name:"Compartir ubicación",        type:"alert", msg:"Compartiendo mi ubicación."},
      {key:"checkin", icon:"\u23F1\u{FE0F}", name:"Check-in de seguridad", type:"checkin",titulo:"Check-in — Los Cuido"},
      {key:"bullying",icon:"\u{1F399}\u{FE0F}", name:"Grabar evidencia",   type:"record"},
      {key:"cole",    icon:"\u{1F3EB}", name:"Buscame por el cole",        type:"alert", msg:"URGENTE — Necesito que me busquen por el colegio."},
      {key:"llegue",  icon:"\u2705", name:"Llegué bien",                   type:"alert", msg:"Llegué bien a casa."},
      {key:"maps",    icon:"\u{1F5FA}\u{FE0F}", name:"Llegar a casa (GPS)",type:"maps"},
    ]},
  { key:"los_protejo", emoji:"\u{1FAF6}", title:"Los Protejo", desc:"Adulto mayor seguro",     color:"from-amber-400 to-orange-500",   accentBorder:"border-amber-500/30",   accentBg:"bg-amber-500/10",   accentText:"text-amber-300",
    actions:[
      {key:"cai",     icon:"\u{1F198}", name:"Me caí",                    type:"alert", msg:"ALERTA — Me caí y necesito ayuda.",priority:"high"},
      {key:"share",   icon:"\u{1F4E1}", name:"Compartir ubicación",        type:"alert", msg:"Compartiendo mi ubicación."},
      {key:"checkin", icon:"\u23F1\u{FE0F}", name:"Check-in de seguridad", type:"checkin",titulo:"Check-in — Los Protejo"},
      {key:"meds",    icon:"\u{1F48A}", name:"Mis Medicamentos",           type:"pastillero"},
      {key:"grabar",  icon:"\u{1F399}\u{FE0F}", name:"Grabar evidencia",   type:"record"},
      {key:"mal",     icon:"\u{1F494}", name:"No me siento bien",          type:"alert", msg:"No me siento bien. Necesito ayuda."},
      {key:"casa",    icon:"\u{1F3E0}", name:"Llegar a casa (GPS)",        type:"maps"},
      {key:"ambulancia",icon:"\u{1F691}", name:"Llamar ambulancia",        type:"ambulancia"},
    ]},
  { key:"mi_nido",     emoji:"\u{1F3E0}", title:"Mi Nido",     desc:"Hogar seguro",             color:"from-violet-500 to-purple-500",   accentBorder:"border-violet-500/30",  accentBg:"bg-violet-500/10",  accentText:"text-violet-300",
    actions:[
      {key:"intruso", icon:"\u{1F6A8}", name:"Intruso en domicilio",       type:"alert", msg:"ALERTA — Posible intruso en mi domicilio.",priority:"high"},
      {key:"share",   icon:"\u{1F4E1}", name:"Compartir ubicación",        type:"alert", msg:"Compartiendo mi ubicación."},
      {key:"checkin", icon:"\u23F1\u{FE0F}", name:"Check-in de seguridad", type:"checkin",titulo:"Check-in — Mi Nido"},
      {key:"grabar",  icon:"\u{1F399}\u{FE0F}", name:"Grabar evidencia",   type:"record"},
      {key:"ruido",   icon:"\u{1F442}", name:"Ruido sospechoso",           type:"alert", msg:"Ruido sospechoso en mi domicilio."},
      {key:"accidente",icon:"\u{1FA79}", name:"Accidente doméstico",       type:"alert", msg:"ALERTA — Accidente doméstico."},
    ]},
  { key:"turno_seguro",emoji:"\u{1F303}", title:"Turno Seguro", desc:"Trabajo de riesgo",        color:"from-pink-500 to-purple-500",     accentBorder:"border-[rgba(212,175,55,0.3)]",accentBg:"bg-[rgba(212,175,55,0.08)]",accentText:"text-[#d4af37]",
    actions:[
      {key:"sos",     icon:"\u{1F6A8}", name:"SOS — Estoy en peligro",    type:"alert", msg:"SOS — En peligro durante mi turno.",priority:"high"},
      {key:"share",   icon:"\u{1F4E1}", name:"Compartir ubicación",        type:"alert", msg:"Compartiendo mi ubicación."},
      {key:"checkin", icon:"\u23F1\u{FE0F}", name:"Check-in de turno",     type:"checkin",titulo:"Check-in — Turno Seguro"},
      {key:"grabar",  icon:"\u{1F399}\u{FE0F}", name:"Grabar evidencia",   type:"record"},
      {key:"sospechoso",icon:"\u{1F440}", name:"Cliente sospechoso",       type:"alert", msg:"ALERTA — Cliente con actitud sospechosa."},
      {key:"llegue",  icon:"\u2705", name:"Llegué bien",                   type:"alert", msg:"Terminé mi turno y estoy bien."},
      {key:"uber",    icon:"\u{1F697}", name:"Llamar Uber",                type:"uber"},
    ]},
];

// ─── MODULE CARD ─────────────────────────────
function ModuleCard({ m, autoExpand=false, contactos=[], onOpenPastillero, onOpenEvidencias }) {
  const [expanded, setExpanded] = useState(autoExpand);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentMsg, setCurrentMsg] = useState(""); const [currentPriority, setCurrentPriority] = useState("normal");
  const [showRec, setShowRec] = useState(false); const [showCheckIn, setShowCheckIn] = useState(false); const [checkInTitle, setCheckInTitle] = useState("");
  const [alertResult, setAlertResult] = useState(null); const [alertContact, setAlertContact] = useState(null);

  async function handleAction(a) {
    switch(a.type){
      case "alert":
        if(contactos.length===0){alert("Configurá al menos 1 contacto primero.");return;}
        setCurrentMsg(a.msg||""); setCurrentPriority(a.priority||"normal"); setSelectorOpen(true); return;
      case "record": setShowRec(true); return;
      case "maps": window.open(`https://www.google.com/maps/dir/?api=1&destination=Mi+casa`,"_blank"); return;
      case "uber": window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location`,"_blank"); return;
      case "pastillero": if(onOpenPastillero)onOpenPastillero(); return;
      case "evidencias": if(onOpenEvidencias)onOpenEvidencias(); return;
      case "checkin":
        if(contactos.length===0){alert("Configurá al menos 1 contacto primero.");return;}
        setCheckInTitle(a.titulo||"Check-in"); setShowCheckIn(true); return;
      case "ambulancia": window.open("tel:107"); if(contactos.length>0)getLoc().then(({loc})=>enviarWhatsApp(contactos[0].telefono,buildMsg("EMERGENCIA MÉDICA — Llamé a la ambulancia.",loc))); return;
      default: return;
    }
  }

  async function handleSendAlert(contacto, msg, priority) {
    const {loc} = await getLoc();
    const fullMsg = buildMsg(msg, loc);
    const result = await enviarAlerta(contacto.telefono, fullMsg, { priority, withVoice: priority==="high", nombreVictima: "tu contacto" });
    if(priority==="high") playAlert();
    setAlertContact(contacto); setAlertResult(result); setSelectorOpen(false);
  }

  return(
    <>
      <div className="rounded-2xl p-5" style={{background:"linear-gradient(145deg,#12121a,#0c0c12)",border:"1px solid rgba(212,175,55,0.1)",boxShadow:"6px 6px 18px rgba(0,0,0,0.5)"}}>
        <div className="mb-3 flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`}><span className="text-2xl">{m.emoji}</span></div>
          <div><h4 className="text-base font-bold" style={{color:"#d4af37"}}>{m.title}</h4><p className="text-xs text-slate-500">{m.desc}</p></div>
        </div>
        <button onClick={()=>setExpanded(!expanded)}
          className={`w-full rounded-2xl border ${m.accentBorder} ${m.accentBg} ${m.accentText} px-4 py-3 text-sm font-semibold flex items-center justify-between`}>
          <span>{expanded?"Ocultar opciones":"Ver opciones"}</span><span className={`text-xs transition-transform ${expanded?"rotate-180":""}`}>{"\u25BC"}</span>
        </button>
        {expanded&&(
          <div className="mt-3 space-y-2">
            {m.actions.map(a=>(
              <button key={a.key} onClick={()=>handleAction(a)}
                className="w-full rounded-xl px-4 py-3 text-left active:scale-[0.98] transition-all"
                style={{background:"linear-gradient(145deg,#16161f,#0c0c12)",border:`1px solid ${a.priority==="high"?"rgba(220,38,38,0.2)":"rgba(212,175,55,0.06)"}`,boxShadow:"3px 3px 8px rgba(0,0,0,0.4)"}}>
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">{a.name}</div>
                    {a.priority==="high"&&<div className="text-[10px] text-red-400 font-semibold">Alta prioridad — Todos los canales</div>}
                  </div>
                  {a.priority==="high"&&<div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"/>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selector contacto */}
      {selectorOpen&&(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1426] p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">¿A quién avisar?</h3><button onClick={()=>setSelectorOpen(false)} className="text-slate-400 text-2xl">×</button></div>
            {currentMsg.includes("[completar]")&&(
              <div className="mb-4"><label className="text-xs text-slate-400 block mb-1">Completá el detalle</label>
                <input type="text" placeholder="Nombre de la persona o lugar" onChange={e=>setCurrentMsg(m=>m.replace("[completar]",e.target.value||"alguien"))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"/></div>
            )}
            <div className="space-y-2 mb-4">
              {contactos.map(c=>(
                <button key={c.id} onClick={()=>handleSendAlert(c,currentMsg,currentPriority)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl shrink-0">{getRelEmoji(c.relacion)}</div>
                    <div><div className="text-sm font-semibold">{c.nombre}</div><div className="text-[11px] text-slate-400">{c.relacion} · +{c.telefono}</div></div>
                    {currentPriority==="high"&&<div className="ml-auto text-xs text-red-400 font-semibold shrink-0">URGENTE</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {alertResult&&alertContact&&<AlertSentModal onClose={()=>{setAlertResult(null);setAlertContact(null);}} contacto={alertContact} result={alertResult} />}
      {showRec&&<RecordModal onClose={()=>setShowRec(false)}/>}
      {showCheckIn&&<CheckInModal contactos={contactos} titulo={checkInTitle} onClose={()=>setShowCheckIn(false)}/>}
    </>
  );
}

// ─── AUTH ─────────────────────────────────────
function Field({ label, type="text", placeholder, value, onChange }) {
  return(<label className="block space-y-2 text-left"><span className="text-xs font-semibold uppercase tracking-wider" style={{color:"rgba(212,175,55,0.6)"}}>{label}</span>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600" style={{background:"linear-gradient(145deg,#121218,#0a0a0e)",border:"1px solid rgba(212,175,55,0.1)",boxShadow:"inset 3px 3px 6px rgba(0,0,0,0.4)"}}/></label>);
}
function ACard({ children }) { return <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl md:p-8" style={{background:"linear-gradient(145deg,#13131d,#0a0a12)",border:"1px solid rgba(212,175,55,0.1)"}}>{children}</div>; }

function LoginScreen({ onBack, onSuccess }) {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  async function go(){setErr("");if(!email.trim()||!pw.trim()){setErr("Completá todo.");return;}setLoading(true);const r=await signIn(email.trim(),pw);setLoading(false);if(r.success)onSuccess();else setErr(r.error.includes("Invalid")?"Email o contraseña incorrectos.":r.error);}
  return(<div className="flex min-h-screen items-center justify-center px-5 py-8 text-white" style={{background:"linear-gradient(180deg,#050508,#0a0a14)"}}><ACard>
    <button onClick={onBack} className="text-sm font-semibold" style={{color:"#d4af37"}}>← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold text-white">Ingresar</h2>
    <div className="mt-6 space-y-4">
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      <Field label="Contraseña" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)}/>
      {err&&<p className="text-xs text-red-400 text-center">{err}</p>}
      <button onClick={go} disabled={loading} className="w-full rounded-xl py-3.5 font-bold text-black disabled:opacity-50" style={{background:"linear-gradient(135deg,#d4af37,#f5e6a3,#d4af37)"}}>{loading?"Ingresando...":"Ingresar"}</button>
    </div></ACard></div>);
}

function RegisterScreen({ onBack, onSuccess, setPendingName }) {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [loading,setLoading]=useState(false); const [err,setErr]=useState("");
  async function go(){setErr("");if(!name.trim()||!email.trim()||!pw.trim()){setErr("Completá todo.");return;}if(pw.length<6){setErr("Mínimo 6 caracteres.");return;}
    setLoading(true);try{sessionStorage.setItem("t360name",name.trim());}catch(e){}setPendingName(name.trim());
    const r=await signUp(email.trim(),pw,name.trim());setLoading(false);if(r.success)onSuccess();else setErr(r.error.includes("already")?"Email ya registrado.":r.error);}
  return(<div className="flex min-h-screen items-center justify-center px-5 py-8 text-white" style={{background:"linear-gradient(180deg,#050508,#0a0a14)"}}><ACard>
    <button onClick={onBack} className="text-sm font-semibold" style={{color:"#d4af37"}}>← Volver</button>
    <h2 className="mt-5 text-center text-2xl font-bold text-white">Crear cuenta</h2>
    <div className="mt-6 space-y-4">
      <Field label="Nombre completo" placeholder="Nombre y apellido" value={name} onChange={e=>setName(e.target.value)}/>
      <Field label="Email" type="email" placeholder="tu@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      <Field label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={pw} onChange={e=>setPw(e.target.value)}/>
      {err&&<p className="text-xs text-red-400 text-center">{err}</p>}
      <button onClick={go} disabled={loading} className="w-full rounded-xl py-3.5 font-bold text-black disabled:opacity-50" style={{background:"linear-gradient(135deg,#d4af37,#f5e6a3,#d4af37)"}}>{loading?"Creando...":"Crear cuenta"}</button>
    </div></ACard></div>);
}

// ─── LANDING ──────────────────────────────────
function LandingScreen({ onScreen }) {
  return(
    <div className="min-h-screen text-white" style={{background:"linear-gradient(180deg,#050508,#0a0a14,#050508)"}}>
      <section className="px-5 pt-16 pb-10 text-center">
        <div className="mb-4 flex justify-center" style={{filter:"drop-shadow(0 0 40px rgba(212,175,55,0.2))"}}><EagleEyeLogo size={100}/></div>
        <p className="text-[10px] font-semibold uppercase tracking-[5px]" style={{color:"rgba(212,175,55,0.4)"}}>Última señal. Respuesta real.</p>
        <h2 className="mt-4 text-2xl font-bold leading-tight md:text-4xl text-white mx-auto max-w-md">
          Cuando cada segundo importa,<br/><span style={{background:"linear-gradient(135deg,#d4af37,#f5e6a3,#d4af37)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Traza 360 responde.</span>
        </h2>
        <div className="mt-6 flex flex-col gap-2 items-center max-w-xs mx-auto">
          {["Un botón → WhatsApp, SMS y llamada automática","Ubicación en tiempo real","Sin que el agresor lo note"].map((f,i)=>(
            <div key={i} className="flex items-center gap-2 text-sm" style={{color:"rgba(255,255,255,0.55)"}}><span style={{color:"#d4af37"}}>{"\u2713"}</span>{f}</div>
          ))}
        </div>
      </section>
      <div className="px-5 pb-10"><div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <button onClick={()=>onScreen("register")} className="w-full rounded-2xl px-4 py-4 font-bold text-black" style={{background:"linear-gradient(135deg,#d4af37,#f5e6a3,#d4af37)",boxShadow:"0 8px 30px rgba(212,175,55,0.3)"}}>Empezar gratis →</button>
        <button onClick={()=>onScreen("login")} className="w-full rounded-2xl px-4 py-4 font-semibold text-white" style={{background:"linear-gradient(145deg,#13131d,#0e0e16)",border:"1px solid rgba(212,175,55,0.15)"}}>Ya tengo cuenta</button>
      </div></div>
      <div className="px-5 pb-8 text-center">
        <div className="flex items-center justify-center gap-4 text-xs" style={{color:"rgba(255,255,255,0.15)"}}>
          <button onClick={()=>alert("Traza 360 — Privacidad\n\n✅ Tus datos son solo tuyos\n✅ No vendemos información\n✅ Grabaciones encriptadas\n✅ Podés eliminar tu cuenta\n\ninfo@traza360.app")} className="hover:text-white underline">Privacidad</button>
          <span>·</span>
          <button onClick={()=>alert("Traza 360 no reemplaza los servicios de emergencia oficiales (911, 107).\n\nEn emergencia real: llamá primero al número de emergencias de tu país.")} className="hover:text-white underline">Términos</button>
          <span>·</span><span>v18.0</span>
        </div>
      </div>
      {/* WA flotante */}
      <div className="fixed bottom-5 left-5 z-50">
        <button onClick={()=>{const n=WHATSAPP_DEFAULT;window.open(`https://wa.me/${n}?text=${encodeURIComponent("Hola, quiero información sobre Traza 360.")}`)}} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl">
          <svg width={28} height={28} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
      </div>
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────
function HomeScreen({ userProfile, authUser, pendingName, onLogout }) {
  const [screen, setScreen] = useState("home");
  const [activeModule, setActiveModule] = useState(null);
  const [contactos, setContactos] = useState([]);
  const [sysStatus, setSysStatus] = useState("warning");
  const [loggingOut, setLoggingOut] = useState(false);
  const [panicResult, setPanicResult] = useState(null);
  const [panicContact, setPanicContact] = useState(null);

  const nombre = userProfile?.nombre || pendingName || sessionStorage.getItem("t360name") || authUser?.email?.split("@")[0] || "Usuario";
  const plan = userProfile?.plan || "gratis";

  useEffect(()=>{loadContacts();checkSys();},[]);
  async function loadContacts(){setContactos(await getContactos());}
  async function checkSys(){
    try{const r=await fetch("/api/send-whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({test:true})});const d=await r.json();setSysStatus(d.active?"ok":"error");}
    catch(e){setSysStatus("error");}
  }
  async function handleLogout(){setLoggingOut(true);try{sessionStorage.removeItem("t360name");}catch(e){}await signOut();setLoggingOut(false);onLogout();}

  if(screen==="contactos")return<ContactosScreen onBack={()=>{setScreen("home");loadContacts();}} userPlan={plan} nombreUsuario={nombre}/>;
  if(screen==="pastillero")return<PastilleroScreen onBack={()=>setScreen("home")} userPlan={plan} contactos={contactos}/>;
  if(screen==="evidencias")return<EvidenciasScreen onBack={()=>setScreen("home")}/>;

  async function handlePanic(){
    if(contactos.length===0){alert("Configurá al menos 1 contacto primero.");return;}
    const{loc}=await getLoc();
    const msg=buildMsg("🚨 ALERTA — Botón de pánico activado. Necesito ayuda urgente.",loc);
    const result=await enviarAlerta(contactos[0].telefono,msg,{priority:"high",withVoice:true,nombreVictima:nombre});
    playAlert();
    setPanicContact(contactos[0]);
    setPanicResult(result);
  }

  const cards=[
    {key:"mi_escudo",    emoji:"\u{1F6E1}\u{FE0F}", title:"Mi Escudo",    text:"Violencia de género"},
    {key:"los_cuido",   emoji:"\u{1F9D1}\u200D\u{1F393}", title:"Los Cuido",   text:"Adolescente seguro"},
    {key:"los_protejo", emoji:"\u{1FAF6}",           title:"Los Protejo", text:"Adulto mayor"},
    {key:"turno_seguro",emoji:"\u{1F303}",           title:"Turno Seguro",text:"Trabajo de riesgo"},
    {key:"mi_nido",     emoji:"\u{1F3E0}",           title:"Mi Nido",     text:"Hogar seguro"},
    {key:"oidos",       emoji:"\u{1F3A7}",           title:"Oídos Atentos",text:"Vigilancia remota",coming:true},
    {key:"contactos",   emoji:"\u{1F465}",           title:"Mis Contactos",text:`${contactos.length}/${(PLAN_LIMITS[plan]||PLAN_LIMITS.gratis).contactos} configurados`},
  ];

  function handleCard(k){
    if(k==="contactos")setScreen("contactos");
    else if(k==="evidencias")setScreen("evidencias");
    else if(k==="oidos")return;
    else{const m=MODULES.find(x=>x.key===k);if(m)setActiveModule(m);}
  }

  return(
    <div className="min-h-screen px-5 py-8 pb-28 text-white" style={{background:"linear-gradient(180deg,#0a0a10,#0d0d16,#0a0a10)"}}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-5 text-center">
          <div style={{filter:"drop-shadow(0 0 30px rgba(212,175,55,0.15))"}}><EagleEyeLogo size={70}/></div>
          <p className="text-[10px] uppercase tracking-[4px] mt-1" style={{color:"rgba(212,175,55,0.35)"}}>Sistema de protección</p>
        </div>

        {/* Dashboard Estado */}
        <div className="mb-4 rounded-2xl p-4" style={{background:"linear-gradient(145deg,#13131d,#0e0e16)",border:"1px solid rgba(212,175,55,0.1)"}}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[3px] mb-1" style={{color:"rgba(212,175,55,0.4)"}}>Estado del sistema</p>
              <p className="text-sm font-semibold text-white">{"\u{1F44B}"} Bienvenido/a, {nombre}</p>
              <p className="text-xs mt-0.5" style={{color:"rgba(255,255,255,0.3)"}}>Plan: <span style={{color:"#d4af37"}}>{PLAN_PRICES[plan]?.name}</span></p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <StatusBadge status={sysStatus}/>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${contactos.length>0?"bg-green-400":"bg-red-400 animate-pulse"}`}/>
                <span className="text-xs" style={{color:contactos.length>0?"#22c55e":"#ef4444"}}>
                  {contactos.length>0?`${contactos.length} contacto${contactos.length>1?"s":""}`:"Sin contactos"}
                </span>
              </div>
            </div>
          </div>
          {/* Canales disponibles */}
          <div className="mt-3 flex gap-2 flex-wrap">
            {[
              {icon:"\u{1F4F1}",label:"WhatsApp",ok:sysStatus==="ok"},
              {icon:"\u{1F4AC}",label:"SMS",ok:true},
              {icon:"\u{1F4DE}",label:"Voz",ok:true},
            ].map((ch,i)=>(
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{background:ch.ok?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${ch.ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`}}>
                <span className="text-sm">{ch.icon}</span>
                <span className="text-[10px] font-semibold" style={{color:ch.ok?"#4ade80":"#f87171"}}>{ch.label}</span>
              </div>
            ))}
            <button onClick={checkSys} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px]" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.3)"}}>
              {"\u{1F504}"} Verificar
            </button>
          </div>
          {contactos.length===0&&(
            <button onClick={()=>setScreen("contactos")} className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#fca5a5"}}>
              {"\u26A0\u{FE0F}"} Agregá un contacto para activar la protección →
            </button>
          )}
          <div className="mt-3 flex gap-2">
            <button onClick={handleLogout} disabled={loggingOut} className="rounded-xl px-3 py-1.5 text-xs text-slate-400 border border-white/10 bg-white/5">{loggingOut?"Saliendo...":"Cerrar sesión"}</button>
          </div>
        </div>

        {/* Módulo activo */}
        {activeModule?(
          <div className="mb-6">
            <button onClick={()=>setActiveModule(null)} className="mb-4 rounded-xl px-4 py-2.5 text-sm font-bold" style={{color:"#d4af37",background:"linear-gradient(145deg,#16161f,#0c0c12)",border:"1px solid rgba(212,175,55,0.15)"}}>← Volver al panel</button>
            <ModuleCard m={activeModule} autoExpand contactos={contactos} onOpenPastillero={()=>{setActiveModule(null);setScreen("pastillero");}} onOpenEvidencias={()=>{setActiveModule(null);setScreen("evidencias");}}/>
          </div>
        ):(
          <>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[2px]" style={{color:"rgba(212,175,55,0.4)"}}>¿Qué necesitás hoy?</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map(card=>(
                <button key={card.key} onClick={()=>handleCard(card.key)}
                  className="text-left rounded-2xl p-5 active:scale-[0.98] transition-all relative"
                  style={{background:card.key==="contactos"&&contactos.length===0?"linear-gradient(135deg,rgba(234,88,12,0.1),rgba(234,88,12,0.05))":card.coming?"linear-gradient(145deg,#0f0f15,#0a0a10)":"linear-gradient(145deg,#12121a,#0c0c12)",border:card.key==="contactos"&&contactos.length===0?"1px solid rgba(234,88,12,0.3)":card.coming?"1px solid rgba(255,255,255,0.04)":"1px solid rgba(212,175,55,0.08)",boxShadow:"5px 5px 14px rgba(0,0,0,0.4)",opacity:card.coming?0.6:1}}>
                  {card.coming&&<div className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{background:"rgba(212,175,55,0.1)",border:"1px solid rgba(212,175,55,0.2)",color:"#d4af37"}}>Próximamente</div>}
                  <div className="mb-2 text-2xl">{card.emoji}</div>
                  <div className="text-sm font-bold" style={{color:card.coming?"rgba(212,175,55,0.3)":"#d4af37"}}>{card.title}</div>
                  <p className="mt-1 text-xs" style={{color:"rgba(255,255,255,0.3)"}}>{card.text}</p>
                  {!card.coming&&<div className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{color:"rgba(212,175,55,0.35)"}}>Abrir →</div>}
                </button>
              ))}
            </div>
            {plan==="gratis"&&(
              <div className="mt-4 rounded-2xl p-4" style={{background:"linear-gradient(135deg,rgba(212,175,55,0.06),rgba(184,134,11,0.03))",border:"1px solid rgba(212,175,55,0.12)"}}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{"\u{1F451}"}</span>
                  <div className="flex-1"><div className="text-sm font-bold" style={{color:"#d4af37"}}>Desbloqueá protección completa</div><p className="text-xs text-slate-400 mt-0.5">SMS + Llamada de voz + 5 contactos + medicamentos ilimitados</p></div>
                  <div className="shrink-0 text-right"><div className="text-sm font-bold" style={{color:"#d4af37"}}>US$4.99</div><div className="text-[10px] text-slate-500">/mes</div></div>
                </div>
              </div>
            )}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-3 text-xs" style={{color:"rgba(255,255,255,0.12)"}}>
                <button onClick={()=>alert("Tus datos son solo tuyos. No compartimos información.\ninfo@traza360.app")} className="hover:text-white underline">Privacidad</button>
                <span>·</span>
                <button onClick={()=>alert("Traza 360 no reemplaza el 911 o 107.")} className="hover:text-white underline">Términos</button>
                <span>· v18.0</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alert enviada (pánico) */}
      {panicResult&&panicContact&&<AlertSentModal onClose={()=>{setPanicResult(null);setPanicContact(null);}} contacto={panicContact} result={panicResult}/>}

      {/* BOTÓN PÁNICO FLOTANTE — animado */}
      <div className="fixed bottom-5 right-5 z-50">
        <PanicButton onPress={handlePanic} disabled={contactos.length===0}/>
      </div>

      <style>{`
        @keyframes panicRing1{0%,100%{transform:scale(1);opacity:0.4}50%{transform:scale(1.3);opacity:0}}
        @keyframes panicRing2{0%,100%{transform:scale(1);opacity:0.25}50%{transform:scale(1.6);opacity:0}}
      `}</style>
    </div>
  );
}

// ─── CALCULADORA ──────────────────────────────
function CalcScreen({ onUnlock }) {
  const [disp,setDisp]=useState("0");
  const [pin]=useState(()=>sessionStorage.getItem("t360pin")||"1234");
  function key(k){
    if(k==="C"){setDisp("0");return;}
    if(k==="="){if(disp===pin||disp.endsWith(pin)){onUnlock();return;}try{setDisp(String(Function('"use strict";return('+disp.replace(/×/g,"*").replace(/÷/g,"/")+')')())) ;}catch{setDisp("Error");}return;}
    if(disp==="0"||disp==="Error")setDisp(k);else setDisp(disp+k);
  }
  const keys=["7","8","9","÷","4","5","6","×","1","2","3","-","0",".","=","+","C"];
  return(
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-end pb-8 px-4">
      <div className="w-full max-w-sm mb-4"><div className="rounded-2xl bg-[#222] p-6 text-right"><div className="text-4xl font-light text-white font-mono">{disp}</div></div></div>
      <div className="w-full max-w-sm grid grid-cols-4 gap-2">
        {keys.map(k=>(<button key={k} onClick={()=>key(k)} className={`rounded-2xl py-4 text-xl font-semibold active:scale-95 ${["÷","×","-","+","="].includes(k)?"bg-orange-500 text-white":k==="C"?"bg-[#a5a5a5] text-black":"bg-[#333] text-white"}`}>{k}</button>))}
      </div>
      <p className="mt-6 text-[10px] text-slate-700">Ingresá {pin} y tocá = para acceder</p>
    </div>
  );
}

// ─── APP ──────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [userProfile, setUserProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    if(p.get("modo")==="calc"){setScreen("calculadora");return;}
    checkSession();
    if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>saveLoc(p.coords.latitude,p.coords.longitude),()=>{},{enableHighAccuracy:true,timeout:10000});
    try{const s=sessionStorage.getItem("t360name");if(s)setPendingName(s);}catch(e){}
  },[]);

  async function checkSession(){
    const r=await getCurrentUser();
    if(r?.authUser){setAuthUser(r.authUser);setUserProfile(r.profile);if(!r.profile)await createProfile(r.authUser);
      const done=sessionStorage.getItem("t360ob");if(!done)setShowOnboarding(true);setScreen("home");}
    else setScreen("landing");
  }
  async function createProfile(user){
    try{const n=sessionStorage.getItem("t360name")||user.email?.split("@")[0]||"Usuario";const{data,error}=await supabase.from("usuarios").insert({auth_user_id:user.id,nombre:n,email:user.email,plan:"gratis",modo:"me_protejo"}).select().single();if(!error&&data)setUserProfile(data);}catch(e){}
  }
  async function handleAuthSuccess(){const r=await getCurrentUser();if(r?.authUser){setAuthUser(r.authUser);setUserProfile(r.profile);if(!r.profile)await createProfile(r.authUser);}const done=sessionStorage.getItem("t360ob");if(!done)setShowOnboarding(true);setScreen("home");}
  function handleLogout(){setUserProfile(null);setAuthUser(null);setPendingName(null);try{sessionStorage.removeItem("t360name");sessionStorage.removeItem("t360ob");}catch(e){}setScreen("landing");}

  if(screen==="calculadora")return<CalcScreen onUnlock={()=>{setScreen("loading");checkSession();}}/>;
  if(screen==="loading")return(
    <div className="flex min-h-screen items-center justify-center" style={{background:"linear-gradient(180deg,#050508,#0a0a14)"}}>
      <div className="text-center"><div style={{filter:"drop-shadow(0 0 30px rgba(212,175,55,0.2))"}}><EagleEyeLogo size={80}/></div><div className="text-xs mt-3" style={{color:"rgba(212,175,55,0.35)"}}>Cargando...</div></div>
    </div>
  );
  if(screen==="home"&&showOnboarding)return<OnboardingScreen onComplete={()=>setShowOnboarding(false)}/>;
  if(screen==="login")return<LoginScreen onBack={()=>setScreen("landing")} onSuccess={handleAuthSuccess}/>;
  if(screen==="register")return<RegisterScreen onBack={()=>setScreen("landing")} onSuccess={handleAuthSuccess} setPendingName={setPendingName}/>;
  if(screen==="home")return<HomeScreen userProfile={userProfile} authUser={authUser} pendingName={pendingName} onLogout={handleLogout}/>;
  return<LandingScreen onScreen={setScreen}/>;
}
