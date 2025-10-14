import paypal from '@paypal/checkout-server-sdk';

// Create PayPal environment
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);

// Create client instance
const client = new paypal.core.PayPalHttpClient(environment);

export default client;

// Helper function to create PayPal order
export const createPayPalOrder = async (orderData) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD',
          value: orderData.total.toString(),
        },
        description: `Order #${orderData._id}`,
        reference_id: orderData._id.toString(),
      },
    ],
    application_context: {
      brand_name: process.env.STORE_NAME || 'Your Store',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    },
  });

  const response = await client.execute(request);
  return response.result;
};

// Helper function to capture PayPal payment
export const capturePayPalPayment = async (orderId) => {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  
  const response = await client.execute(request);
  return response.result;
};

// Helper function to get PayPal order details
export const getPayPalOrder = async (orderId) => {
  const request = new paypal.orders.OrdersGetRequest(orderId);
  const response = await client.execute(request);
  return response.result;
};