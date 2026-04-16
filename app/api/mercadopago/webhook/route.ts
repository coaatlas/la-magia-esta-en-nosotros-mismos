import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN || '',
});

export async function POST(request: Request) {
  try {
    const { paymentId, mode, bookSlug } = await request.json();

    console.log('🔔 Webhook received:', { paymentId, mode, bookSlug });

    // Verificar el pago con la API de MercadoPago
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });

    console.log('💳 Payment status:', payment.status);

    if (payment.status === 'approved' || payment.status === 'pending') {
      // ✅ Aquí guardarías en tu base de datos que el usuario tiene acceso
      // Ejemplo con localStorage (solo para demo):
      // if (mode === 'oneTime') {
      //   localStorage.setItem(`purchased_${bookSlug}`, 'true');
      // }
      
      console.log('✅ Payment verified, granting access');
      
      return NextResponse.json({ 
        success: true, 
        status: payment.status,
        amount: payment.transaction_amount,
        currency: payment.currency_id
      });
    }

    console.log('❌ Payment not approved:', payment.status);
    return NextResponse.json(
      { success: false, status: payment.status, message: 'Payment not completed' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', detail: error?.message },
      { status: 500 }
    );
  }
}