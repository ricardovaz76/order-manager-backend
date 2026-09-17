import { getSupabaseClient } from "../lib/supabase";
import { validateOrderItems } from "../validation/validateOrderItems";
import type { OrderExtraction } from "../validation/orderSchema";

// This method is called after the LLM finished parsing the message. it is meant to validate the order and to insert into the database in this order:
// - function gets or creates customer orders. If a function is created, then it defaults the orderType to pickup 
// - once the order id is grabed from the RPC, we first check if we can grab the customer address and phone if the ordertype is delivery
// - then we update the customer info with the extracted customer address and phone
// - add special instructions into additional info if any special instructions were given
// - we validate the items using validateOrderItems to ensure we only insert good inputs based on the menu table
// - we first delete the orderItems on the orderId to avoid duplicates since the LLM has the whole histroy and could accidently 
//   insert the old items and new items for each write
// - lastly we insert the valide items into the order_items table
export async function writeOrderExtraction(conversationId: string, extraction: OrderExtraction): Promise<void> {
  const supabase = await getSupabaseClient();

  const { data: orderId, error: orderError } = await supabase
    .rpc("get_or_create_order", { p_conversation_id: conversationId, p_order_type: extraction.orderType,});

  if (orderError || orderId === null) {
    console.error("Failed to get or create order:", orderError);
    throw new Error("Failed to get or create order");
  }

  // Ensures that delivery orderType grabs the customer address and phone if they exist
  const updates: {customer_address?: string; customer_phone?: string } = {};
  if (extraction.orderType === "delivery") {
    if (extraction.customerAddress) {
      updates.customer_address = extraction.customerAddress;
    }
    if (extraction.customerPhone) {
      updates.customer_phone = extraction.customerPhone;
    }
  }

  // Update customer info if there is anything needed to update
  if (Object.keys(updates).length > 0) {
    const { error: customerError } = await supabase
      .from("customer_info")
      .update({customer_address: updates.customer_address, customer_phone: updates.customer_phone})
      .eq("order_id", orderId);

      if (customerError) {
        console.error(`Failed to update customer info ${orderId}:`, customerError);
        throw new Error("Failed to update customer info");
      }
  }

  // adds a special request to the order if there are any
  if (extraction.additionalInfo) {
    const { error: additionalInfoError } = await supabase
      .from("orders")
      .update({additional_info: extraction.additionalInfo})
      .eq("id", orderId);

    if (additionalInfoError) {
      console.error("Failed to update order additional_info:", additionalInfoError);
      throw new Error("Failed to update order additional info");
    }
  }

  // validate item values checking each value against the values given from the menu_items table
  const validatedItems = await validateOrderItems(extraction.items);

  // Delete orderItems before inserting to avoid duplicating order items for the same orderId
  const { error: deleteError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

    if (deleteError) {
      console.error(`Failed to delete old order items ${orderId}:`, deleteError);
      throw new Error("Failed to delete old order items");
    }

  // Finally we insert the order items into the order_items table for the given orderId
   const { error: insertError } = await supabase.from("order_items").insert(
    validatedItems.map((item) => ({
      order_id: orderId,
      item_name: item.name,
      quantity: item.quantity,
      toppings: item.toppings.length > 0 ? item.toppings.join(', ') : null,
    }))
  );

  if (insertError) {
    console.error("failed to insert order items:", insertError);
    throw new Error("Failed to insert order items");
  }
}