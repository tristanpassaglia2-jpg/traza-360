// api/daily-room.js — Traza 360
// Crea salas de audio/video en Daily.co para "Te Vigilo"

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, roomName } = req.body;
    const apiKey = process.env.DAILY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "DAILY_API_KEY no configurada" });
    }

    // CREAR SALA
    if (action === "create") {
      const response = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          properties: {
            // Sala expira en 2 horas
            exp: Math.floor(Date.now() / 1000) + 7200,
            // Máximo 2 participantes (cuidador + víctima)
            max_participants: 2,
            // Permitir audio y video
            enable_chat: true,
            enable_knocking: false,
            start_audio_off: false,
            start_video_off: true, // Video apagado por defecto (se activa manualmente)
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        return res.status(200).json({
          success: true,
          roomUrl: data.url,
          roomName: data.name,
          expiresAt: new Date((Math.floor(Date.now() / 1000) + 7200) * 1000).toISOString(),
        });
      } else {
        return res.status(400).json({ success: false, error: data.info || "Error al crear sala" });
      }
    }

    // ELIMINAR SALA
    if (action === "delete" && roomName) {
      const response = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${apiKey}` },
      });

      if (response.ok) {
        return res.status(200).json({ success: true });
      } else {
        const data = await response.json();
        return res.status(400).json({ success: false, error: data.info || "Error al eliminar sala" });
      }
    }

    return res.status(400).json({ error: "Acción inválida. Usar: create o delete" });
  } catch (error) {
    console.error("Daily.co error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
