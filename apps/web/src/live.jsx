// ═══════════════════════════════════════════════════════════════
// TRAZA 360 — Panel de seguimiento en vivo
// traza360.app/live/:token — sin login, para contactos
// v19.9 — Sin react-leaflet (compatible con package.json actual)
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

const G = {
  gold: "#D4AF37", goldGrad: "linear-gradient(135deg,#D4AF37,#B8941F)",
  red: "#DC2626", green: "#22c55e", black: "#000", bg: "#050505",
  card: "#0d0d0d", border: "rgba(212,175,55,0.18)", borderStrong: "rgba(212,175,55,0.42)",
  white: "#FFF", mute: "#777", dim: "#3a3a3a",
};

function pad(n) { return String(Math.floor(n)).padStart(2, "0"); }
function fmtMs(ms) {
  if (!ms || ms <= 0) return "00:00:00";
  const s = ms / 1000;
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}
function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 10)  return "ahora mismo";
  if (s < 60)  return `hace ${s} seg`;
  if (s < 120) return "hace 1 minuto";
  return `hace ${Math.floor(s / 60)} min`;
}

function BatteryIcon({ level }) {
  const c = level > 50 ? G.green : level > 20 ? "#f59e0b" : G.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", width: 24, height: 12, border: `1.5px solid ${c}`, borderRadius: 3 }}>
        <div style={{ position: "absolute", right: -5, top: "50%", transform: "translateY(-50%)", width: 3, height: 6, background: c, borderRadius: "0 2px 2px 0" }} />
        <div style={{ position: "absolute", left: 1, top: 1, bottom: 1, width: `${Math.max(2, level)}%`, background: c, borderRadius: 2, transition: "width 1s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{level}%</span>
    </div>
  );
}

function MapaSimple({ lat, lng }) {
  if (!lat || !lng) {
    return (
      <div style={{ height: 220, background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16, border: `1px solid ${G.border}` }}>
        <div style={{ fontSize: 32 }}>🗺️</div>
        <p style={{ fontSize: 13, color: G.mute, textAlign: "center", margin: 0 }}>
          Esperando primera ubicación...<br/>
          <span style={{ fontSize: 11, color: G.dim }}>La persona debe tener la app abierta</span>
        </p>
      </div>
    );
  }
  const mapsUrl  = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}&z=16`;
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${G.border}`, position: "relative" }}>
      <iframe src={mapsUrl} width="100%" height="240"
        style={{ border: "none", display: "block", filter: "invert(90%) hue-rotate(180deg)" }}
        allowFullScreen loading="lazy" title="Ubicación en vivo" />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "2px solid rgba(212,175,55,0.4)", animation: "ripple 2s ease-out infinite" }} />
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: G.goldGrad, border: "2.5px solid #000", boxShadow: "0 0 16px rgba(212,175,55,0.6)" }} />
        </div>
      </div>
      <a href={mapsLink} target="_blank" rel="noreferrer"
        style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.85)", border: `1px solid ${G.border}`, borderRadius: 8, color: G.gold, fontSize: 11, fontWeight: 700, padding: "5px 10px", textDecoration: "none", pointerEvents: "all" }}>
        Abrir en Maps →
      </a>
    </div>
  );
}

