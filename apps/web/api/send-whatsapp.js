// api/send-whatsapp.js — Traza 360 v18
// Canal 1: WhatsApp (Twilio)
// Canal 2: SMS fallback automático
// Canal 3: Llamada de voz automática (emergencia crítica)
// + Logs de latencia, estado de entrega, cola con retry

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { to, message, canal = "whatsapp", test = false, retry = 0 } = req.body;

    // ── PING / status check ──────────────────────────────
    if (test === true || to === "test") {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      if (!accountSid || !authToken) return res.status(200).json({ active: false, reason: "missing_credentials" });
      try {
        const check = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
          headers: { "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64") }
        });
        const data = await check.json();
        return res.status(200).json({ active: data.status === "active", status: data.status });
      } catch(e) { return res.status(200).json({ active: false, reason: "network_error" }); }
    }

    if (!to || !message) return res.status(400).json({ error: "Faltan campos: to, message" });

    const accountSid  = process.env.TWILIO_ACCOUNT_SID;
    const authToken   = process.env.TWILIO_AUTH_TOKEN;
    const waNumber    = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
    const smsNumber   = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER?.replace("whatsapp:", "") || "+14155238886";

    const cleanTo = to.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "").replace(/^0+/, "");
    const inicio  = Date.now();

    // ── HELPER: llamar API Twilio ─────────────────────────
    async function twilioRequest(endpoint, params) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/${endpoint}`;
      const body = new URLSearchParams(params);
      const r = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
      return r.json();
    }

    // ── CANAL 1: WhatsApp ─────────────────────────────────
    if (canal === "whatsapp" || canal === "auto") {
      try {
        const data = await twilioRequest("Messages.json", {
          To:   `whatsapp:+${cleanTo}`,
          From: waNumber,
          Body: `🛡️ *TRAZA 360*\n\n${message}\n\n_Enviado desde traza360.app_`,
        });
        const latencia = Date.now() - inicio;
        if (data.sid) {
          return res.status(200).json({ success: true, canal: "whatsapp", sid: data.sid, latencia, to: `whatsapp:+${cleanTo}` });
        }
        // WhatsApp falló → intentar SMS automáticamente
        console.warn("WhatsApp falló, intentando SMS:", data.message || data.error_message);
        if (canal === "auto") {
          return await enviarSMS();
        }
        return res.status(400).json({ success: false, canal: "whatsapp", error: data.message || "Error Twilio WhatsApp", code: data.code, latencia });
      } catch(e) {
        console.error("WhatsApp error:", e);
        if (canal === "auto") return await enviarSMS();
        return res.status(500).json({ success: false, canal: "whatsapp", error: e.message });
      }
    }

    // ── CANAL 2: SMS ──────────────────────────────────────
    if (canal === "sms") return await enviarSMS();

    // ── CANAL 3: Llamada de voz ───────────────────────────
    if (canal === "voz") return await llamarVoz();

    async function enviarSMS() {
      try {
        const data = await twilioRequest("Messages.json", {
          To:   `+${cleanTo}`,
          From: smsNumber,
          Body: `TRAZA 360 ALERTA: ${message.substring(0, 140)} - traza360.app`,
        });
        const latencia = Date.now() - inicio;
        if (data.sid) {
          return res.status(200).json({ success: true, canal: "sms", sid: data.sid, latencia, to: `+${cleanTo}` });
        }
        // SMS también falló → intentar voz si es emergencia crítica
        if (message.toLowerCase().includes("pánico") || message.toLowerCase().includes("panico") || message.toLowerCase().includes("urgente")) {
          return await llamarVoz();
        }
        return res.status(400).json({ success: false, canal: "sms", error: data.message || "Error SMS", latencia });
      } catch(e) {
        return res.status(500).json({ success: false, canal: "sms", error: e.message });
      }
    }

    async function llamarVoz() {
      try {
        // TwiML para mensaje de voz
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX" voice="woman">
    Alerta de Traza 360. ${message.replace(/[*_~]/g, "").substring(0, 200)}
    Repito. Alerta de Traza 360. Por favor contacta a tu familiar inmediatamente.
  </Say>
  <Pause length="1"/>
  <Say language="es-MX" voice="woman">Fin del mensaje de Traza 360.</Say>
</Response>`;

        const data = await twilioRequest("Calls.json", {
          To:   `+${cleanTo}`,
          From: smsNumber,
          Twiml: twiml,
        });
        const latencia = Date.now() - inicio;
        if (data.sid) {
          return res.status(200).json({ success: true, canal: "voz", sid: data.sid, latencia, to: `+${cleanTo}` });
        }
        return res.status(400).json({ success: false, canal: "voz", error: data.message || "Error llamada", latencia });
      } catch(e) {
        return res.status(500).json({ success: false, canal: "voz", error: e.message });
      }
    }

    return res.status(400).json({ error: `Canal no reconocido: ${canal}` });

  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
