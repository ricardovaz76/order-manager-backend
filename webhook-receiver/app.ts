import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getSupabaseClient } from "./lib/supabase";
import { MessengerWebhookSchema } from "./validation/messengerWebhookSchema";
import { extractOrder } from "./llm/extractOrder";
import { writeOrderExtraction } from "./llm/writeOrderExtraction";
import { isValidSignature } from "./validation/validateMetaSignature";
import { getSecrets } from "./lib/getSecrets";

export const handler = async ( event: APIGatewayProxyEvent ): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "GET") {
    return handleVerification(event);
  }

  if (event.httpMethod === "POST") {
    return handleWebhook(event);
  }

  return { statusCode: 405, body: JSON.stringify({ status: "Method not allowed" }) };
};

export async function handleVerification(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const secrets = await getSecrets();
  const params = event.queryStringParameters ?? {};
  const mode = params["hub.mode"];
  const token = params["hub.verify_token"];
  const challenge = params["hub.challenge"];

  if (mode === "subscribe" && token === secrets.META_VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return { statusCode: 200, body: challenge ?? "" };
  }

  return { statusCode: 403, body: "Forbidden" };
}

async function handleWebhook(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const supabase = await getSupabaseClient();

  // API Gateway may base64-encode the body depending on content-type handling —
  // decode first so the raw string matches exactly what Meta actually signed
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf-8")
    : (event.body ?? "");

  const signatureHeader = event.headers["x-hub-signature-256"] ?? event.headers["X-Hub-Signature-256"];

  if (!(await isValidSignature(rawBody, signatureHeader ?? null))) {
    console.error("Webhook signature verification failed");
    return { statusCode: 401, body: JSON.stringify({ status: "Invalid signature" }) };
  }

  const rawPayload: unknown = JSON.parse(rawBody);
  const result = MessengerWebhookSchema.safeParse(rawPayload);
  if (!result.success) {
    console.log("Invalid webhook payload:", result.error);
    return { statusCode: 400, body: JSON.stringify({ status: "Invalid payload" }) };
  }

  const body = result.data;

  // For loop meant to capture multiple messages incase the meta payload included a batch of messages
  for (const entry of body.entry ?? []) {
    for (const messagingEvent of entry.messaging ?? []) {
      const senderId = messagingEvent.sender.id;
      const pageId = messagingEvent.recipient.id;
      const text = messagingEvent.message?.text;

      if (senderId === pageId) {
        continue;
      }

      if (!text) {
        continue;
      }

      const { data: conversationData, error: conversationError } = await supabase.rpc(
        "get_or_create_conversation_and_log_message",
        { p_messenger_id: senderId, p_message_text: text }
      );

      const conversationId = conversationData?.[0]?.conversation_id;
      if (conversationError || conversationId === undefined) {
        console.error("MESSAGE_DROPPED", { reason: "conversation_lookup_failed", conversationError });
        continue;
      }

      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("message_text")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.error("MESSAGE_DROPPED", { reason: "message_fetch_failed", messageError });
        continue;
      }

      const messages = (messageData ?? []).map((m) => m.message_text);

      try {
        const extraction = await extractOrder(messages);
        if (extraction.isOrder) {
          await writeOrderExtraction(conversationId, extraction);
        }
      } catch (error) {
        console.error("MESSAGE_DROPPED", { reason: "order_extraction_failed", error });
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
}