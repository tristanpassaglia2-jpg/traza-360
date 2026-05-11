import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = "traza360_webhook_secret";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

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
    const body = await req.json();
    console.log("Webhook recibido:", JSON.stringify(body));

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message?.type === "interactive") {
      const buttonId = message.interactive?.button_reply?.id;
      const from = message.from;
      const messageId = message.id;

      console.log(`Boton presionado: ${buttonId} por ${from}`);

      const { error } = await supabase.from("respuestas_contacto").insert({
        from_number: from,
        button_id: buttonId,
        mensaje_id: messageId,
        raw_data: message,
      });

      if (error) console.error("Error guardando respuesta:", error);
      else console.log("Respuesta guardada OK");
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  return new Response("Method not allowed", { status: 405 });
});
