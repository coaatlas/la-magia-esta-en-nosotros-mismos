'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Shield, Lock, AlertCircle,
  ExternalLink, Loader2, Globe
} from 'lucide-react';
import { useToast } from '@/app/hooks/useToast';

// PayPal
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// MercadoPago
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import { usePaymentMethod } from '../lib/countryDetector';

type PaymentGatewayProps = {
  amount: number;
  currency: string;
  description: string;
  onPaymentSuccess: (paymentType: 'oneTime' | 'subscription') => Promise<void>;
  onPaymentError?: (error: Error) => void;
  mode?: 'oneTime' | 'subscription';
};

export default function PaymentGateway({
  amount,
  currency,
  description,
  onPaymentSuccess,
  onPaymentError,
  mode = 'oneTime'
}: PaymentGatewayProps) {

  const { success, error: showError, info } = useToast();
  const paymentMethod = usePaymentMethod();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loadingMP, setLoadingMP] = useState(false);

  // ===== INIT MERCADOPAGO =====
  useEffect(() => {
    if (paymentMethod.type === 'mercadopago') {
      initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '', {
        locale: paymentMethod.country === 'BR' ? 'pt-BR' : 'es-AR'
      });
    }
  }, [paymentMethod]);

  // ===== CREAR PREFERENCE =====
  const createMercadoPagoPreference = useCallback(async () => {
    try {
      setLoadingMP(true);

      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: description,
          price: amount / 100,
          currency,
          quantity: 1,
          mode
        })
      });

      if (!response.ok) throw new Error('Error creando preferencia');

      const { preferenceId } = await response.json();
      setPreferenceId(preferenceId);

    } catch (err) {
      console.error('❌ MP error:', err);
      showError('Error con MercadoPago. Probá con PayPal.');
      setShowFallback(true);
    } finally {
      setLoadingMP(false);
    }
  }, [amount, currency, description, mode, showError]);

  // ===== AUTO LOAD MP =====
  useEffect(() => {
    if (paymentMethod.type === 'mercadopago') {
      createMercadoPagoPreference();
    }
  }, [paymentMethod, createMercadoPagoPreference]);

  // ===== PAYPAL CONFIG =====
  const paypalInitialOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    currency: currency === 'ARS' ? 'USD' : currency,
    intent: mode === 'subscription' ? 'subscription' : 'capture'
  };
  // ===== HANDLERS =====

  const handleMercadoPagoReturn = async (data: any) => {
    try {
      setIsProcessing(true);

      if (data.status === 'approved' || data.status === 'pending') {
        await onPaymentSuccess(mode);
        success('🎉 Pago exitoso con MercadoPago');
      } else {
        throw new Error('Pago no aprobado');
      }

    } catch (err) {
      showError('Error confirmando el pago');
      onPaymentError?.(err as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalSuccess = async (data: any) => {
    try {
      setIsProcessing(true);

      const res = await fetch('/api/paypal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mode })
      });

      if (!res.ok) throw new Error();

      await onPaymentSuccess(mode);
      success('🎉 Pago exitoso con PayPal');

    } catch (err) {
      showError('Error verificando PayPal');
      onPaymentError?.(err as Error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== UI =====

  if (paymentMethod.type === 'loading') {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* REGION */}
      <div className="flex justify-center text-xs text-gray-400 gap-2">
        <Globe size={12} />
        Método: <strong>{paymentMethod.type}</strong>
      </div>

      {/* ===== MERCADOPAGO ===== */}
      {paymentMethod.type === 'mercadopago' && !showFallback && (
        <div className="space-y-3">

          <div className="p-4 bg-blue-500/10 border rounded-xl text-blue-400 text-sm">
            Pago seguro con MercadoPago
          </div>

          {loadingMP && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-blue-400" />
            </div>
          )}

          {preferenceId && (
            <Wallet
              initialization={{ redirectMode: 'self' }}
              onSubmit={async () => {
                try {
                  const response = await fetch('/api/mercadopago/create-preference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: description,
                      price: amount / 100,
                      currency,
                      quantity: 1,
                      mode
                    })
                  });

                  if (!response.ok) throw new Error();

                  const { preferenceId } = await response.json();

                  window.location.href = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`;

                } catch (err) {
                  console.error(err);
                  setShowFallback(true);
                }
              }}
              onReady={() => console.log('MP Ready')}
              onError={() => setShowFallback(true)}
            />
          )}
        </div>
      )}

      {/* ===== PAYPAL ===== */}
      {(paymentMethod.type === 'paypal' || showFallback) && (
        <PayPalScriptProvider options={paypalInitialOptions}>
          <PayPalButtons
            createOrder={async () => {
              const res = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: amount / 100,
                  currency,
                  description
                })
              });

              const { orderID } = await res.json();
              return orderID;
            }}
            onApprove={handlePayPalSuccess}
            onCancel={() => info('Pago cancelado')}
          />
        </PayPalScriptProvider>
      )}

      {/* FALLBACK */}
      <AnimatePresence>
        {showFallback && (
          <motion.div className="p-4 bg-amber-500/10 border rounded-xl text-amber-300 text-sm">
            MercadoPago falló → usando PayPal
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-500 pt-4 border-t">
        <span><Lock size={10} /> SSL</span>
        <span><Shield size={10} /> Seguro</span>
        <span><CreditCard size={10} /> Sin guardar datos</span>
      </div>

    </div>
  );
}