export default function LivePage() {
  const token = window.location.pathname.split("/live/")[1]?.split("?")[0];
  const [session,     setSession]     = useState(null);
  const [pos,         setPos]         = useState(null);
  const [countdown,   setCountdown]   = useState(null);
  const [estado,      setEstado]      = useState("loading");
  const [lastUpdate,  setLastUpdate]  = useState(null);
  const [checkinSent, setCheckinSent] = useState(false);
  const [checkinOk,   setCheckinOk]   = useState(false);
  const channelRef = useRef(null);
  const timerRef   = useRef(null);

  useEffect(() => {
    if (!token) { setEstado("noexiste"); return; }
    cargar();
    return () => { clearInterval(timerRef.current); channelRef.current?.unsubscribe(); };
  }, []);

  async function cargar() {
    const { data: sess, error } = await supabase
      .from("live_sessions").select("*").eq("token", token).single();
    if (error || !sess) { setEstado("noexiste"); return; }
    setSession(sess);
    if (sess.cancelado_at)                      { setEstado("cancelado"); return; }
    if (new Date(sess.expires_at) < new Date()) { setEstado("vencido");   return; }
    setEstado("activo");

    const { data: loc } = await supabase
      .from("live_locations").select("lat,lng,updated_at,battery,speed")
      .eq("session_token", token).order("updated_at", { ascending: false }).limit(1).single();
    if (loc) { setPos(loc); setLastUpdate(loc.updated_at); }

    channelRef.current = supabase.channel(`live-${token}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_locations", filter: `session_token=eq.${token}` },
        ({ new: n }) => { if (!n) return; setPos(n); setLastUpdate(n.updated_at); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `token=eq.${token}` },
        ({ new: n }) => {
          if (n?.cancelado_at) setEstado("cancelado");
          if (new Date(n?.expires_at) < new Date()) setEstado("vencido");
          if (n?.checkin_respondido) setCheckinOk(true);
        })
      .subscribe();

    timerRef.current = setInterval(() => {
      const ms = new Date(sess.expires_at) - new Date();
      if (ms <= 0) { setEstado("vencido"); clearInterval(timerRef.current); }
      else setCountdown(ms);
    }, 1000);
  }

  async function pedirCheckin() {
    setCheckinSent(true);
    await supabase.from("live_sessions")
      .update({ checkin_pedido_at: new Date().toISOString(), checkin_respondido: false })
      .eq("token", token);
  }

  if (estado === "loading")   return <Loader />;
  if (estado === "noexiste")  return <Final icon="❌" color={G.red}   titulo="Link no encontrado"  texto="Este link no existe o ya expiró." />;
  if (estado === "cancelado") return <Final icon="✅" color={G.green} titulo="¡Llegó bien!" texto={`${session?.nombre_usuario || "La persona"} canceló el seguimiento. Todo tranquilo.`} />;

  const vencido  = estado === "vencido";
  const tienePos = !!(pos?.lat && pos?.lng);
  const nombre1  = session?.nombre_usuario?.split(" ")[0] || "la persona";
  const modLabel = { turno_seguro: "🌙 Noche Segura", mi_escudo: "🛡️ Protección", los_cuido: "👨‍👩‍👧 Adolescente" }[session?.modulo] || "📍 Seguimiento";

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.white, fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      {/* HEADER */}
      <div style={{ background: G.card, borderBottom: `1px solid ${G.border}`, padding: "11px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: G.goldGrad, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: G.red }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase", color: G.gold }}>Traza 360</div>
              <div style={{ fontSize: 9, color: G.mute }}>Panel de seguimiento</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: vencido ? "rgba(220,38,38,0.1)" : "rgba(34,197,94,0.08)", border: `1px solid ${vencido ? "rgba(220,38,38,0.4)" : "rgba(34,197,94,0.3)"}` }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: vencido ? G.red : G.green, animation: vencido ? "none" : "blink 1.4s infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: vencido ? "#fca5a5" : G.green }}>{vencido ? "Timer vencido" : "En vivo"}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 14px" }}>

        {vencido && (
          <div style={{ margin: "14px 0 0", padding: "16px", borderRadius: 16, background: "rgba(220,38,38,0.1)", border: `2px solid ${G.red}`, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>⚠️</div>
            <p style={{ fontWeight: 800, color: "#fca5a5", margin: "0 0 4px", fontSize: 16 }}>El timer venció sin cancelar</p>
            <p style={{ color: G.mute, fontSize: 12, margin: "0 0 12px" }}>{session?.nombre_usuario} no confirmó que está bien.</p>
            <div style={{ background: "rgba(220,38,38,0.15)", borderRadius: 10, padding: "8px 12px" }}>
              <p style={{ color: "#fca5a5", fontSize: 12, fontWeight: 600, margin: 0 }}>Si no podés comunicarte → llamá al 911</p>
            </div>
          </div>
        )}

        {/* INFO SESIÓN */}
        <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 16, background: G.card, border: `1px solid ${G.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 19, fontWeight: 800, color: G.white, margin: 0 }}>{session?.nombre_usuario || "Alguien"}</p>
              <p style={{ fontSize: 11, color: G.mute, margin: "3px 0 0" }}>Activó a las {fmtTime(session?.started_at)} · hasta {fmtTime(session?.expires_at)}</p>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(212,175,55,0.08)", border: `1px solid ${G.borderStrong}` }}>
                <span style={{ fontSize: 10, color: G.gold, fontWeight: 700 }}>{modLabel}</span>
              </div>
              {pos?.battery != null && <BatteryIcon level={pos.battery} />}
            </div>
          </div>
          {session?.mensaje && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(212,175,55,0.05)", borderLeft: `3px solid ${G.gold}` }}>
              <p style={{ fontSize: 12, color: "#d4b565", margin: 0, fontStyle: "italic" }}>"{session.mensaje}"</p>
            </div>
          )}
        </div>

        {/* TIMER */}
        <div style={{ marginTop: 12, padding: "20px 16px", borderRadius: 20, textAlign: "center", background: vencido ? "rgba(220,38,38,0.07)" : "linear-gradient(145deg,#0d0d0d,#000)", border: `2px solid ${vencido ? G.red : G.borderStrong}` }}>
          {!vencido && <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "4px", color: G.gold, margin: "0 0 6px", fontWeight: 700 }}>Tiempo restante</p>}
          <p style={{ fontSize: 58, fontWeight: 900, margin: 0, letterSpacing: "-3px", fontVariantNumeric: "tabular-nums", color: vencido ? "#fca5a5" : G.white }}>
            {vencido ? "00:00:00" : fmtMs(countdown)}
          </p>
          {!vencido && <p style={{ fontSize: 11, color: G.mute, margin: "6px 0 0" }}>Vence a las {fmtTime(session?.expires_at)}</p>}
        </div>

        {/* GPS STATUS */}
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 16, background: G.card, border: `1px solid ${G.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: tienePos ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${tienePos ? "rgba(34,197,94,0.3)" : G.dim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📍</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: G.white, margin: 0 }}>GPS en vivo</p>
              <p style={{ fontSize: 11, color: tienePos ? G.green : G.mute, margin: "2px 0 0" }}>
                {tienePos ? `Última actualización: ${fmtRelative(lastUpdate)}` : "Esperando posición..."}
              </p>
            </div>
          </div>
          {pos?.speed != null && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: G.gold, margin: 0 }}>{Math.round(pos.speed * 3.6)}</p>
              <p style={{ fontSize: 9, color: G.mute, margin: 0 }}>km/h</p>
            </div>
          )}
        </div>

        {/* MAPA */}
        <div style={{ marginTop: 12 }}>
          <MapaSimple lat={pos?.lat} lng={pos?.lng} />
        </div>

        {/* CHECK-IN */}
        {!vencido && (
          <div style={{ marginTop: 12 }}>
            {checkinSent ? (
              <div style={{ padding: "16px", borderRadius: 16, textAlign: "center", background: "rgba(212,175,55,0.06)", border: `1px solid ${G.borderStrong}` }}>
                {checkinOk
                  ? <><div style={{ fontSize: 26, marginBottom: 6 }}>✅</div><p style={{ fontSize: 14, fontWeight: 700, color: G.green, margin: "0 0 4px" }}>Respondió el check-in</p><p style={{ fontSize: 12, color: G.mute, margin: 0 }}>{nombre1} confirmó que está bien.</p></>
                  : <><div style={{ fontSize: 26, marginBottom: 6 }}>⏳</div><p style={{ fontSize: 14, fontWeight: 700, color: G.gold, margin: "0 0 4px" }}>Check-in solicitado</p><p style={{ fontSize: 12, color: G.mute, margin: 0 }}>Esperando respuesta de {nombre1}...</p></>
                }
              </div>
            ) : (
              <button onClick={pedirCheckin}
                style={{ width: "100%", padding: "16px", borderRadius: 16, background: "linear-gradient(145deg,#0d0d0d,#000)", border: `2px solid ${G.borderStrong}`, color: G.gold, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>👋</span>
                Pedir check-in a {nombre1}
                <span style={{ fontSize: 11, color: G.mute, fontWeight: 400 }}>→ le llega notificación</span>
              </button>
            )}
          </div>
        )}

        {/* INSTRUCCIONES */}
        <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 16, background: G.card, border: `1px solid ${G.border}` }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "2px", color: G.gold, margin: "0 0 10px", fontWeight: 700 }}>¿Qué hacés vos?</p>
          {[
            ["📱", "Dejá esta página abierta. Se actualiza sola."],
            ["👋", `Si algo te preocupa, pedí un check-in. ${nombre1} recibe una notificación y debe responder.`],
            ["⏱️", vencido ? "El timer venció. Intentá comunicarte. Si no podés, llamá al 911." : "Si el timer llega a 0 sin cancelar, Traza 360 ya mandó alerta automática."],
            ["🚨", "Ante cualquier duda real, llamá al 911."],
          ].map(([icon, txt], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <p style={{ fontSize: 12, color: G.mute, margin: 0, lineHeight: 1.6 }}>{txt}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 12, padding: "16px", borderRadius: 16, background: "linear-gradient(145deg,rgba(212,175,55,0.07),rgba(0,0,0,0))", border: `1px solid ${G.borderStrong}`, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: G.mute, margin: "0 0 10px" }}>¿Querés protegerte vos también?</p>
          <a href="https://traza360.app" target="_blank" rel="noreferrer"
            style={{ display: "inline-block", background: G.goldGrad, color: "#000", fontWeight: 700, fontSize: 13, padding: "10px 28px", borderRadius: 12, textDecoration: "none" }}>
            Probá Traza 360 gratis →
          </a>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box} body{margin:0}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes ripple{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.5);opacity:0}}
      `}</style>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 44, height: 44, border: "3px solid rgba(212,175,55,0.15)", borderTop: "3px solid #D4AF37", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#777", fontSize: 13 }}>Cargando panel...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Final({ icon, color, titulo, texto }) {
  return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ color, margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{titulo}</h2>
      <p style={{ color: "#777", fontSize: 14, maxWidth: 300, margin: "0 0 28px", lineHeight: 1.6 }}>{texto}</p>
      <a href="https://traza360.app" style={{ color: "#D4AF37", fontSize: 13, textDecoration: "underline" }}>Ir a Traza 360</a>
    </div>
  );
}
