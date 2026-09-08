import { ChatAnthropic } from "@langchain/anthropic";
import { SystemMessage, HumanMessage } from "langchain";
import { OrderExtractionSchema, type OrderExtraction } from "../validation/orderSchema";
import { buildMenuContext } from "./buildMenuContext";

export function buildSystemPrompt(menuContext: string) {
  return `You are an order-parsing assistant for a small Mexican restaurant. Read the customer's message below and extract the current order into structured JSON matching the given schema. Do not invent information the customer didn't state.
  
  Menu:
  ${menuContext}
  
  Rules:
  - orderType defaults to "pickup" unless the customer clearly asks for delivery or gives a delivery address.
  - customerAddress and customerPhone should only be filled if the customer has actually provided them so far in the conversation. Leave them null otherwise, eve if orderType is "delivery" - these details often arrive in a later message.
  - all toppings must be written in Spanish, matching the menu's topping list exactly.
  - If a customer requests different toppings for portions of one item's quantity, split it into mulitple separate item entries whose quantites sum to the total requested.
  - For carnitas cut toppings (costilla, buche, carne), whether "mixto" should also be included depends on whether the customer wants that cut in addition to the regular mixed order, 
    or wants only that cut. If their phrasing keeps carnitas as a general/mixed order and adds a specific cut on top (words like "con," "también," "y unas piezas de"), include "mixto" 
    alongside the specific cut(s). If their phrasing asks for a cut exclusively (words like "solo," "nomás," "puro," "únicamente," or stating the cut as if it were the entire order with no mention of wanting a mix), 
    omit "mixto" entirely and list only the specific cut(s) requested.
  - If the customer asks for something that isn't a menu item or a real topping - like a preparation instruction ("cut into small pieces"), or extra amounts of something not tracked as a topping (extra salsa, extra jalapenos) - do not invent a fake item or topping for it. 
    Instead, summarize it briefly in additionalInfo. If there's nothing like this, additionalInfo should be null.

  Examples:
  
  Customer: "I want 3 pounds of carnitas"
  -> items: [{ "name": "carnitas", "quantity": 3, "toppings": ["mixto"] }]

  Customer: "I want 2 pounds of carnitas with ribs and cuero"
  -> items: [{ "name": "carnitas", "quantity": 2, "toppings": ["cuero", "costilla"] }]

  Customer: "I want 3 pounds of carnitas, make half ribs and the other half just meat"
  -> items: [
    { "name": "carnitas", "quantity": 1.5, "toppings": ["costilla"] },
    { "name": "carnitas", "quantity": 1.5, "toppings": ["carne"] }
  ]

  Customer: "I want 2 gorditas de nopales, 3 de frijoles, and 1 de tinga"
  -> items: [
      { "name": "gordita", "quantity": 2, "toppings": ["nopales"] },
      { "name": "gordita", "quantity": 3, "toppings": ["frijoles"] },
      { "name": "gordita", "quantity": 1, "toppings": ["tinga"] }
    ]  

  Customer: "Can you deliver 2 gorditas de frijoles to 123 Main St, my number is 555-123-4567"
  -> orderType: "delivery", customerAddress: "123 Main St", customerPhone: "555-123-4567", items: [{ "name": "gorditas", "quantity": 2, "toppings": ["frijoles"] }]

  Customer: "puedo ordenar 3 libras de carnitas con buche? también las pones unas piezas de costilla."
  -> items: [{ "name": "carnitas", "quantity": 3, "toppings": ["mixto", "buche", "costilla"] }]

  Customer: "quiero 2 libras de costilla"
  -> items: [{ "name": "carnitas", "quantity": 2, "toppings": ["costilla"] }]

  Customer: "dame 1 libra, solo buche"
  -> items: [{ "name": "carnitas", "quantity": 1, "toppings": ["buche"] }]

  Customer: "hola, puedo ordenar 3 libras de carnitas con buche?" / "tambien las pones unas piezas de costilla." / "¿Puede dejar mis carnitas cortadas en trozos pequeños?"
  -> items: [{ "name": "carnitas", "quantity": 3, "toppings": ["mixto", "buche", "costilla"] }], additionalInfo: "Cut the carnitas into small pieces"

  Customer: "hola, me das 2 libras de carnitas con buche y costilla?" / "tambien quero salsa si tienen"
  -> items: [{ "name": "carnitas, "quantity": 2, "toppings": ["mixto", "buche", "costilla"] }], additionalInfo: "Wants salsa"

  `
}

export async function extractOrder(messageHistory: string[]): Promise<OrderExtraction> {
  const menuContext = await buildMenuContext();
  const systemPrompt = buildSystemPrompt(menuContext);

  const conversationText = messageHistory.map((text, i) => `${i+1}. ${text}`).join("\n");

  const model = new ChatAnthropic({
    model: "claude-haiku-4-5-20251001",
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const structureModel = model.withStructuredOutput(OrderExtractionSchema);

  const result = await structureModel.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(conversationText),
  ]);

  return result;
}