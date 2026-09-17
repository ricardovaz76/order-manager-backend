import { z } from "zod";

export const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  toppings: z.array(z.string()),

});

export const OrderExtractionSchema = z.object({
  isOrder: z
    .boolean()
    .describe(
      "true only if the conversation contains an actual, concrete food order for specific menu items. " +
      "false for greetings, questions, small talk, spam, profanity, or anything that is not a real order " +
      "- even if food is mentioned in parsing. When in doubt, use false."
    ),
  orderType: z.enum(["pickup", "delivery"]),
  customerAddress: z.string().nullable(),
  customerPhone: z.string().nullable(),
  additionalInfo: z.string().nullable(),
  items: z.array(OrderItemSchema),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderExtraction = z.infer<typeof OrderExtractionSchema>;