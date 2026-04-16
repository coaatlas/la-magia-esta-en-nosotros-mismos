// src/app/api/mercadopago/create-preference/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Leer body con manejo seguro
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { title, priceUSD, bookSlug = 'la-magia' } = body;
    
    // 2. Validaciones básicas
    if (!title || typeof priceUSD !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Config (sin importar SDK para evitar errores de compilación)
    const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
    const RATE = parseFloat(process.env.EXCHANGE_RATE_USD_ARS || '1400');
    
    if (!MP_TOKEN) {
      console.error('❌ MP_ACCESS_TOKEN no está en .env.local');
      return NextResponse.json({ error: 'MP_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    // 4. Calcular precio (MP usa PESOS, no centavos)
    const priceARS = priceUSD * RATE;
    
    // 5. URLs absolutas (obligatorio)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

    // 6. Intentar crear preferencia con import dinámico para evitar errores de compilación
    let preferenceId, initPoint;
    try {
      const { MercadoPagoConfig, Preference } = await import('mercadopago');
      
      const client = new MercadoPagoConfig({ accessToken: MP_TOKEN });
      const preference = new Preference(client);
      
      const result = await preference.create({
        body: {
          items: [{
            id: `item-${bookSlug}`,
            title: String(title).slice(0, 128),
            unit_price: priceARS,  // 👈 PESOS, no centavos
            quantity: 1,
            currency_id: 'ARS'
          }],
          back_urls: {
            success: `${baseUrl}/libro/${bookSlug}?payment=success`,
            failure: `${baseUrl}/libro/${bookSlug}?payment=failure`,
            pending: `${baseUrl}/libro/${bookSlug}?payment=pending`
          },
          auto_return: 'approved',
          metadata: { bookSlug, priceUSD }
        }
      });
      
      preferenceId = result.id;
      initPoint = result.init_point;
      
    } catch (mpError: any) {
      console.error('❌ MercadoPago API Error:', {
        message: mpError?.message,
        cause: mpError?.cause,
        response: mpError?.response?.body
      });
      return NextResponse.json({ 
        error: 'MercadoPago API error', 
        detail: mpError?.message 
      }, { status: 500 });
    }

    // 7. Éxito
    return NextResponse.json({ preferenceId, initPoint });

  } catch (error: any) {
    // 🔥 CATCH FINAL: siempre devuelve JSON válido
    console.error('❌ UNEXPECTED ERROR:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      detail: String(error?.message || error)
    }, { status: 500 });
  }
}