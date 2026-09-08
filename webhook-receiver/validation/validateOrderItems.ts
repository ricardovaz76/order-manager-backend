import { getCachedMenuItems } from "../llm/buildMenuContext";
import type { OrderItem } from "../validation/orderSchema";
 
// Zod already guarantees each item's *shape* is correct (a string name, a
// positive quantity, an array of string toppings) - it has no idea whether
// "hamburger" is an actual menu item. This checks the *values* extracted
// against the real menu_items table.
//
// Two different drop rules, checked in order:
// 1. If the item name itself isn't a real menu item, the whole item is
//    dropped - there's nothing valid left to salvage.
// 2. If the name is valid but some toppings aren't recognized for that item,
//    only the bad toppings are dropped - the item itself is kept with
//    whatever toppings remain (possibly none).
export async function validateOrderItems(items: OrderItem[]): Promise<OrderItem[]> {
  const menuItems = await getCachedMenuItems();
 
  // new Map ["name": string["toppings", ....]] all toLower
  const menuByName = new Map(
    menuItems.map((m) => [
      m.name.toLowerCase(),
      (m.active_toppings ?? []).map((t) => t.toLowerCase()),
    ])
  );
 
  const validItems: OrderItem[] = [];

  // iterates through each item key 
  for (const item of items) {
    // Grabs toppings using the item key name.
    // If the item key name is not a part of the menu_items, then availableToppings
    // wouldn't be able to find the toppings in the menu table associated with the given key
    // returning undefined indicating the key is a bad value.
    const availableToppings = menuByName.get(item.name.toLowerCase());
    if (availableToppings === undefined) {
      continue;
    }
 
    // only saves toppings that can be found in the menu table associated with the given key
    // the rest are ignored (bad value)
    const keptToppings = item.toppings.filter((t) =>
      availableToppings.includes(t.toLowerCase())
    );
 
    validItems.push({ ...item, toppings: keptToppings });
  }
 
  return validItems;
}