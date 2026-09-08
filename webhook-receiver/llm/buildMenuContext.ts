import { supabase } from "../lib/supabase";

const CACHE_TTL_MS = 5 * 60 * 1000;

type MenuItems = {
  name: string,
  active_toppings: string[] | null;
}

let cachedMenuItems: MenuItems[] | null = null;
let cachedAt = 0;

export async function getCachedMenuItems() {
  const now = Date.now();
  if (cachedMenuItems && now - cachedAt < CACHE_TTL_MS) {
    return cachedMenuItems;
  }

  const { data: menuItems, error } = await supabase
    .from("menu_items")
    .select("name, active_toppings")
    .eq("active", true);

  if (error) {
    console.error("Failed to load menu for LLM context:", error);
    throw new Error("Failed to load menu items");
  }

  cachedMenuItems = menuItems ?? [];
  cachedAt = now;
  return cachedMenuItems
}

// Pulls the current active menu straight from the database and formats it into a block of text for the LLM to read.
// This runs on every query and is set up this way to avoid needing to hardcode the menu items to allow for future menu 
// changes without needing to make code changes or redeploy
export async function buildMenuContext(): Promise<string> {
  const menuItems = await getCachedMenuItems();

  if (menuItems.length === 0) {
    return "No menu items are currently available";
  }
    
  return menuItems.map((item) => {
    const toppings = item.active_toppings?.length ? item.active_toppings.join(", ") : "none";
    return `- ${item.name} (available toppings: ${toppings})`;
  })
  .join("\n");
}