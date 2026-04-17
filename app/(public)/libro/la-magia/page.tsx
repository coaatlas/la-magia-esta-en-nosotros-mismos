'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Lock, CheckCircle, Headphones, Zap, X,
  ChevronDown, ChevronUp, SkipBack, SkipForward,
  Volume2, List, Info, CreditCard, Shield, Globe, Loader2, AlertCircle
} from 'lucide-react';
import AudioPlayer from '@/app/components/AudioPlayer';
import { useToast } from '@/app/hooks/useToast';

// PayPal SDK
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

// MercadoPago SDK
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
import Link from 'next/link';

// ============ TIPOS ============
type Chapter = {
  id: string;
  title: string;
  duration: string;
  durationSeconds?: number;
  src: string;
  isPreview: boolean;
  description?: string;
};

type Book = {
  slug: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  price: { oneTime: number };
  chapters: Chapter[];
  totalDuration?: string;
};

type PaymentMethodType = 'mercadopago' | 'paypal' | 'loading';

// ============ UTILIDADES: DETECCIÓN DE PAÍS ============
const MERCADOPAGO_COUNTRIES = ['AR', 'BR', 'CL', 'CO', 'MX', 'PE', 'UY', 'EC'];

async function detectUserCountry(): Promise<{ country: string; useMercadoPago: boolean }> {
  try {
    const response = await fetch('https://ipapi.co/json/', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      const countryCode = data.country_code?.toUpperCase();
      return { country: countryCode || 'US', useMercadoPago: MERCADOPAGO_COUNTRIES.includes(countryCode) };
    }
  } catch (e) { console.warn('⚠️ Geolocalización falló:', e); }
  try {
    const locale = navigator.language || (navigator as any).userLanguage;
    const countryCode = locale.split('-')[1]?.toUpperCase() || locale.slice(0, 2).toUpperCase();
    return { country: countryCode, useMercadoPago: MERCADOPAGO_COUNTRIES.includes(countryCode) };
  } catch { return { country: 'AR', useMercadoPago: true }; }
}

function usePaymentMethod() {
  const [paymentMethod, setPaymentMethod] = useState<{ type: PaymentMethodType; country: string }>({ type: 'loading', country: 'AR' });
  useEffect(() => {
    let mounted = true;
    detectUserCountry().then(({ country, useMercadoPago }) => { if (mounted) setPaymentMethod({ type: useMercadoPago ? 'mercadopago' : 'paypal', country }); });
    return () => { mounted = false; };
  }, []);
  return paymentMethod;
}

