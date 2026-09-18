import { describe, it, expect, vi } from "vitest";
import { extractOrder } from "../../llm/extractOrder";
import type { OrderExtraction } from "../../validation/orderSchema";

vi.mock("../../lib/getSecrets", () => ({
  getSecrets: vi.fn().mockResolvedValue({
    SUPABASE_SERVICE_ROLE_KEY: "unused-in-this-test",
    META_VERIFY_TOKEN: "unused-in-this-test",
    META_APP_SECRET: "unused-in-this-test",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  })
}))

vi.mock("../../llm/buildMenuContext", () => ({
  buildMenuContext: vi.fn().mockResolvedValue(
    "- carnitas (available toppings: mixto, costilla, buche, carne, cuero)\n" +
    "- gordita (available toppings: nopales, frijoles, tinga)"
  ),
}));

function normalize(order: OrderExtraction) {
  return {
    ...order,
    items: [...order.items]
      .map((item) => ({ ...item, toppings: [...item.toppings].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.quantity - b.quantity),
  };
}

describe("extractOrder", () => {
  it("extracts a simple pickup order with the default mixto topping", async () => {
    const result = await extractOrder(["I want 3 pounds of carnitas"]);
    expect(normalize(result)).toEqual(normalize({
      isOrder: true,
      orderType: "pickup",
      customerAddress: null,
      customerPhone: null,
      additionalInfo: null,
      items: [{ name: "carnitas", quantity: 3, toppings: ["mixto"] }],
    }));
  });

  it("does not treat small talk or menu questions as an order", async () => {
    const result = await extractOrder(["hey do you guys have carnitas?"]);
    expect(result.isOrder).toBe(false);
  });

  it("captures delivery info without submitting an order yet", async () => {
    const result = await extractOrder([
      "hi can you deliver to 123 Main St, my number is 555-123-4567",
    ]);
    expect(result.isOrder).toBe(false);
    expect(result.customerAddress).toBe("123 Main St");
    expect(result.customerPhone).toBe("555-123-4567");
  });

  it("submits the order with previously given customer info once the order is placed", async () => {
    const result = await extractOrder([
      "hi can you deliver to 123 Main St, my number is 555-123-4567",
      "I'll take 2 pounds of carnitas with buche",
    ]);
    expect(result.isOrder).toBe(true);
    expect(result.orderType).toBe("delivery");
    expect(result.customerAddress).toBe("123 Main St");
    expect(result.customerPhone).toBe("555-123-4567");
  });
});