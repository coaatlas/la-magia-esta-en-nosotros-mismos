'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Lock, CheckCircle, Headphones, Zap, X,
  ChevronDown, ChevronUp, SkipBack, SkipForward,
  Volume2, List, Info
} from 'lucide-react';
import AudioPlayer from '@/app/components/AudioPlayer';
import { useToast } from '@/app/hooks/useToast';

// ============ TIPOS ============

type Chapter = {
  id: string;
  title: string;
  duration: string;
  durationSeconds?: number; // 👈 Nuevo: para cálculos precisos
  src: string;
  isPreview: boolean;
  description?: string; // 👈 Nuevo: para tooltips o expandir
};

type Book = {
  slug: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  price: {
    oneTime: number;
    subscription: number;
  };
  chapters: Chapter[];
  totalDuration?: string; // 👈 Nuevo: para mostrar en hero
};

// ============ COMPONENTE PRINCIPAL ============

export default function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { success, info, error: showError, ToastContainer } = useToast();

  // Estados principales
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ============ DATOS DEL LIBRO ============

  const book: Book = {
    slug: slug,
    title: "La Magia",
    author: "Rhonda Byrne",
    cover: "/covers/lamagia.webp",
    description: "¿Recuerdas cuando eras pequeño y creías que la vida era mágica? Pues bien, la magia de la vida es real, y es mucho más impresionante, imponente y apasionante de lo que jamás imaginaste de niño. Puedes vivir tus sueños, puedes tener todo lo que deseas, ¡y tu vida puede tocar el cielo! Te invito a que me acompañes en un inolvidable viaje de 28 días",
    price: { oneTime: 2999, subscription: 499 },
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
      
      

    ]
  };

  // ============ EFECTOS ============

  // Verificar acceso al montar
  useEffect(() => {
    const checkAccess = () => {
      try {
        const purchased = localStorage.getItem(`purchased_${book.slug}`);
        const subscribed = localStorage.getItem('subscription_active');
        if (purchased || subscribed) {
          setHasAccess(true);
          console.log('✅ Acceso concedido para:', book.slug);
        }
      } catch (e) {
        console.warn('⚠️ Error al verificar acceso:', e);
      }
    };
    checkAccess();
  }, [book.slug]);

  // Actualizar tiempo de reproducción (para sync con UI)
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentPlaybackTime(time);
  }, []);

  // Después de setHasAccess(true) en cualquiera de las funciones:
  setTimeout(() => {
    // Animar los capítulos que antes estaban bloqueados
    const lockedChapters = document.querySelectorAll('[id^="chapter-"]');
    lockedChapters.forEach((el, idx) => {
      const wasLocked = el.querySelector('svg[data-lucide="lock"]'); // o tu selector de candado
      if (wasLocked) {
        el.classList.add('ring-2', 'ring-green-400/50', 'animate-pulse');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-green-400/50', 'animate-pulse');
        }, 2000 + idx * 100);
      }
    });
  }, 500);

  // ============ FUNCIONES DE ACCESO/PAGO ============

  const simulatePayment = async (type: 'oneTime' | 'subscription') => {
    const btn = document.activeElement as HTMLButtonElement;
    if (btn) {
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="animate-pulse">Procesando...</span>';

      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1200));

      try {
        if (type === 'oneTime') {
          localStorage.setItem(`purchased_${book.slug}`, 'true');
        } else {
          localStorage.setItem('subscription_active', 'true');
        }

        // ✅ ACTUALIZAR ESTADO para desbloquear capítulos INMEDIATAMENTE
        setHasAccess(true);


        // Después de setHasAccess(true) en cualquiera de las funciones:
        setTimeout(() => {
          // Animar los capítulos que antes estaban bloqueados
          const lockedChapters = document.querySelectorAll('[id^="chapter-"]');
          lockedChapters.forEach((el, idx) => {
            const wasLocked = el.querySelector('svg[data-lucide="lock"]'); // o tu selector de candado
            if (wasLocked) {
              el.classList.add('ring-2', 'ring-green-400/50', 'animate-pulse');
              setTimeout(() => {
                el.classList.remove('ring-2', 'ring-green-400/50', 'animate-pulse');
              }, 2000 + idx * 100);
            }
          });
        }, 500);


        setShowPaywall(false);
        success('✅ ¡Pago simulado exitoso! Acceso completo desbloqueado.');

        // ❌ ELIMINADA LA REDIRECCIÓN - Ahora se queda en la misma página

      } catch (e) {
        showError('❌ Error al procesar el pago simulado');
        console.error(e);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    }
  };
  const resetAccess = () => {
    try {
      localStorage.removeItem(`purchased_${book.slug}`);
      localStorage.removeItem('subscription_active');
      setHasAccess(false);
      setActiveChapter(null);
      setCurrentPlaybackTime(0);
      info('🔄 Acceso reseteado para testing.');
    } catch (e) {
      console.warn('⚠️ Error al resetear acceso:', e);
    }
  };

  const handleUnlock = () => setShowPaywall(true);

  const onPaymentSuccess = async (paymentType: 'oneTime' | 'subscription') => {
    try {
      if (paymentType === 'oneTime') {
        localStorage.setItem(`purchased_${book.slug}`, 'true');
      } else {
        localStorage.setItem('subscription_active', 'true');
      }

      // ✅ ACTUALIZAR ESTADO para desbloquear capítulos INMEDIATAMENTE
      setHasAccess(true);

      // Después de setHasAccess(true) en cualquiera de las funciones:
      setTimeout(() => {
        // Animar los capítulos que antes estaban bloqueados
        const lockedChapters = document.querySelectorAll('[id^="chapter-"]');
        lockedChapters.forEach((el, idx) => {
          const wasLocked = el.querySelector('svg[data-lucide="lock"]'); // o tu selector de candado
          if (wasLocked) {
            el.classList.add('ring-2', 'ring-green-400/50', 'animate-pulse');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-green-400/50', 'animate-pulse');
            }, 2000 + idx * 100);
          }
        });
      }, 500);

      setShowPaywall(false);
      success('🎉 ¡Bienvenido! Tu audiolibro está listo para escuchar.');

      // ❌ ELIMINADA LA REDIRECCIÓN - Se queda en /libro/[slug]
      // Opcional: hacer scroll suave hacia los capítulos desbloqueados
      setTimeout(() => {
        document.getElementById('catalogo')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 800);

    } catch (e) {
      showError('❌ Error al activar el acceso');
      console.error(e);
    }
  };

  

  // ============ FUNCIONES DE REPRODUCCIÓN ============

  const handlePlayChapter = (chapter: Chapter) => {
    if (chapter.isPreview || hasAccess) {
      setActiveChapter(chapter);
      setIsPlayerExpanded(true);
      setCurrentPlaybackTime(0);

      // Scroll suave hacia el player (solo en desktop)
      if (window.innerWidth >= 768) {
        setTimeout(() => {
          document.getElementById('chapter-player')?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 150);
      }
    } else {
      info('🔒 Desbloqueá el libro para escuchar este capítulo.');
      // Pequeño feedback visual en el capítulo bloqueado
      const chapterEl = document.getElementById(`chapter-${chapter.id}`);
      chapterEl?.classList.add('animate-shake');
      setTimeout(() => chapterEl?.classList.remove('animate-shake'), 500);
    }
  };

  const handleChapterEnd = useCallback(() => {
    // Auto-play siguiente capítulo si tiene acceso
    if (hasAccess && activeChapter) {
      const currentIndex = book.chapters.findIndex(c => c.id === activeChapter.id);
      const nextChapter = book.chapters[currentIndex + 1];

      if (nextChapter && !nextChapter.isPreview) {
        setTimeout(() => {
          setActiveChapter(nextChapter);
          info(`🎧 Reproduciendo: ${nextChapter.title}`);
        }, 2000);
      }
    }
  }, [activeChapter, book.chapters, hasAccess]);

  const handlePreviousChapter = () => {
    if (!activeChapter) return;
    const currentIndex = book.chapters.findIndex(c => c.id === activeChapter.id);
    const prevChapter = book.chapters[currentIndex - 1];

    if (prevChapter && (prevChapter.isPreview || hasAccess)) {
      setActiveChapter(prevChapter);
      setCurrentPlaybackTime(0);
    }
  };

  const handleNextChapter = () => {
    if (!activeChapter) return;
    const currentIndex = book.chapters.findIndex(c => c.id === activeChapter.id);
    const nextChapter = book.chapters[currentIndex + 1];

    if (nextChapter && (nextChapter.isPreview || hasAccess)) {
      setActiveChapter(nextChapter);
      setCurrentPlaybackTime(0);
    } else if (!nextChapter) {
      info('🎉 ¡Has completado el audiolibro!');
    } else {
      info('🔒 Capítulo bloqueado. Desbloqueá el libro para continuar.');
    }
  };

  // ============ UTILIDADES ============

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cents / 100);
  };

  const isDev = process.env.NODE_ENV === 'development';
  const previewChapter = book.chapters.find(c => c.isPreview);

  // ============ RENDER ============

  return (
    <main className="min-h-screen bg-gray-950 text-white relative pb-32">
      <ToastContainer />

      {/* ===== DEV MODE PANEL ===== */}
      {isDev && (
        <div className="fixed top-4 right-4 z-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTestPanel(!showTestPanel)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/90 hover:bg-purple-700 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm border border-purple-400/30 transition"
            aria-expanded={showTestPanel}
            aria-controls="dev-panel"
          >
            <Zap size={12} className="animate-pulse" />
            DEV MODE
            <ChevronDown size={12} className={`transition-transform ${showTestPanel ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>
      )}

      {/* Panel de Testing (animado) */}
      <AnimatePresence>
        {isDev && showTestPanel && (
          <motion.div
            id="dev-panel"
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-16 right-4 z-50 w-80 bg-gray-900/95 border border-purple-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-purple-400 text-sm flex items-center gap-2">
                <Zap size={14} className="animate-pulse" />
                Panel de Testing
              </h4>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowTestPanel(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                aria-label="Cerrar panel"
              >
                <X size={16} />
              </motion.button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Estado actual */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-gray-400 mb-1">Estado de acceso:</p>
                <div className={`flex items-center gap-2 font-medium ${hasAccess ? 'text-green-400' : 'text-red-400'
                  }`}>
                  {hasAccess ? <CheckCircle size={14} /> : <Lock size={14} />}
                  {hasAccess ? '✅ Acceso concedido' : '🔒 Sin acceso'}
                </div>
              </div>

              {/* Acciones de simulación */}
              <div>
                <p className="text-gray-400 mb-2">Simular pago:</p>
                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => simulatePayment('oneTime')}
                    className="w-full px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Zap size={14} />
                    Compra Única ({formatPrice(book.price.oneTime)})
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => simulatePayment('subscription')}
                    className="w-full px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Zap size={14} />
                    Suscripción ({formatPrice(book.price.subscription)}/mes)
                  </motion.button>
                </div>
              </div>

              {/* Debug info */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 font-mono text-[10px]">
                <p className="text-gray-400 mb-1">Debug:</p>
                <p>Slug: <span className="text-purple-400">{book.slug}</span></p>
                <p>Capítulo activo: <span className="text-amber-400">{activeChapter?.title || 'Ninguno'}</span></p>
                <p>Tiempo: <span className="text-green-400">{Math.floor(currentPlaybackTime)}s</span></p>
              </div>

              {/* Reset */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetAccess}
                className="w-full px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-xl text-xs transition border border-red-500/30 flex items-center justify-center gap-2"
              >
                <X size={14} />
                Resetear Acceso
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO SECTION ===== */}
      <section
        className="relative h-[55vh] md:h-[60vh] flex items-end p-6 md:p-8"
        style={{
          backgroundImage: `linear-gradient(to top, #030712 0%, rgba(3,7,18,0.8) 40%, transparent 100%), url(${book.cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundBlendMode: 'multiply'
        }}
      >
        {/* Overlay decorativo */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative max-w-4xl z-10"
        >
          {/* Badge de tipo de contenido */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium mb-4">
            <Headphones size={14} />
            <span>Audiolibro • {book.totalDuration}</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-3 leading-tight">
            {book.title}
          </h1>

          <p className="text-gray-300 text-lg md:text-xl mb-4 font-light">
            por <span className="text-white font-medium">{book.author}</span>
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={14} className="text-green-400" />
              <span>{book.chapters.length} capítulos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Headphones size={14} className="text-amber-400" />
              <span>{book.totalDuration} de contenido</span>
            </div>
            {previewChapter && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                🎧 Preview gratis
              </span>
            )}
          </div>
        </motion.div>
      </section>

      {/* ===== DESCRIPCIÓN ===== */}
      <section className="px-6 md:px-8 py-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert prose-lg max-w-none"
        >
          <p className="text-gray-300 leading-relaxed">
            {book.description}
          </p>
        </motion.div>
      </section>

      {/* ===== PREVIEW DEL PRÓLOGO ===== */}
      <section className="px-6 md:px-8 py-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Play className="text-amber-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {previewChapter?.title || 'Vista Previa'}
              </h3>
              <p className="text-sm text-gray-400">Escuchá gratis antes de decidir</p>
            </div>
          </div>

          <AudioPlayer
            title={previewChapter?.title || 'Preview'}
            chapter="Capítulo de muestra"
            src={previewChapter?.src || ''}
            isPreview={true}
            previewDuration={90}
            skipInterval={15}
            onPreviewEnd={() => {
              info('🔒 Preview finalizado. Desbloqueá el libro para continuar escuchando.');
            }}
            onTimeUpdate={handleTimeUpdate}
            onSpeedChange={setPlaybackSpeed}
          />

          {/* CTA Post-Preview */}
          {!hasAccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/20"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-gray-300 font-medium mb-1">
                    ¿Te gustó lo que escuchaste?
                  </p>
                  <p className="text-sm text-gray-400">
                    Desbloqueá los {book.chapters.length} capítulos completos.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isDev ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => simulatePayment('oneTime')}
                        className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition flex items-center gap-2 text-sm shadow-lg"
                      >
                        <Zap size={16} />
                        Simular Compra
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => simulatePayment('subscription')}
                        className="px-5 py-2.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition border border-white/20 text-sm"
                      >
                        Simular Suscripción
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUnlock}
                        className="px-5 py-2.5 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition text-sm shadow-lg"
                      >
                        Comprar por {formatPrice(book.price.oneTime)}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUnlock}
                        className="px-5 py-2.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition border border-white/20 text-sm"
                      >
                        Suscripción {formatPrice(book.price.subscription)}/mes
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {isDev && (
                <p className="text-[10px] text-purple-400 mt-3 flex items-center gap-1">
                  <Zap size={10} />
                  Modo desarrollo: Pagos simulados • Sin cargo real
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ===== PLAYER DEL CAPÍTULO ACTIVO (EXPANDIDO) ===== */}
      <AnimatePresence>
        {activeChapter && (
          <motion.section
            id="chapter-player"
            initial={{ opacity: 0, height: 0, y: 20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="px-6 md:px-8 py-4 max-w-4xl mx-auto"
          >
            <motion.div
              className="bg-gradient-to-br from-amber-500/10 via-white/5 to-white/5 border border-amber-500/20 rounded-2xl overflow-hidden"
              layout
            >
              {/* Header del player */}
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    animate={{ rotate: isPlayerExpanded ? 360 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="p-2 rounded-lg bg-amber-500/20 flex-shrink-0"
                  >
                    <Headphones className="text-amber-400" size={20} />
                  </motion.div>
                  <div className="min-w-0">
                    <h3 className="text-base md:text-lg font-semibold text-white truncate">
                      {activeChapter.title}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">{book.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Badge de preview si aplica */}
                  {activeChapter.isPreview && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded-full">
                      PREVIEW
                    </span>
                  )}

                  {/* Botón colapsar */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsPlayerExpanded(!isPlayerExpanded);
                      if (isPlayerExpanded) {
                        // Opcional: pausar al colapsar
                        // setActiveChapter(null);
                      }
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition text-gray-400 hover:text-white"
                    title={isPlayerExpanded ? "Colapsar player" : "Expandir player"}
                    aria-label={isPlayerExpanded ? "Colapsar reproductor" : "Expandir reproductor"}
                  >
                    {isPlayerExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </motion.button>
                </div>
              </div>

              {/* Contenido del player */}
              <AnimatePresence mode="wait">
                {isPlayerExpanded ? (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 md:p-6"
                  >
                    <AudioPlayer
                      title={activeChapter.title}
                      chapter={`Capítulo ${book.chapters.findIndex(c => c.id === activeChapter.id) + 1}`}
                      src={activeChapter.src}
                      isPreview={activeChapter.isPreview}
                      previewDuration={90}
                      skipInterval={15}
                      onPreviewEnd={handleChapterEnd}
                      onTimeUpdate={handleTimeUpdate}
                      onSpeedChange={setPlaybackSpeed}
                    />

                    {/* Controles de navegación entre capítulos */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePreviousChapter}
                        disabled={book.chapters.indexOf(activeChapter) === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
                      >
                        <SkipBack size={16} />
                        <span className="hidden sm:inline">Anterior</span>
                      </motion.button>

                      <span className="text-xs text-gray-500">
                        {book.chapters.indexOf(activeChapter) + 1} / {book.chapters.length}
                      </span>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNextChapter}
                        disabled={book.chapters.indexOf(activeChapter) === book.chapters.length - 1}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition text-sm"
                      >
                        <span className="hidden sm:inline">Siguiente</span>
                        <SkipForward size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="compact"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-3 md:p-4"
                  >
                    {/* Mini player con controles básicos */}
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          // Toggle play/pause (lógica simplificada)
                          const audio = document.querySelector(`audio[src="${activeChapter.src}"]`) as HTMLAudioElement;
                          if (audio) {
                            audio.paused ? audio.play() : audio.pause();
                          }
                        }}
                        className="p-3 rounded-full bg-amber-500 hover:bg-amber-600 text-black transition shadow-lg flex-shrink-0"
                        aria-label="Reproducir/Pausar"
                      >
                        <Play size={18} />
                      </motion.button>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{activeChapter.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{activeChapter.duration}</span>
                          {activeChapter.isPreview && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
                              preview
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botones de skip compactos */}
                      {!activeChapter.isPreview && (
                        <div className="flex items-center gap-1">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const audio = document.querySelector(`audio[src="${activeChapter.src}"]`) as HTMLAudioElement;
                              if (audio) {
                                audio.currentTime = Math.max(0, audio.currentTime - 15);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                            title="Retroceder 15s"
                          >
                            <SkipBack size={16} />
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              const audio = document.querySelector(`audio[src="${activeChapter.src}"]`) as HTMLAudioElement;
                              if (audio) {
                                audio.currentTime = Math.min(audio.duration || 9999, audio.currentTime + 15);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition"
                            title="Adelantar 15s"
                          >
                            <SkipForward size={16} />
                          </motion.button>
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

      {/* ===== LISTA DE CAPÍTULOS ===== */}
      <section className="px-6 md:px-8 py-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <List size={24} className="text-amber-400" />
              Contenido
            </h2>
            <span className="text-sm text-gray-400">
              {book.chapters.filter(c => c.isPreview).length} gratis • {book.chapters.filter(c => !c.isPreview).length} premium
            </span>
          </div>

          <div className="space-y-2">
            {book.chapters.map((chapter, idx) => {
              const isPlayable = chapter.isPreview || hasAccess;
              const isActive = activeChapter?.id === chapter.id;
              const chapterNumber = idx + 1;

              return (
                <motion.div
                  id={`chapter-${chapter.id}`}
                  key={chapter.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.03) }}
                  onClick={() => isPlayable && handlePlayChapter(chapter)}
                  className={`group flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${isActive
                    ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                    : isPlayable
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/20'
                      : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-70'
                    }`}
                  role="button"
                  tabIndex={isPlayable ? 0 : -1}
                  aria-disabled={!isPlayable}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isPlayable) handlePlayChapter(chapter);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Número/Icono de estado */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isActive
                      ? 'bg-amber-500/20 text-amber-400'
                      : isPlayable
                        ? 'bg-white/10 text-gray-300 group-hover:bg-amber-500/20 group-hover:text-amber-400'
                        : 'bg-white/5 text-gray-600'
                      }`}>
                      {isActive ? (
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        >
                          <Headphones size={18} />
                        </motion.div>
                      ) : isPlayable ? (
                        <span className="text-sm font-medium">{chapterNumber}</span>
                      ) : (
                        <Lock size={16} />
                      )}
                    </div>

                    {/* Info del capítulo */}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium transition-colors truncate ${isPlayable ? 'text-white group-hover:text-amber-400' : 'text-gray-500'
                        }`}>
                        {chapter.title}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                        <span>{chapter.duration}</span>
                        {chapter.description && (
                          <span className="hidden md:inline text-gray-600">• {chapter.description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges y acciones */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {chapter.isPreview && (
                      <span className="text-[10px] px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                        GRATIS
                      </span>
                    )}
                    {hasAccess && !chapter.isPreview && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + (idx * 0.03) }}
                      >
                        <CheckCircle size={18} className="text-green-400" />
                      </motion.div>
                    )}
                    {isPlayable && !isActive && (
                      <ChevronDown size={18} className="text-gray-500 group-hover:text-amber-400 transition-colors" />
                    )}
                    {!isPlayable && (
                      <span className="text-[10px] text-gray-600">🔒</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CTA final si no tiene acceso */}
          {!hasAccess && book.chapters.some(c => !c.isPreview) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-8 p-6 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent rounded-2xl border border-amber-500/20 text-center"
            >
              <h3 className="text-xl font-bold text-white mb-2">
                ¿Listo para la magia completa?
              </h3>
              <p className="text-gray-400 mb-5 max-w-md mx-auto">
                Desbloqueá los {book.chapters.filter(c => !c.isPreview).length} capítulos premium y transformá tu vida en 28 días.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUnlock}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition shadow-lg shadow-amber-500/25"
                >
                  Obtener Acceso Completo • {formatPrice(book.price.oneTime)}
                </motion.button>
                <button
                  onClick={handleUnlock}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition border border-white/20"
                >
                  Suscripción • {formatPrice(book.price.subscription)}/mes
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ===== FOOTER DECORATIVO ===== */}
      <footer className="px-6 md:px-8 py-12 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} Tu Marca AR • Audiolibros Premium</p>
        <p className="mt-1 text-xs opacity-70">
          La magia está en vos ✨
        </p>
      </footer>

      {/* ===== ESTILOS GLOBALES PARA ANIMACIONES ===== */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </main>
  );
}