// ============ COMPONENTE DE PAGO INLINE (SOLO PAGO ÚNICO) ============
function InlinePaymentGateway({
  amount, currency, description, onPaymentSuccess, onPaymentError, bookSlug
}: {
  amount: number; currency: string; description: string;
  onPaymentSuccess: () => Promise<void>;
  onPaymentError?: (error: Error) => void;
  bookSlug: string;
}) {
  const { success, error: showError } = useToast();
  const paymentMethod = usePaymentMethod();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMpFallback, setShowMpFallback] = useState(false);

  useEffect(() => {
    if (paymentMethod.type === 'mercadopago') {
      initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '', {
        locale: paymentMethod.country === 'BR' ? 'pt-BR' : 'es-AR'
      });
    }
  }, [paymentMethod]);

  const createMercadoPagoPreference = useCallback(async () => {
    try {
      const PRICE_USD = 10.00;
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: description, priceUSD: PRICE_USD, bookSlug })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        showError(err.detail || 'Error al crear preferencia');
        setShowMpFallback(true);
        return null;
      }
      const { preferenceId, initPoint } = await response.json();
      if (initPoint) window.location.href = initPoint;
      return preferenceId;
    } catch (err: any) {
      console.error('❌ Error MP:', err);
      showError('Error con MercadoPago');
      setShowMpFallback(true);
      return null;
    }
  }, [description, bookSlug, showError]);

  const handlePaymentComplete = async (provider: 'mercadopago' | 'paypal', paymentData: any) => {
    try {
      setIsProcessing(true);
      const endpoint = provider === 'mercadopago' ? '/api/mercadopago/webhook' : '/api/paypal/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: paymentData.payment_id || paymentData.orderID, status: paymentData.status, bookSlug })
      });
      if (response.ok) {
        // 🔑 ACCESO POR PAGO ÚNICO
        localStorage.setItem(`purchased_${bookSlug}`, 'true');
        await onPaymentSuccess();
        success(`🎉 ¡Pago exitoso con ${provider === 'mercadopago' ? 'MercadoPago' : 'PayPal'}!`);
      } else throw new Error('Verificación fallida');
    } catch (err) {
      console.error(`Error verificando pago ${provider}:`, err);
      showError('Hubo un problema confirmando tu pago. Contactanos.');
      onPaymentError?.(err as Error);
    } finally { setIsProcessing(false); }
  };

  const isSandbox = false;
  const handleSandboxSuccess = async () => {
    await new Promise(r => setTimeout(r, 1500));
    localStorage.setItem(`purchased_${bookSlug}`, 'true');
    await onPaymentSuccess();
    success('🧪 [SANDBOX] Pago simulado exitoso');
  };

  const formatAmount = () => {
    const displayAmount = currency === 'USD' ? 10.00 * 1000 : amount / 100;
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(displayAmount);
  };

  if (paymentMethod.type === 'loading') {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-amber-400" size={24} />
        <span className="ml-3 text-gray-400 text-sm">Detectando método de pago...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Globe size={12} />
        <span>Método para tu región ({paymentMethod.country}): <strong className="text-blue-400">{paymentMethod.type === 'mercadopago' ? 'MercadoPago' : 'PayPal'}</strong></span>
      </motion.div>

      {isSandbox && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-purple-500/20 border border-purple-500/40 rounded-xl">
          <div className="flex items-center gap-2 text-purple-300 text-xs mb-2"><Zap size={12} className="animate-pulse" /><span>Modo Desarrollo • Pagos Simulados</span></div>
          <button onClick={handleSandboxSuccess} disabled={isProcessing} className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2">
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />} Simular Pago Exitoso ({formatAmount()})
          </button>
        </motion.div>
      )}

      {!isSandbox && paymentMethod.type === 'mercadopago' && !showMpFallback && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-blue-400 text-sm mb-2"><Shield size={14} /><span>Pago seguro con MercadoPago</span></div>
            <p className="text-xs text-gray-400">Aceptamos todas las tarjetas, efectivo en rapipago/pago fácil, y transferencia.</p>
          </div>
          <div className="flex justify-center">
            <button onClick={async () => { const pid = await createMercadoPagoPreference(); if (pid) window.location.href = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${pid}`; }} disabled={isProcessing} className="w-full py-3 bg-[#009EE3] hover:bg-[#0088cc] disabled:opacity-50 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg">
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />} Pagar con MercadoPago • {formatAmount()}
            </button>
          </div>
          <button onClick={() => setShowMpFallback(true)} className="w-full py-2 text-xs text-blue-400 hover:text-blue-300 underline flex items-center justify-center gap-1"><AlertCircle size={12} /> ¿Problemas? Abrir checkout en nueva ventana</button>
        </motion.div>
      )}

      {!isSandbox && paymentMethod.type === 'paypal' && (
        <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: 'USD' }}>
          <PayPalButtons style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }} createOrder={async () => { const res = await fetch('/api/paypal/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amount / 100, currency: 'USD', description }) }); const d = await res.json(); return d.orderID; }} onApprove={async (data, actions) => { const details = await actions.order?.capture(); await handlePaymentComplete('paypal', { orderID: data.orderID, status: details?.status }); }} onError={(err) => { console.error(err); showError('❌ Error en PayPal. Intentá nuevamente o usá otro método.'); }} />
        </PayPalScriptProvider>
      )}

      <AnimatePresence>
        {showMpFallback && paymentMethod.type === 'mercadopago' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-start gap-3"><AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} /><div><p className="text-sm text-amber-300 font-medium mb-2">¿Problemas con MercadoPago?</p><p className="text-xs text-gray-400 mb-3">Podés intentar con PayPal como método alternativo.</p><button onClick={() => window.location.reload()} className="text-xs text-amber-400 hover:text-amber-300 underline flex items-center gap-1">Intentar con PayPal <Globe size={10} /></button></div></div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10 text-[10px] text-gray-500">
        <div className="flex items-center gap-1"><Lock size={10} /><span>SSL Encriptado</span></div>
        <div className="flex items-center gap-1"><Shield size={10} /><span>{paymentMethod.type === 'mercadopago' ? 'MercadoPago' : 'PayPal'} Protegido</span></div>
        <div className="flex items-center gap-1"><CreditCard size={10} /><span>Sin almacenamos tus datos</span></div>
      </div>
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============
export default function BookDetailPage() {
  // 🔑 SLUG HARDCODEADO PARA RUTA ESTÁTICA
  const slug = 'la-magia';
  
  const { success, info, error: showError, ToastContainer } = useToast();
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ============ 📚 DATOS: LA MAGIA ============
  const book: Book = {
    slug: slug,
    title: "La Magia",
    author: "Rhonda Byrne",
    cover: "/covers/lamagia.webp",
    description: "¿Recuerdas cuando eras pequeño y creías que la vida era mágica? Pues bien, la magia de la vida es real, y es mucho más impresionante, imponente y apasionante de lo que jamás imaginaste de niño. Puedes vivir tus sueños, puedes tener todo lo que deseas, ¡y tu vida puede tocar el cielo! Te invito a que me acompañes en un inolvidable viaje de 28 días",
    price: { oneTime: 1000 },
    totalDuration: "2h 14min",
    chapters: [
      { id: 'palabras-iniciales', title: 'Una palabra', duration: '3:39', durationSeconds: 219, src: '/audios/0_una-palabra.mp3', isPreview: true, description: 'Introducción al poder de la gratitud' },
      { id: 'prologo', title: '¿CREES EN LA MAGIA?', duration: '3:39', durationSeconds: 219, src: '/audios/1_que-es-la-magia.mp3', isPreview: true, description: 'Introducción al poder de la gratitud' },
      { id: 'cap1', title: 'La Revelación de un Gran Misterio', duration: '7:04', durationSeconds: 424, src: '/audios/2.1_la-revelacion-de-un-gran-misterio.mp3', isPreview: false },
      { id: 'cap2', title: 'Incorpora la Magia en tu Vida', duration: '5:32', durationSeconds: 332, src: '/audios/3_incorpora-la-magia-en.tu-vida.mp3', isPreview: false },
      { id: 'cap3', title: 'Un Libro Mágico', duration: '6:39', durationSeconds: 399, src: '/audios/4_un-libro-magivo.mp3', isPreview: false },
      { id: 'cap4', title: 'Día 1 - Enumera tus Bendiciones', duration: '6:39', durationSeconds: 399, src: '/audios/5_dia-1.mp3', isPreview: false },
      { id: 'cap5', title: 'Día 2 - La Piedra Mágica', duration: '4:59', durationSeconds: 299, src: '/audios/6_dia-2.mp3', isPreview: false },
      { id: 'cap6', title: 'Día 3 - Relaciones Mágicas', duration: '6:02', durationSeconds: 362, src: '/audios/7_dia-3.mp3', isPreview: false },
      { id: 'cap7', title: 'Día 4 - Salud Mágica', duration: '6:05', durationSeconds: 365, src: '/audios/8_dia-4.mp3', isPreview: false },
      { id: 'cap8', title: 'Día 5 - Dinero Mágico', duration: '4:59', durationSeconds: 299, src: '/audios/9_dia-5.mp3', isPreview: false },
      { id: 'cap9', title: 'Día 6 - Así Trabaja la Magia', duration: '2:51', durationSeconds: 171, src: '/audios/10_dia-6.mp3', isPreview: false },
      { id: 'cap10', title: 'Día 7 - Superación de la Negatividad', duration: '4:20', durationSeconds: 260, src: '/audios/11_dia-7.mp3', isPreview: false },
      { id: 'cap11', title: 'Día 8 - El Ingrediente Mágico', duration: '4:20', durationSeconds: 260, src: '/audios/12_dia-8.mp3', isPreview: false },
      { id: 'cap12', title: 'Día 9 - El Imán del Dinero', duration: '8:30', durationSeconds: 510, src: '/audios/13_dia-9.mp3', isPreview: false },
      { id: 'cap13', title: 'Día 10 - Polvos Mágicos para Todos', duration: '8:54', durationSeconds: 534, src: '/audios/14_dia-10.mp3', isPreview: false },
      { id: 'cap14', title: 'Día 11 - Una Mañana Mágica', duration: '7:16', durationSeconds: 436, src: '/audios/15_dia-11.mp3', isPreview: false },
      { id: 'cap15', title: 'Día 12 - Personas Mágicas Importantes', duration: '4:45', durationSeconds: 285, src: '/audios/16_dia-12.mp3', isPreview: false },
      { id: 'cap16', title: 'Día 13 - Haz realidad tus deseos', duration: '6:11', durationSeconds: 371, src: '/audios/17_dia-13.mp3', isPreview: false },
      { id: 'cap17', title: 'Día 14 - Que tengas un día mágico', duration: '4:51', durationSeconds: 291, src: '/audios/18_dia-14.mp3', isPreview: false },
      { id: 'cap18', title: 'Día 15 - Sana Mágicamente Tus Relaciones', duration: '5:22', durationSeconds: 322, src: '/audios/19_dia-15.mp3', isPreview: false },
      { id: 'cap19', title: 'Día 16 - Magia y Milagros en la Salud', duration: '5:47', durationSeconds: 322, src: '/audios/20_dia-16.mp3', isPreview: false },
      { id: 'cap20', title: 'Día 17 - El cheque mágico', duration: '6:26', durationSeconds: 386, src: '/audios/21_dia-17.mp3', isPreview: false },
      { id: 'cap21', title: 'Día 18 - La Lista Mágica de Tareas Pendientes', duration: '4:30', durationSeconds: 270, src: '/audios/22_dia-18.mp3', isPreview: false },
      { id: 'cap22', title: 'Día 19 - Pasos Mágicos', duration: '2:44', durationSeconds: 164, src: '/audios/23_dia-19.mp3', isPreview: false },
      { id: 'cap23', title: 'Día 20 - La Magia del Corazón', duration: '3:48', durationSeconds: 228, src: '/audios/24_dia-20.mp3', isPreview: false },
      { id: 'cap24', title: 'Día 21 - Magníficos Resultados', duration: '5:15', durationSeconds: 315, src: '/audios/25_dia-21.mp3', isPreview: false },
      { id: 'cap25', title: 'Día 22 - Ante tus propios ojos', duration: '5:15', durationSeconds: 315, src: '/audios/26_dia-22.mp3', isPreview: false },
      { id: 'cap26', title: 'Día 23 - El aire mágico que respiras', duration: '4:26', durationSeconds: 266, src: '/audios/27_dia-23.mp3', isPreview: false },
      { id: 'cap27', title: 'Día 24 - La Varita Mágica', duration: '4:45', durationSeconds: 285, src: '/audios/28_dia-24.mp3', isPreview: false },
      { id: 'cap28', title: 'Día 25 - Sigue las indicaciones de la magia', duration: '5:03', durationSeconds: 303, src: '/audios/29_dia-25.mp3', isPreview: false },
      { id: 'cap29', title: 'Día 26 - Transforma mágicamente los errores en bendiciones', duration: '4:30', durationSeconds: 270, src: '/audios/31-1_dia-26.mp3', isPreview: false },
      { id: 'cap30', title: 'Día 27 - El espejo mágico', duration: '4:30', durationSeconds: 270, src: '/audios/32_dia-27.mp3', isPreview: false },
      { id: 'cap31', title: 'Día 28 - Recuerda la Magia del Amor', duration: '4:30', durationSeconds: 270, src: '/audios/1-dia28.mp3', isPreview: false },   
      { id: 'cap32', title: 'Día 29 - Recordar las bendiciones', duration: '4:30', durationSeconds: 270, src: '/audios/3-dia28.mp3', isPreview: false },
      { id: 'cap33', title: 'Día 30 - No hay un numero fijo de bendiciones', duration: '4:30', durationSeconds: 270, src: '/audios/4-dia28.mp3', isPreview: false },
      { id: 'cap34', title: 'Día 31 - ejercicios Dia 28', duration: '4:30', durationSeconds: 270, src: '/audios/5-dia28.mp3', isPreview: false },
      { id: 'cap35', title: 'Día 32 - Tu futuro mágico', duration: '4:30', durationSeconds: 270, src: '/audios/6-dia29.mp3', isPreview: false },
      { id: 'cap36', title: 'Día 33 - Tus polvos mágicos', duration: '4:30', durationSeconds: 270, src: '/audios/7-dia30.mp3', isPreview: false },
    ]
  };

  // ============ EFECTOS ============
  useEffect(() => {
    const checkAccess = () => {
      try {
        // 🔑 SOLO CHEQUEA PAGO ÚNICO
        const purchased = localStorage.getItem(`purchased_${slug}`);
        if (purchased) {
          setHasAccess(true);
          console.log(`✅ Acceso concedido para: ${slug}`);
        }
      } catch (e) { console.warn('⚠️ Error al verificar acceso:', e); }
    };
    checkAccess();
  }, [slug]);

  const handleTimeUpdate = useCallback((time: number) => setCurrentPlaybackTime(time), []);

  useEffect(() => {
    if (hasAccess) {
      const timer = setTimeout(() => {
        const lockedChapters = document.querySelectorAll('[id^="chapter-"]');
        lockedChapters.forEach((el, idx) => {
          const wasLocked = el.querySelector('svg[data-lucide="lock"]');
          if (wasLocked) {
            el.classList.add('ring-2', 'ring-green-400/50', 'animate-pulse');
            setTimeout(() => el.classList.remove('ring-2', 'ring-green-400/50', 'animate-pulse'), 2000 + idx * 100);
          }
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasAccess]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success' && !hasAccess) {
      console.log('✅ Pago exitoso detectado, otorgando acceso...');
      localStorage.setItem(`purchased_${slug}`, 'true');
      setHasAccess(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      success('🎉 ¡Pago confirmado! Acceso desbloqueado.');
      setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
    }
  }, [slug, hasAccess, success]);

  // ============ FUNCIONES DE ACCESO/PAGO ============
  const simulatePayment = async () => {
    const btn = document.activeElement as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="animate-pulse">Procesando...</span>';
      await new Promise(resolve => setTimeout(resolve, 1200));
      try {
        localStorage.setItem(`purchased_${slug}`, 'true');
        setHasAccess(true);
        setShowPaywall(false);
        success(`✅ ¡Pago simulado exitoso! Acceso desbloqueado para "${book.title}".`);
      } catch (e) { showError('❌ Error al procesar el pago simulado'); console.error(e); }
      finally { if (btn) { btn.disabled = false; btn.innerHTML = originalText; } }
    }
  };

  const resetAccess = () => {
    try {
      localStorage.removeItem(`purchased_${slug}`);
      setHasAccess(false);
      setActiveChapter(null);
      setCurrentPlaybackTime(0);
      info(`🔄 Acceso reseteado para "${book.title}".`);
    } catch (e) { console.warn('⚠️ Error al resetear acceso:', e); }
  };

  const handleUnlock = () => setShowPaywall(true);

  const onPaymentSuccess = async () => {
    try {
      localStorage.setItem(`purchased_${slug}`, 'true');
      setHasAccess(true);
      setShowPaywall(false);
      success('🎉 ¡Bienvenido! Tu audiolibro está listo para escuchar.');
      setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 800);
    } catch (e) { showError('❌ Error al activar el acceso'); console.error(e); }
  };

  // ============ FUNCIONES DE REPRODUCCIÓN ============
  const handlePlayChapter = (chapter: Chapter) => {
    if (chapter.isPreview || hasAccess) {
      setActiveChapter(chapter);
      setIsPlayerExpanded(true);
      setCurrentPlaybackTime(0);
      if (window.innerWidth >= 768) setTimeout(() => document.getElementById('chapter-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    } else {
      info('🔒 Desbloqueá el libro para escuchar este capítulo.');
      const chapterEl = document.getElementById(`chapter-${chapter.id}`);
      chapterEl?.classList.add('animate-shake');
      setTimeout(() => chapterEl?.classList.remove('animate-shake'), 500);
    }
  };

  const handleChapterEnd = useCallback(() => {
    if (hasAccess && activeChapter) {
      const currentIndex = book.chapters.findIndex(c => c.id === activeChapter.id);
      const nextChapter = book.chapters[currentIndex + 1];
      if (nextChapter && !nextChapter.isPreview) {
        setTimeout(() => { setActiveChapter(nextChapter); info(`🎧 Reproduciendo: ${nextChapter.title}`); }, 2000);
      }
    }
  }, [activeChapter, book.chapters, hasAccess]);

  const handlePreviousChapter = () => {
    if (!activeChapter) return;
    const currentIndex = book.chapters.findIndex(c => c.id === activeChapter.id);
    const prevChapter = book.chapters[currentIndex - 1];
    if (prevChapter && (prevChapter.isPreview || hasAccess)) { setActiveChapter(prevChapter); setCurrentPlaybackTime(0); }
  };

  const handleNextChapter = () => {
    if (!activeChapter) return;
    const currentIndex = book.chapters.findIndex(c => c.id === activeChapter.id);
    const nextChapter = book.chapters[currentIndex + 1];
    if (nextChapter && (nextChapter.isPreview || hasAccess)) { setActiveChapter(nextChapter); setCurrentPlaybackTime(0); }
    else if (!nextChapter) info('🎉 ¡Has completado el audiolibro!');
    else info('🔒 Capítulo bloqueado. Desbloqueá el libro para continuar.');
  };

  const formatPrice = (cents: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(cents / 100);
  const isDev = process.env.NODE_ENV === 'development';
  const previewChapter = book.chapters.find(c => c.isPreview);

  // ============ RENDER ============
  return (
    <main className="min-h-screen bg-gray-950 text-white relative pb-32">
      <ToastContainer />
      
      {/* DEV MODE PANEL */}
      {isDev && (
        <div className="fixed top-4 right-4 z-50">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowTestPanel(!showTestPanel)} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/90 hover:bg-purple-700 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm border border-purple-400/30 transition">
            <Zap size={12} className="animate-pulse" /> DEV MODE <ChevronDown size={12} className={`transition-transform ${showTestPanel ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>
      )}

      <AnimatePresence>
        {isDev && showTestPanel && (
          <motion.div id="dev-panel" initial={{ opacity: 0, x: 100, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 100, scale: 0.95 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed top-16 right-4 z-50 w-80 bg-gray-900/95 border border-purple-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-purple-400 text-sm flex items-center gap-2"><Zap size={14} className="animate-pulse" /> Panel de Testing</h4>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowTestPanel(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"><X size={16} /></motion.button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-gray-400 mb-1">Estado de acceso:</p>
                <div className={`flex items-center gap-2 font-medium ${hasAccess ? 'text-green-400' : 'text-red-400'}`}>{hasAccess ? <CheckCircle size={14} /> : <Lock size={14} />} {hasAccess ? '✅ Acceso concedido' : '🔒 Sin acceso'}</div>
              </div>
              <div>
                <p className="text-gray-400 mb-2">Simular pago:</p>
                <div className="space-y-2">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={simulatePayment} className="w-full px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"><Zap size={14} /> Simular Compra ({formatPrice(book.price.oneTime)})</motion.button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 font-mono text-[10px]">
                <p className="text-gray-400 mb-1">Debug:</p>
                <p>Slug: <span className="text-purple-400">{slug}</span></p>
                <p>Capítulo activo: <span className="text-amber-400">{activeChapter?.title || 'Ninguno'}</span></p>
                <p>Tiempo: <span className="text-green-400">{Math.floor(currentPlaybackTime)}s</span></p>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={resetAccess} className="w-full px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl text-xs transition border border-red-500/30 flex items-center justify-center gap-2"><X size={14} /> Resetear Acceso</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section className="relative h-[55vh] md:h-[60vh] flex items-end p-6 md:p-8" style={{ backgroundImage: `linear-gradient(to top, #030712 0%, rgba(3,7,18,0.8) 40%, transparent 100%), url(${book.cover})`, backgroundSize: 'cover', backgroundPosition: 'center 30%', backgroundBlendMode: 'multiply' }}>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="relative max-w-4xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium mb-4"><Headphones size={14} /><span>Audiolibro • {book.totalDuration}</span></div>
          <h1 className="text-4xl md:text-6xl font-bold mb-3 leading-tight">{book.title}</h1>
          <p className="text-gray-300 text-lg md:text-xl mb-4 font-light">por <span className="text-white font-medium">{book.author}</span></p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-400" /><span>{book.chapters.length} capítulos</span></div>
            <div className="flex items-center gap-1.5"><Headphones size={14} className="text-amber-400" /><span>{book.totalDuration} de contenido</span></div>
            {previewChapter && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">🎧 Preview gratis</span>}
            <Link href="/" className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">Volver</Link>
          </div>
        </motion.div>
      </section>

      {/* DESCRIPCIÓN */}
      <section className="px-6 md:px-8 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="prose prose-invert prose-lg max-w-none">
          <p className="text-gray-300 leading-relaxed">{book.description}</p>
        </motion.div>
      </section>

      {/* PREVIEW */}
      <section className="px-6 md:px-8 py-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-5"><div className="p-2 rounded-lg bg-amber-500/20"><Play className="text-amber-400" size={20} /></div><div><h3 className="text-lg font-semibold text-white">{previewChapter?.title || 'Vista Previa'}</h3><p className="text-sm text-gray-400">Escuchá gratis antes de decidir</p></div></div>
          <AudioPlayer title={previewChapter?.title || 'Preview'} chapter="Capítulo de muestra" src={previewChapter?.src || ''} isPreview={true} previewDuration={90} skipInterval={15} onPreviewEnd={() => info('🔒 Preview finalizado. Desbloqueá el libro para continuar escuchando.')} onTimeUpdate={handleTimeUpdate} onSpeedChange={setPlaybackSpeed} />
          {!hasAccess && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/20">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div><p className="text-gray-300 font-medium mb-1">¿Te gustó lo que escuchaste?</p><p className="text-sm text-gray-400">Desbloqueá los {book.chapters.length} capítulos completos.</p></div>
                <div className="flex flex-wrap gap-3">
                  {isDev ? (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={simulatePayment} className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition flex items-center gap-2 text-sm shadow-lg"><Zap size={16} /> Simular Compra</motion.button>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleUnlock} className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-sm shadow-lg flex items-center gap-2"><CreditCard size={16} /> {formatPrice(book.price.oneTime)} • Pago único</motion.button>
                  )}
                </div>
              </div>
              {isDev && <p className="text-[10px] text-purple-400 mt-3 flex items-center gap-1"><Zap size={10} /> Modo desarrollo: Pagos simulados • Sin cargo real</p>}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* PLAYER */}
      <AnimatePresence>
        {activeChapter && (
          <motion.section id="chapter-player" initial={{ opacity: 0, height: 0, y: 20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="px-6 md:px-8 py-4 max-w-4xl mx-auto">
            <motion.div className="bg-gradient-to-br from-amber-500/10 via-white/5 to-white/5 border border-amber-500/20 rounded-2xl overflow-hidden" layout>
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div animate={{ rotate: isPlayerExpanded ? 360 : 0 }} transition={{ duration: 0.5 }} className="p-2 rounded-lg bg-amber-500/20 flex-shrink-0"><Headphones className="text-amber-400" size={20} /></motion.div>
                  <div className="min-w-0"><h3 className="text-base md:text-lg font-semibold text-white truncate">{activeChapter.title}</h3><p className="text-sm text-gray-400 truncate">{book.title}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  {activeChapter.isPreview && <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full">PREVIEW</span>}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsPlayerExpanded(!isPlayerExpanded)} className="p-2 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-white">{isPlayerExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</motion.button>
                </div>
              </div>
              <AnimatePresence mode="wait">
                {isPlayerExpanded ? (
                  <motion.div key="expanded" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 md:p-6">
                    <AudioPlayer title={activeChapter.title} chapter={`Capítulo ${book.chapters.findIndex(c => c.id === activeChapter.id) + 1}`} src={activeChapter.src} isPreview={activeChapter.isPreview} previewDuration={90} skipInterval={15} onPreviewEnd={handleChapterEnd} onTimeUpdate={handleTimeUpdate} onSpeedChange={setPlaybackSpeed} />
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handlePreviousChapter} disabled={book.chapters.indexOf(activeChapter) === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"><SkipBack size={16} /><span className="hidden sm:inline">Anterior</span></motion.button>
                      <span className="text-xs text-gray-500">{book.chapters.indexOf(activeChapter) + 1} / {book.chapters.length}</span>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleNextChapter} disabled={book.chapters.indexOf(activeChapter) === book.chapters.length - 1} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"><span className="hidden sm:inline">Siguiente</span><SkipForward size={16} /></motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="compact" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { const audio = document.querySelector(`audio[src="${activeChapter.src}"]`) as HTMLAudioElement; if (audio) audio.paused ? audio.play() : audio.pause(); }} className="p-3 rounded-full bg-amber-500 hover:bg-amber-600 text-black transition shadow-lg flex-shrink-0"><Play size={18} /></motion.button>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{activeChapter.title}</p><div className="flex items-center gap-2 text-xs text-gray-400"><span>{activeChapter.duration}</span>{activeChapter.isPreview && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">preview</span>}</div></div>
                      {!activeChapter.isPreview && (
                        <div className="flex items-center gap-1">
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { const audio = document.querySelector(`audio[src="${activeChapter.src}"]`) as HTMLAudioElement; if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><SkipBack size={16} /></motion.button>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => { const audio = document.querySelector(`audio[src="${activeChapter.src}"]`) as HTMLAudioElement; if (audio) audio.currentTime = Math.min(audio.duration || 9999, audio.currentTime + 15); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><SkipForward size={16} /></motion.button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* LISTA DE CAPÍTULOS */}
      <section className="px-6 md:px-8 py-8 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold flex items-center gap-2"><List size={24} className="text-amber-400" /> Contenido</h2><span className="text-sm text-gray-400">{book.chapters.filter(c => c.isPreview).length} gratis • {book.chapters.filter(c => !c.isPreview).length} premium</span></div>
          <div className="space-y-2">
            {book.chapters.map((chapter, idx) => {
              const isPlayable = chapter.isPreview || hasAccess;
              const isActive = activeChapter?.id === chapter.id;
              const chapterNumber = idx + 1;
              return (
                <motion.div id={`chapter-${chapter.id}`} key={chapter.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + (idx * 0.03) }} onClick={() => isPlayable && handlePlayChapter(chapter)} className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${isActive ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30' : isPlayable ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/20' : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-70'}`} role="button" tabIndex={isPlayable ? 0 : -1} aria-disabled={!isPlayable} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isPlayable) handlePlayChapter(chapter); } }}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-amber-500/20 text-amber-400' : isPlayable ? 'bg-white/10 text-gray-300 group-hover:bg-amber-500/20 group-hover:text-amber-400' : 'bg-white/5 text-gray-600'}`}>
                      {isActive ? <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}><Headphones size={18} /></motion.div> : isPlayable ? <span className="text-sm font-medium">{chapterNumber}</span> : <Lock size={16} />}
                    </div>
                    <div className="min-w-0 flex-1"><p className={`font-medium transition-colors truncate ${isPlayable ? 'text-white group-hover:text-amber-400' : 'text-gray-500'}`}>{chapter.title}</p><div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5"><span>{chapter.duration}</span>{chapter.description && <span className="hidden md:inline text-gray-600">• {chapter.description}</span>}</div></div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {chapter.isPreview && <span className="text-[10px] px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full font-medium">GRATIS</span>}
                    {hasAccess && !chapter.isPreview && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + (idx * 0.03) }}><CheckCircle size={18} className="text-green-400" /></motion.div>}
                    {isPlayable && !isActive && <ChevronDown size={18} className="text-gray-500 group-hover:text-amber-400 transition-colors" />}
                    {!isPlayable && <span className="text-[10px] text-gray-600">🔒</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {!hasAccess && book.chapters.some(c => !c.isPreview) && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="mt-8 p-6 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent rounded-2xl border border-amber-500/20 text-center">
              <h3 className="text-xl font-bold text-white mb-2">¿Listo para la magia completa?</h3>
              <p className="text-gray-400 mb-5 max-w-md mx-auto">Desbloqueá los {book.chapters.filter(c => !c.isPreview).length} capítulos premium y transformá tu vida en 28 días.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleUnlock} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition shadow-lg shadow-amber-500/25 flex items-center gap-2"><CreditCard size={18} /> Obtener Acceso • {formatPrice(book.price.oneTime)}</motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* PAYWALL MODAL - SOLO PAGO ÚNICO */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setShowPaywall(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Compra Única</h3>
                  <p className="text-gray-400 text-sm">{book.title}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowPaywall(false)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"><X size={20} /></motion.button>
              </div>
              <div className="p-4 bg-white/5 rounded-xl mb-6">
                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Producto:</span><span className="text-white">{book.title}</span></div>
                <div className="flex justify-between text-sm mb-2"><span className="text-gray-400">Plan:</span><span className="text-white">Acceso de por vida</span></div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-white/10"><span className="text-gray-300">Total:</span><span className="text-amber-400">{formatPrice(book.price.oneTime)}</span></div>
              </div>
              <InlinePaymentGateway 
                amount={book.price.oneTime} 
                currency="ARS" 
                description={`Audiolibro: ${book.title} - Compra única`} 
                onPaymentSuccess={onPaymentSuccess} 
                onPaymentError={(err) => { console.error('Payment error:', err); setShowPaywall(false); }} 
                bookSlug={slug} 
              />
              <p className="text-[10px] text-gray-500 text-center mt-4">Al continuar, aceptás nuestros <a href="/terminos" className="text-amber-400 hover:underline">Términos</a> y <a href="/privacidad" className="text-amber-400 hover:underline">Política de Privacidad</a>.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="px-6 md:px-8 py-12 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} La Magia de la Gratitud • Audiolibros</p>
        <p className="mt-1 text-xs opacity-70">La magia está en vos ✨</p>
      </footer>

      <style jsx global>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } } .animate-shake { animation: shake 0.3s ease-in-out; }`}</style>
    </main>
  );
}