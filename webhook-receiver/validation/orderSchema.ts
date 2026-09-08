import { z } from "zod";

export const OrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  toppings: z.array(z.string()),

});

export const OrderExtractionSchema = z.object({
  orderType: z.enum(["pickup", "delivery"]),
  customerAddress: z.string().nullable(),
  customerPhone: z.string().nullable(),
  additionalInfo: z.string().nullable(),
  items: z.array(OrderItemSchema),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type OrderExtraction = z.infer<typeof OrderExtractionSchema>;