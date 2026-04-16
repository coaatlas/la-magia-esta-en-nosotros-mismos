import { NextResponse } from 'next/server';

const PAYPAL_API =
  process.env.NODE_ENV === 'development'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const order = await response.json();

    console.log('ORDER STATUS:', order.status);

    if (order.status === 'COMPLETED') {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, status: order.status },
      { status: 400 }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
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