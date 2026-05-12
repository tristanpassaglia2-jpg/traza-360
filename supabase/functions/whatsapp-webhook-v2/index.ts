// Deploy v4 - 2026 - Vincula respuestas con alertas via context.id (wamid)
const VERIFY_TOKEN = "traza360_webhook_secret";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function buscarAlertaPorWamid(wamid: string): Promise<string | null> {
  if (!wamid) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/alertas?wamid=eq.${encodeURIComponent(wamid)}&select=id`,
    {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0]?.id || null;
}

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

      let buttonId: string | null = null;

      // Caso 1: Botones de templates (type: "button")
      if (message.type === "button") {
        buttonId = message.button?.payload || message.button?.text || null;
        console.log("Botón template presionado:", buttonId, "de", message.from);
      }
      // Caso 2: Botones interactivos (type: "interactive")
      else if (message.type === "interactive") {
        buttonId = message.interactive?.button_reply?.id ||
                   message.interactive?.list_reply?.id ||
                   null;
        console.log("Botón interactive presionado:", buttonId, "de", message.from);
      }

      if (buttonId) {
        // Buscar la alerta original por el wamid del mensaje al que está respondiendo
        const contextWamid = message.context?.id || null;
        let alertaId = null;
        if (contextWamid) {
          alertaId = await buscarAlertaPorWamid(contextWamid);
          console.log("Alerta vinculada:", alertaId, "via wamid:", contextWamid);
        }

        await insertRespuesta({
          alerta_id: alertaId,
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
