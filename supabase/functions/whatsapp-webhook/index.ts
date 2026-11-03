// Starter webhook handler. Deploy only after configuring Meta webhook verification
// and server-side secrets. Validate signatures before trusting incoming events.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expected = Deno.env.get("META_VERIFY_TOKEN");
    if (mode === "subscribe" && token && expected && token === expected && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Verification failed", { status: 403 });
  }
  if (req.method === "POST") {
    // TODO: verify X-Hub-Signature-256 using META_APP_SECRET.
    // Then map Meta message status events to campaign_recipients/message_reports.
    const payload = await req.json().catch(() => null);
    console.log("Webhook event received", JSON.stringify(payload));
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
  return new Response("Method not allowed", { status: 405 });
});
