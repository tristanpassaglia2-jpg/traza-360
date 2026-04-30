// api/send-whatsapp.js — Traza 360
// Envía WhatsApp vía Twilio (Sandbox o Producción)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "Faltan campos: to, message" });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    // SANDBOX: usa +14155238886
    // PRODUCCIÓN: cambiá esta variable en Vercel a whatsapp:+19349353798
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Limpiar número: quitar +, espacios, y agregar prefijo whatsapp:
    const cleanTo = to.replace(/\+/g, "").replace(/\s/g, "").replace(/-/g, "");
    const toWhatsApp = `whatsapp:+${cleanTo}`;

    const params = new URLSearchParams();
    params.append("To", toWhatsApp);
    params.append("From", fromNumber);
    params.append("Body", message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (data.sid) {
      return res.status(200).json({ success: true, sid: data.sid, to: toWhatsApp });
    } else {
      console.error("Twilio error:", data);
      return res.status(400).json({ success: false, error: data.message || "Error Twilio", code: data.code });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
