import { describe, it, expect, vi } from "vitest";
import { validateOrderItems } from "../../validation/validateOrderItems";
import type { OrderItem } from "../../validation/orderSchema";

vi.mock("../../llm/buildMenuContext", () => ({
  getCachedMenuItems: vi.fn().mockResolvedValue([
    { name: "Carnitas", active_toppings: ["Mixto", "Costilla", "Buche", "Carne", "Cuero"] },
    { name: "Gordita", active_toppings: ["Nopales", "Frijoles", "Tinga"] },
    { name: "Agua Fresca", active_toppings: null },
  ]),
}));

function item(overrides: Partial<OrderItem>): OrderItem {
  return { name: "Carnitas", quantity: 1, toppings: [], ...overrides };
}

describe("validateOrderItems", () => {
  it("keeps an item whose name and toppings all match the menu", async () => {
    const result = await validateOrderItems([
      item({ name: "Carnitas", toppings: ["Mixto", "Cuero"] }),
    ]);
    expect(result).toEqual([{ name: "Carnitas", quantity: 1, toppings: ["Mixto", "Cuero"] }]);
  });

  it("drops the entire item when the name isn't a real menu item", async () => {
    const result = await validateOrderItems([
      item({ name: "Hamburger", toppings: ["Cheese"] }),
    ]);
    expect(result).toEqual([]);
  });

  it("keeps the item but drops only the unrecognized toppings", async () => {
    const result = await validateOrderItems([
      item({ name: "Carnitas", toppings: ["Mixto", "Ketchup", "Cuero"] }),
    ]);
    expect(result).toEqual([{ name: "Carnitas", quantity: 1, toppings: ["Mixto", "Cuero"] }]);
  });

  it("keeps the item with an empty toppings array when none of the requested toppings are valid", async () => {
    const result = await validateOrderItems([
      item({ name: "Gordita", toppings: ["Ketchup", "Mayo"] }),
    ]);
    expect(result).toEqual([{ name: "Gordita", quantity: 1, toppings: [] }]);
  });

  it("matches item names and toppings case-insensitively", async () => {
    const result = await validateOrderItems([
      item({ name: "CARNITAS", toppings: ["mixto", "CUERO"] }),
    ]);
    expect(result).toEqual([{ name: "CARNITAS", quantity: 1, toppings: ["mixto", "CUERO"] }]);
  });

  it("treats a menu item with no active_toppings as having none available", async () => {
    const result = await validateOrderItems([
      item({ name: "Agua Fresca", toppings: ["Ice"] }),
    ]);
    expect(result).toEqual([{ name: "Agua Fresca", quantity: 1, toppings: [] }]);
  });

  it("filters independently across multiple items in one call", async () => {
    const result = await validateOrderItems([
      item({ name: "Carnitas", toppings: ["Mixto"] }),
      item({ name: "Hamburger", toppings: ["Cheese"] }),
      item({ name: "Gordita", toppings: ["Nopales", "Fake"] }),
    ]);
    expect(result).toEqual([
      { name: "Carnitas", quantity: 1, toppings: ["Mixto"] },
      { name: "Gordita", quantity: 1, toppings: ["Nopales"] },
    ]);
  });

  it("returns an empty array when given no items", async () => {
    const result = await validateOrderItems([]);
    expect(result).toEqual([]);
  });
});