import { NextResponse } from 'next/server';

const PAYPAL_API =
  process.env.NODE_ENV === 'development'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

export async function POST(request: Request) {
  try {
    const { amount, currency, description } = await request.json();

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description,
          },
        ],
        application_context: {
          brand_name: 'lanagia',
          user_action: 'PAY_NOW',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('PayPal create-order error:', error);
      return NextResponse.json({ error }, { status: 500 });
    }

    const data = await response.json();

    return NextResponse.json({ orderID: data.id });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Error creating order' }, { status: 500 });
  }
}

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}