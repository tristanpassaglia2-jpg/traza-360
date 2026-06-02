// VIGÍA 24 — Recibe la confirmación de pago de MercadoPago y activa Premium
// Ruta pública: /api/mp-webhook
// Requiere variables de entorno en Vercel:
//   MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// IMPORTANTE: en Supabase, agregá la columna premium_until ejecutando una vez:
//   ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS premium_until timestamptz;

export default async function handler(req, res) {
  // MercadoPago espera siempre 200 para no reintentar en loop
  try {
    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // La notificación puede venir por body o por query (?type=payment&data.id=123)
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body) body = {};
    const q = req.query || {};

    const type = body.type || q.type || q.topic;
    const paymentId = (body.data && body.data.id) || q["data.id"] || q.id;

    if (type !== "payment" || !paymentId) {
      return res.status(200).send("ignored");
    }

    // Traer el detalle del pago
    const pr = await fetch("https://api.mercadopago.com/v1/payments/" + paymentId, {
      headers: { "Authorization": "Bearer " + ACCESS_TOKEN },
    });
    const pago = await pr.json();

    if (pago && pago.status === "approved") {
      const userId = pago.external_reference || (pago.metadata && pago.metadata.user_id);
      if (userId && SUPABASE_URL && SERVICE_KEY) {
        const until = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
        const up = await fetch(SUPABASE_URL + "/rest/v1/usuarios?auth_user_id=eq." + encodeURIComponent(userId), {
          method: "PATCH",
          headers: {
            "apikey": SERVICE_KEY,
            "Authorization": "Bearer " + SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ plan: "premium", premium_until: until }),
        });
        if (!up.ok) {
          const txt = await up.text();
          console.error("Supabase update error:", up.status, txt);
        } else {
          console.log("Premium activado para user:", userId);
        }
      }
    }
    return res.status(200).send("ok");
  } catch (e) {
    console.error("mp-webhook error:", e);
    return res.status(200).send("ok");
  }
}
