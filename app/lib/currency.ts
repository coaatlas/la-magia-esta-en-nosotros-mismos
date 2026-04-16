// src/app/lib/currency.ts

/**
 * Convierte USD a ARS usando tasa configurable
 */
export async function convertUSDtoARS(usdAmount: number): Promise<number> {
  try {
    // Tasa fija configurable en .env
    const fixedRate = parseFloat(process.env.EXCHANGE_RATE_USD_ARS || '1400');
    return usdAmount * fixedRate;
  } catch (error) {
    console.warn('⚠️ Error en conversión USD→ARS:', error);
    return usdAmount * 1400; // fallback
  }
}

/**
 * Convierte monto en ARS a centavos (formato MercadoPago)
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Formatea monto en centavos ARS para mostrar en UI
 */
export function formatARS(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}