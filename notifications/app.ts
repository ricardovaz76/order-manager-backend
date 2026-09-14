import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { supabase } from "./lib/supabase";

const DB_WEBHOOK_SECRET = process.env.DB_WEBHOOK_SECRET;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface SupabaseWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Record<string, string>;
  old_record: Record<string, string> | null;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
}

export const handler = async ( event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const secretHeader = event.headers["x-webhook-secret"] ?? event.headers["X-Webhook-Secret"];
  if (secretHeader !== DB_WEBHOOK_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ status: "Unauthorized" }) };
  }

  const payload = JSON.parse(event.body ?? "{}") as SupabaseWebhookPayload;

  if (payload.table === "orders" && payload.type === "INSERT") {
    await notifyOptedInUsersOfNewOrder();
  }

  if (payload.table === "customer_info" && payload.type === "UPDATE") {
    await notifyDriverOfAssignment(payload.record, payload.old_record);
  }

  return { statusCode: 200, body: JSON.stringify({ status: "ok" }) };
}

async function notifyOptedInUsersOfNewOrder(): Promise<void> {
  const { data, error } = await supabase
    .from("push_token")
    .select("expo_push_token, users!inner(new_order_notifications_enabled)")
    .eq("users.new_order_notifications_enabled", true);

  if (error || !data?.length) {
    console.error("Failed to load staff push tokens", error);
    return;
  }

  const messages: ExpoMessage[] = data.map((row) => ({
    to: row.expo_push_token,
    title: "New Order",
    body: "A new order just came in.",
  }));

  await sendExpoPush(messages);
}

async function notifyDriverOfAssignment(record: Record<string, unknown>, oldRecord: Record<string, unknown> | null): Promise<void> {
  const newDriverId = record.driver_id as string | null;
  const oldDriverId = oldRecord?.driver_id as string | null;

  if (!newDriverId || newDriverId === oldDriverId) {
    return;
  }

  const { data: driverData, error: driverError } = await supabase
    .from("delivery_drivers")
    .select("user_id")
    .eq("id", newDriverId)
    .single();

  if (driverError || !driverData) {
    console.error("Failed to load driver user id", driverError);
    return;
  }

  const { data: tokenData, error: tokenError } = await supabase
    .from("push_token")
    .select("expo_push_token")
    .eq("user_id", driverData.user_id);

  if (tokenError || !tokenData?.length) {
    console.error("Failed to load driver push token", tokenError);
    return;
  }

  const messages: ExpoMessage[] = tokenData.map((row) => ({
    to: row.expo_push_token,
    title: "New Delivery assigned",
    body: "You've been assigned a new delivery.",
  }));

  await sendExpoPush(messages);
}

async function sendExpoPush(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error("Expo push send failed", await response.text());
  }
}