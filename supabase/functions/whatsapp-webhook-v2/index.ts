const VERIFY_TOKEN = "traza360_webhook_secret";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function insertRespuesta(data: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/respuestas_contacto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("DB insert failed:", res.status, txt);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Webhook recibido:", JSON.stringify(body));
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) {
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      if (message.type === "interactive") {
        const buttonId =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id;
        console.log("Botón presionado:", buttonId, "de", message.from);
        await insertRespuesta({
          from_number: message.from,
          button_id: buttonId,
          mensaje_id: message.id,
          raw_data: message,
        });
      }
      return new Response("OK", { status: 200, headers: corsHeaders });
    } catch (err) {
      console.error("Error:", err);
      return new Response("Error", { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
