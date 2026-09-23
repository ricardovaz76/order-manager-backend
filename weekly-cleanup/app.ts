import { getSupabaseClient } from "./lib/supabase";

export async function handler(): Promise<void> {
  const supabase = await getSupabaseClient();

  const { error, count } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .eq("active_status", "active");

  if (error) {
    console.error("WEEKLY_CLEANUP_FAILED", error);
    throw error;
  }

  console.log(`Weekly cleanup complete: deleted ${count ?? 0} active order(s)`);
}