import { createHmac, timingSafeEqual } from "crypto";
import { getSecrets } from "../lib/getSecrets";

// This function confirms the request actually came fromMeta, not someone who found the webhook URL 
// and is Posting a fake payload shaped like a real message.
// Meta signs the raw request body with the app secret; we recompute that same signature and check if it matches
export async function isValidSignature(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader) {
    return false;
  }

  const [algorithm, receivedSignature] = signatureHeader.split("=");
  if (algorithm !== "sha256" || !receivedSignature) {
    return false;
  }

  const secrets = await getSecrets();
  const expectedSignature = createHmac("sha256", secrets.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  const receivedBuffer = Buffer.from(receivedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  // timingSafeEqual is used to ensure the attacker cannot guess the correct signature one byte at a time 
  // by measuring how long each guess takes to reject
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}