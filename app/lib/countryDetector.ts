// src/lib/countryDetector.ts

import { useState, useEffect } from 'react';

// Países donde MercadoPago está disponible
export const MERCADOPAGO_COUNTRIES = [
  'AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY', 'EC'
];

export async function detectUserCountry(): Promise<{
  country: string;
  useMercadoPago: boolean;
}> {
  try {
    // Intento 1: Usar API de geolocalización (gratis, sin auth)
    const response = await fetch('https://ipapi.co/json/', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code?.toUpperCase();
      return {
        country: countryCode || 'US',
        useMercadoPago: MERCADOPAGO_COUNTRIES.includes(countryCode)
      };
    }
  } catch (e) {
    console.warn('⚠️ Geolocalización falló, usando fallback:', e);
  }

  // Fallback: usar locale del navegador
  try {
    const locale = navigator.language || (navigator as any).userLanguage;
    const countryCode = locale.split('-')[1]?.toUpperCase() || 
                       locale.slice(0, 2).toUpperCase();
    
    return {
      country: countryCode,
      useMercadoPago: MERCADOPAGO_COUNTRIES.includes(countryCode)
    };
  } catch {
    // Fallback definitivo: asumir Argentina (ajustar según tu mercado principal)
    return { country: 'AR', useMercadoPago: true };
  }
}

// Hook personalizado para usar en componentes
export function usePaymentMethod() {
  const [paymentMethod, setPaymentMethod] = useState<{
    type: 'mercadopago' | 'paypal' | 'loading';
    country: string;
  }>({ type: 'loading', country: 'AR' });

  useEffect(() => {
    let mounted = true;
    
    detectUserCountry().then(({ country, useMercadoPago }) => {
      if (mounted) {
        setPaymentMethod({
          type: useMercadoPago ? 'mercadopago' : 'paypal',
          country
        });
      }
    });

    return () => { mounted = false; };
  }, []);

  return paymentMethod;
}