// ═══════════════════════════════════════════════════════════════
// TRAZA 360 — Panel de respuesta para contactos
// traza360.app/alerta/:id — sin login, para contactos
// v1.0 — Panel público donde contactos responden a alertas
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase     = createClient(SUPABASE_URL, SUPABASE_KEY);

const G = {
  gold: "#D4AF37", goldGrad: "linear-gradient(135deg,#D4AF37,#B8941F)",
  red: "#DC2626", green: "#22c55e", blue: "#3b82f6", black: "#000", bg: "#050505",
  card: "#0d0d0d", border: "rgba(212,175,55,0.18)", borderStrong: "rgba(212,175,55,0.42)",
  white: "#FFF", mute: "#777", dim: "#3a3a3a",
};

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return "hace unos segundos";
  if (s < 120) return "hace 1 minuto";
  if (s < 3600) return `hace ${Math.floor(s / 60)} minutos`;
  return `hace ${Math.floor(s / 3600)} hora${Math.floor(s / 3600) > 1 ? "s" : ""}`;
}

const RESPUESTAS = [
  { id: "estoy_yendo",    emoji: "🚗", label: "Estoy yendo",       color: G.green, desc: "Voy para allá ahora" },
  { id: "la_llamo",       emoji: "📞", label: "La estoy llamando", color: G.blue,  desc: "Intento comunicarme" },
  { id: "llamo_911",      emoji: "🚨", label: "Llamo al 911",      color: G.red,   desc: "Contacto emergencias" },
];

function MapaAlerta({ lat, lng }) {
  if (!lat || !lng) {
    return (
      <div style={{ height: 200, background: "#0a0a0a", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16,
        border: `1px solid ${G.border}` }}>
        <div style={{ fontSize: 32 }}>📍</div>
        <p style={{ fontSize: 13, color: G.mute, textAlign: "center", margin: 0 }}>
          Ubicación no disponible
        </p>
      </div>
    );
  }
  const mapsUrl  = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}&z=16`;
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${G.border}`, position: "relative" }}>
      <iframe src={mapsUrl} width="100%" height="220"
        style={{ border: "none", display: "block", filter: "invert(90%) hue-rotate(180deg)" }}
        allowFullScreen loading="lazy" title="Ubicación de alerta" />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex",
        alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -10, borderRadius: "50%",
            border: "2px solid rgba(220,38,38,0.5)", animation: "rippleRed 1.5s ease-out infinite" }} />
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: G.red,
            border: "2.5px solid #000", boxShadow: "0 0 20px rgba(220,38,38,0.7)" }} />
        </div>
      </div>
      <a href={mapsLink} target="_blank" rel="noreferrer"
        style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.85)",
          border: `1px solid ${G.border}`, borderRadius: 8, color: G.gold, fontSize: 11,
          fontWeight: 700, padding: "5px 10px", textDecoration: "none", pointerEvents: "all" }}>
        Abrir en Maps →
      </a>
    </div>
  );
}

