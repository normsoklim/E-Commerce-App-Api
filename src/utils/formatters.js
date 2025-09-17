export function formatOrderNotification(order, email, type = "Payment Completed") {
  if (!order || !order.items || order.items.length === 0) 
    return "⚠️ Order has no items.";

  // Items summary with subtotal per item
  const itemsSummary = order.items
    .map(i => {
      const name = i.product?.name || "Unknown Product";
      const qty = i.quantity;
      const price = i.price.toFixed(2);
      const subtotal = (i.price * i.quantity).toFixed(2);
      return `🛒 ${name} x${qty} - $${price} each (Subtotal: $${subtotal})`;
    })
    .join("\n");

  // Shipping details
  const shipping = order.shippingAddress
    ? `🏠 ${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}, ${order.shippingAddress.country}`
    : "N/A";

  // Order date
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : "N/A";

  // Totals
  const subtotal = order.subtotal?.toFixed(2) || "0.00";
  const shippingPrice = ((order.total || 0) - (order.subtotal || 0)).toFixed(2);
  const total = order.total?.toFixed(2) || "0.00";

  return `
✅ <b>${type}</b>

📦 <b>Order ID:</b> <code>${order._id.toString()}</code>
🗓 <b>Date:</b> ${orderDate}
👤 <b>Customer:</b> ${email}
💳 <b>Payment Method:</b> ${order.paymentMethod || "N/A"}
${shipping ? `<b>Shipping Address:</b>\n${shipping}` : ""}
📊 <b>Status:</b> ${order.status || "Pending"}

📝 <b>Items:</b>
${itemsSummary}

💰 <b>Subtotal:</b> $${subtotal}
🚚 <b>Shipping:</b> $${shippingPrice}
💵 <b>Total:</b> $${total}

🎉 Thank you for shopping with us!
`.trim();
}
