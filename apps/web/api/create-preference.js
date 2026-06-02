// VIGÍA 24 — Crea el checkout de MercadoPago (Checkout Pro)
// Ruta pública: /api/create-preference
// Requiere variable de entorno en Vercel: MP_ACCESS_TOKEN
// Opcionales: PREMIUM_PRICE (default 5000), PREMIUM_CURRENCY (default ARS)

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) return res.status(500).json({ error: "Falta configurar MP_ACCESS_TOKEN en Vercel" });

  const PRICE = Number(process.env.PREMIUM_PRICE || 5000);
  const CURRENCY = process.env.PREMIUM_CURRENCY || "ARS";

  // Body puede venir como objeto o string según runtime
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body) body = {};
  const userId = body.userId || "";
  const email = body.email || "";

  // Origen del request (dominio de la app) para los back_urls y el webhook
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host || "traza360.app";
  const origin = req.headers.origin || (proto + "://" + host);

  try {
    const preference = {
      items: [{
        title: "VIGÍA 24 Premium — 1 mes",
        description: "Protección completa: ubicación en vivo, evidencias y más.",
        quantity: 1,
        unit_price: PRICE,
        currency_id: CURRENCY,
      }],
      external_reference: userId,
      metadata: { user_id: userId },
      back_urls: {
        success: origin + "/?pago=ok",
        failure: origin + "/?pago=error",
        pending: origin + "/?pago=pendiente",
      },
      auto_return: "approved",
      notification_url: origin + "/api/mp-webhook",
      statement_descriptor: "VIGIA24",
    };
    if (email) preference.payer = { email: email };

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + ACCESS_TOKEN,
      },
      body: JSON.stringify(preference),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("MP preference error:", data);
      return res.status(500).json({ error: "MercadoPago rechazó la solicitud", detail: data });
    }
    return res.status(200).json({ init_point: data.init_point, id: data.id });
  } catch (e) {
    console.error("create-preference error:", e);
    return res.status(500).json({ error: String(e) });
  }
}