export default function AlertaPage() {
  const alertaId = window.location.pathname.split("/alerta/")[1]?.split("?")[0];
  const [alerta,      setAlerta]      = useState(null);
  const [estado,       setEstado]      = useState("loading");
  const [enviado,      setEnviado]     = useState(null);
  const [enviando,     setEnviando]    = useState(false);
  const [respuestas,   setRespuestas]  = useState([]);
  const [timeAgo,      setTimeAgo]     = useState("");
  const channelRef = useRef(null);

  useEffect(() => {
    if (!alertaId) { setEstado("noexiste"); return; }
    cargar();
    const interval = setInterval(() => {
      if (alerta?.creado_en) setTimeAgo(fmtRelative(alerta.creado_en));
    }, 10000);
    return () => { clearInterval(interval); channelRef.current?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (alerta?.creado_en) setTimeAgo(fmtRelative(alerta.creado_en));
  }, [alerta]);

  async function cargar() {
    const { data, error } = await supabase
      .from("alertas").select("*").eq("id", alertaId).single();
    if (error || !data) { setEstado("noexiste"); return; }
    setAlerta(data);
    setEstado("activo");

    // Cargar respuestas existentes
    const { data: resps } = await supabase
      .from("respuestas_contacto").select("*")
      .eq("alerta_id", alertaId).order("timestamp", { ascending: true });
    if (resps) setRespuestas(resps);

    // Escuchar nuevas respuestas en tiempo real
    channelRef.current = supabase.channel(`alerta-resp-${alertaId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "respuestas_contacto",
        filter: `alerta_id=eq.${alertaId}`
      }, ({ new: n }) => {
        if (n) setRespuestas(prev => [...prev, n]);
      })
      .subscribe();
  }

  async function responder(tipo) {
    if (enviado || enviando) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from("respuestas_contacto").insert({
        alerta_id: alertaId,
        button_id: tipo.id,
        from_number: "web_panel",
        timestamp: new Date().toISOString(),
        raw_data: { source: "web_panel", user_agent: navigator.userAgent }
      });
      if (!error) {
        setEnviado(tipo.id);
      }
    } catch (e) {
      console.error("Error al responder:", e);
    }
    setEnviando(false);
  }

  if (estado === "loading") return <Loader />;
  if (estado === "noexiste") return (
    <Final icon="❌" color={G.red} titulo="Alerta no encontrada"
      texto="Este link no existe o la alerta ya fue eliminada." />
  );

  const modLabel = {
    "violencia_de_genero": "🔴 Violencia de Género",
    "violencia de genero": "🔴 Violencia de Género",
    "noche_segura": "🔵 Noche Segura",
    "adolescente_seguro": "🟢 Adolescente Seguro",
  }[alerta?.modulo] || "🚨 Emergencia";

  const otrasRespuestas = respuestas.filter(r => r.from_number !== "web_panel");

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.white,
      fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 }}>

      {/* HEADER */}
      <div style={{ background: "rgba(220,38,38,0.08)", borderBottom: `2px solid ${G.red}`,
        padding: "11px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", alignItems: "center",
          justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: G.goldGrad,
              border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: G.red }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "3px",
                textTransform: "uppercase", color: G.gold }}>Traza 360</div>
              <div style={{ fontSize: 9, color: G.mute }}>Alerta de emergencia</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px",
            borderRadius: 20, background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.4)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G.red,
              animation: "blink 0.8s infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fca5a5" }}>EMERGENCIA</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 14px" }}>

        {/* ALERTA PRINCIPAL */}
        <div style={{ marginTop: 14, padding: "20px 18px", borderRadius: 20,
          background: "linear-gradient(145deg, rgba(220,38,38,0.08), rgba(0,0,0,0.9))",
          border: `2px solid ${G.red}`, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8, animation: "pulse 2s infinite" }}>🆘</div>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#fca5a5", margin: "0 0 6px" }}>
            Necesita tu ayuda
          </p>
          <p style={{ fontSize: 14, color: G.mute, margin: "0 0 12px" }}>
            {alerta?.mensaje || "Alerta activada — necesita ayuda"}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12 }}>🕐</span>
              <span style={{ fontSize: 12, color: G.mute }}>
                {fmtTime(alerta?.creado_en)} {timeAgo && `(${timeAgo})`}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 12 }}>{modLabel.split(" ")[0]}</span>
              <span style={{ fontSize: 12, color: G.mute }}>{modLabel.split(" ").slice(1).join(" ")}</span>
            </div>
          </div>
        </div>

        {/* MAPA */}
        <div style={{ marginTop: 12 }}>
          <MapaAlerta lat={alerta?.latitud} lng={alerta?.longitud} />
        </div>

        {/* BOTONES DE RESPUESTA */}
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "3px",
            color: G.gold, margin: "0 0 12px", fontWeight: 700, textAlign: "center" }}>
            ¿Qué vas a hacer?
          </p>

          {enviado ? (
            <div style={{ padding: "24px 18px", borderRadius: 20, textAlign: "center",
              background: "rgba(34,197,94,0.06)", border: `2px solid ${G.green}` }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <p style={{ fontSize: 18, fontWeight: 800, color: G.green, margin: "0 0 6px" }}>
                Respuesta enviada
              </p>
              <p style={{ fontSize: 13, color: G.mute, margin: "0 0 14px" }}>
                {RESPUESTAS.find(r => r.id === enviado)?.emoji}{" "}
                {RESPUESTAS.find(r => r.id === enviado)?.label}
              </p>
              <div style={{ padding: "10px 14px", borderRadius: 12,
                background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.2)` }}>
                <p style={{ fontSize: 12, color: G.green, margin: 0, fontWeight: 600 }}>
                  La persona ya recibió tu respuesta en Traza 360
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RESPUESTAS.map(r => (
                <button key={r.id} onClick={() => responder(r)} disabled={enviando}
                  style={{
                    width: "100%", padding: "18px 16px", borderRadius: 16,
                    background: `linear-gradient(145deg, ${r.color}11, ${r.color}05)`,
                    border: `2px solid ${r.color}66`,
                    color: G.white, cursor: enviando ? "wait" : "pointer",
                    opacity: enviando ? 0.6 : 1,
                    display: "flex", alignItems: "center", gap: 14,
                    transition: "all 0.2s ease",
                    outline: "none",
                  }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14,
                    background: `${r.color}18`, border: `1px solid ${r.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0 }}>
                    {r.emoji}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: r.color }}>
                      {r.label}
                    </p>
                    <p style={{ fontSize: 12, color: G.mute, margin: "3px 0 0" }}>{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* OTRAS RESPUESTAS */}
        {otrasRespuestas.length > 0 && (
          <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 16,
            background: G.card, border: `1px solid ${G.border}` }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "2px",
              color: G.gold, margin: "0 0 10px", fontWeight: 700 }}>
              Otros contactos respondieron
            </p>
            {otrasRespuestas.map((r, i) => {
              const tipo = RESPUESTAS.find(t => t.id === r.button_id) ||
                { emoji: "💬", label: r.button_id, color: G.gold };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 0", borderTop: i > 0 ? `1px solid ${G.border}` : "none" }}>
                  <span style={{ fontSize: 18 }}>{tipo.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: tipo.color, margin: 0 }}>
                      {tipo.label}
                    </p>
                    <p style={{ fontSize: 10, color: G.dim, margin: "2px 0 0" }}>
                      {fmtRelative(r.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ACCIONES DIRECTAS */}
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          {alerta?.latitud && alerta?.longitud && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${alerta.latitud},${alerta.longitud}`}
              target="_blank" rel="noreferrer"
              style={{ flex: 1, padding: "14px", borderRadius: 14, background: G.card,
                border: `1px solid ${G.border}`, color: G.gold, fontWeight: 700, fontSize: 13,
                textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8 }}>
              <span>🗺️</span> Cómo llegar
            </a>
          )}
          <a href="tel:911"
            style={{ flex: 1, padding: "14px", borderRadius: 14,
              background: "rgba(220,38,38,0.08)", border: `1px solid rgba(220,38,38,0.4)`,
              color: "#fca5a5", fontWeight: 700, fontSize: 13, textDecoration: "none",
              textAlign: "center", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8 }}>
            <span>📞</span> Llamar 911
          </a>
        </div>

        {/* INSTRUCCIONES */}
        <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 16,
          background: G.card, border: `1px solid ${G.border}` }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "2px",
            color: G.gold, margin: "0 0 10px", fontWeight: 700 }}>
            Qué podés hacer
          </p>
          {[
            ["🚗", "Si podés ir, tocá \"Estoy yendo\" para que sepa que vas."],
            ["📞", "Intentá llamarla/o directamente por teléfono."],
            ["🚨", "Si no contestás o la situación es grave, llamá al 911."],
            ["📍", "Usá \"Cómo llegar\" para abrir la ruta en Google Maps."],
          ].map(([icon, txt], i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 8 : 0 }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <p style={{ fontSize: 12, color: G.mute, margin: 0, lineHeight: 1.6 }}>{txt}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 16, padding: "16px", borderRadius: 16,
          background: "linear-gradient(145deg,rgba(212,175,55,0.07),rgba(0,0,0,0))",
          border: `1px solid ${G.borderStrong}`, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: G.mute, margin: "0 0 10px" }}>
            ¿Querés protegerte vos también?
          </p>
          <a href="https://traza360.app" target="_blank" rel="noreferrer"
            style={{ display: "inline-block", background: G.goldGrad, color: "#000",
              fontWeight: 700, fontSize: 13, padding: "10px 28px", borderRadius: 12,
              textDecoration: "none" }}>
            Probá Traza 360 gratis →
          </a>
        </div>
      </div>

      <style>{`
        *{box-sizing:border-box} body{margin:0}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
        @keyframes rippleRed{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.8);opacity:0}}
        button:active{transform:scale(0.97)}
      `}</style>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ width: 44, height: 44, border: "3px solid rgba(220,38,38,0.15)",
        borderTop: "3px solid #DC2626", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#777", fontSize: 13 }}>Cargando alerta...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Final({ icon, color, titulo, texto }) {
  return (
    <div style={{ minHeight: "100vh", background: G.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ color, margin: "0 0 10px", fontSize: 22, fontWeight: 800 }}>{titulo}</h2>
      <p style={{ color: "#777", fontSize: 14, maxWidth: 300, margin: "0 0 28px", lineHeight: 1.6 }}>{texto}</p>
      <a href="https://traza360.app" style={{ color: "#D4AF37", fontSize: 13, textDecoration: "underline" }}>
        Ir a Traza 360
      </a>
    </div>
  );
}
