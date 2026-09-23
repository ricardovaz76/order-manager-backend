import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import type { Database } from "./database.types";
import { getSecrets } from "./getSecrets";

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

export async function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const secrets = await getSecrets();

  cachedClient = createClient<Database>(
    process.env.SUPABASE_URL!,
    secrets.SUPABASE_SERVICE_ROLE_KEY,
    { realtime: { transport: ws as any } },
  );

  return cachedClient;
}