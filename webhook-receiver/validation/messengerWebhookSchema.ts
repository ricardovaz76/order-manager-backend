import { z } from "zod/v4";

export const MessengerEventSchema = z.object({
  sender: z.object({ id: z.string() }),
  recipient: z.object({ id: z.string() }),
  message: z
    .object({ 
      mid: z.string(),
      text:z.string().optional()
    })
    .optional()
});

export const MessengerWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number(),
      messaging: z.array(MessengerEventSchema),
    })
  ),
});

export type MessengerWebhookBody = z.infer<typeof MessengerWebhookSchema>;
export type MessengerEvent = z.infer<typeof MessengerEventSchema>;