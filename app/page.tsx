// src/app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Headphones, Sparkles, Search, Filter, ChevronRight, 
  Play, Clock, Star, Zap, BookOpen, TrendingUp,
  Heart, Infinity as InfinityIcon
} from 'lucide-react';

// ============ TIPOS ============

type Book = {
  slug: string;
  title: string;
  author: string;
  cover: string;
  description: string;
  duration?: string;
  chapters?: number;
  rating?: number;
  isNew?: boolean;
  isPopular?: boolean;
  price?: {
    oneTime: number;
    subscription: number;
  };
  tags?: string[];
};

// ============ DATOS ============

const books: Book[] = [
  {
    slug: 'la-magia',
    title: 'La Magia',
    author: 'Rhonda Byrne',
    cover: '/covers/lamagia.webp',
    description: '¿Recuerdas cuando eras pequeño y creías que la vida era mágica? La magia de la vida es real, y es mucho más impresionante de lo que jamás imaginaste. Un viaje de 28 días para transformar tu vida.',
    duration: '2h 14min',
    chapters: 28,
    rating: 4.9,
    isPopular: true,
    price: { oneTime: 2999, subscription: 499 },
    tags: ['Desarrollo Personal', 'Gratitud', 'Bestseller'],
  },
  {
    slug: 'otro-libro',
    title: 'Otro Libro Increíble',
    author: 'Otro Autor',
    cover: '/covers/otro.jpg',
    description: 'Descripción del segundo libro que captura la atención desde el primer capítulo y te lleva en un viaje inolvidable.',
    duration: '3h 45min',
    chapters: 15,
    rating: 4.7,
    isNew: true,
    price: { oneTime: 1999, subscription: 399 },
    tags: ['Ficción', 'Aventura'],
  },
];

// ============ COMPONENTES AUXILIARES ============

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'popular' | 'new' | 'premium' }) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    popular: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    new: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    premium: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{value.toFixed(1)}</span>
    </div>
  );
}

function BookCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          <div className="flex gap-2 pt-2">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE AUXILIAR: Partículas con posiciones fijas (evita hydration mismatch)
// ============================================================================

function ParticlesStars({ count = 20, darkMode }: { count?: number; darkMode: boolean }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    top: number;
    left: number;
    duration: number;
    delay: number;
    size: number;
  }>>([]);
  
  // Generar partículas SOLO en cliente después del mount
  useEffect(() => {
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 2,
      size: Math.random() > 0.7 ? 2 : 1,
    }));
    setParticles(generated);
  }, [count]);

  // Renderizado inicial vacío = compatible con SSR
  if (particles.length === 0) return null;

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-300/60"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.4, 1, 0.4],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}
// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Detectar modo oscuro del sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setDarkMode(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  // Simular carga inicial
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filtrar libros
  const filteredBooks = books.filter((book) => {
    const matchesSearch = 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag ? book.tags?.includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  });

  // Obtener tags únicos para filtro
  const allTags = Array.from(new Set(books.flatMap((b) => b.tags || [])));

  // Formatear precio
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Animaciones para framer-motion
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <main className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-950 text-white' : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900'
    }`}>

      {/* ===== HEADER ===== */}
      <header className={`sticky top-0 z-40 backdrop-blur-lg border-b ${
        darkMode ? 'bg-gray-950/80 border-gray-800' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ rotate: 10 }}
                className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 text-white"
              >
                <Headphones size={20} />
              </motion.div>
              <span className="font-bold text-lg bg-gradient-to-r from-amber-500 to-purple-600 bg-clip-text text-transparent">
                La Magia de Crear
              </span>
            </Link>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {darkMode ? '☀️' : '🌙'}
            </motion.button>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION — VIBRA UNIVERSAL ===== */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4">
        
        {/* ===== BACKGROUND CÓSMICO ANIMADO ===== */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradiente base mágico */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-purple-500/5 to-transparent" />
          
          {/* Orbes de luz flotantes */}
          <motion.div
            animate={{
              y: [0, -30, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-10 md:top-20 md:right-32 w-32 h-32 md:w-48 md:h-48 bg-amber-400/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, 40, 0],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-20 left-10 md:bottom-32 md:left-32 w-24 h-24 md:w-40 md:h-40 bg-purple-400/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              y: [0, -20, 0],
              x: [0, 15, 0],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute top-1/3 left-1/4 w-20 h-20 md:w-32 md:h-32 bg-pink-400/15 rounded-full blur-2xl"
          />

          {/* Partículas flotantes (estrellas) - CLIENTE ONLY para evitar hydration mismatch */}
          {typeof window !== 'undefined' && (
            <ParticlesStars count={20} darkMode={darkMode} />
          )}

          {/* Líneas de energía sutiles */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path
              d="M0,50 Q25,30 50,50 T100,50"
              fill="none"
              stroke="url(#gradient1)"
              strokeWidth="0.3"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.3 }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            />
            <motion.path
              d="M0,60 Q30,80 50,60 T100,60"
              fill="none"
              stroke="url(#gradient2)"
              strokeWidth="0.2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.2 }}
              transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", delay: 1 }}
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ===== CONTENIDO PRINCIPAL ===== */}
        <div className="relative max-w-5xl mx-auto text-center z-10">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Badge inspiracional */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-pink-500/15 border border-amber-500/30 rounded-full text-amber-300 dark:text-amber-300 text-sm font-medium mb-8 backdrop-blur-sm"
            >
              <Sparkles size={16} className="animate-pulse text-amber-400" />
              <span className="bg-gradient-to-r from-amber-200 to-purple-200 bg-clip-text text-transparent font-semibold">
                Lo que el universo tiene para vos
              </span>
              <InfinityIcon size={14} className="animate-pulse text-purple-400" />
            </motion.div>

            {/* Título principal con efecto mágico */}
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                Atraé{' '}
              </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  lo que merecés
                </span>
                <motion.span
                  className="absolute inset-0 bg-amber-400/30 blur-xl -z-10"
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </span>
              <br />
              <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                escuchando al universo
              </span>
            </motion.h1>

            {/* Subtítulo inspirador */}
            <motion.p 
              className={`text-lg md:text-xl lg:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Audiolibros de <strong className="text-amber-600 dark:text-amber-400">manifestación, gratitud y abundancia</strong>. 
              Narrados con pausas para sentir, voces que inspiran y la energía justa para que{' '}
              <em className="italic">lo que pedís, llegue</em>. ✨
            </motion.p>

            {/* Quote destacado de Rhonda Byrne */}
            <motion.blockquote
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className={`mx-auto max-w-2xl mb-10 p-5 rounded-2xl border-l-4 ${
                darkMode 
                  ? 'bg-white/5 border-amber-500/50 text-gray-300' 
                  : 'bg-amber-50/80 border-amber-400 text-gray-700'
              }`}
            >
              <p className="text-lg italic mb-2">
                "Cuando cambiás tus pensamientos, cambiás tu realidad."
              </p>
              <footer className={`text-sm font-medium ${
                darkMode ? 'text-amber-400' : 'text-amber-600'
              }`}>
                — Rhonda Byrne, La Magia
              </footer>
            </motion.blockquote>

       

            {/* CTA Principal con vibra mágica */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
             

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-8 py-4 font-semibold rounded-2xl transition-all border flex items-center gap-2 ${
                  darkMode 
                    ? 'bg-white/5 hover:bg-white/10 text-white border-white/20 hover:border-amber-500/50' 
                    : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200 hover:border-amber-400 shadow-sm'
                }`}
              >
                <BookOpen size={18} />
                Explorar catálogo
              </motion.button>
            </motion.div>

            {/* Mini testimonio social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
              className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl ${
                darkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>+2.500</strong> personas transformando su vida hoy ✨
              </span>
            </motion.div>
          </motion.div>

        

          {/* ===== INDICADOR DE SCROLL SUAVE ===== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center gap-2"
          >
            <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Descubrí más abajo ↓
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className={`w-5 h-8 rounded-full border-2 flex items-start justify-center p-1 ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`}
            >
              <motion.div
                className={`w-1 h-2 rounded-full ${darkMode ? 'bg-amber-400' : 'bg-amber-500'}`}
                animate={{ opacity: [1, 0.3, 1], y: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FILTROS ===== */}
      {allTags.length > 0 && (
        <section id="catalogo" className="px-4 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTag(null)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTag === null
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                    : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Todos
              </motion.button>
              
              {allTags.map((tag) => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTag === tag
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                      : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== LISTA DE LIBROS ===== */}
      <section className="px-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen size={24} className="text-amber-500" />
              Catálogo
            </h2>
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredBooks.length} {filteredBooks.length === 1 ? 'resultado' : 'resultados'}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <BookCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {filteredBooks.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {filteredBooks.map((book) => {
                    const isPopular = book.isPopular;
                    const isNew = book.isNew;
                    
                    return (
                      <motion.div key={book.slug} variants={itemVariants}>
                        <Link href={`/libro/${book.slug}`} className="block group">
                          <motion.article
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            className={`relative bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-5 transition-all border ${
                              darkMode 
                                ? 'border-gray-700 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10' 
                                : 'border-gray-200 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10'
                            }`}
                          >
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
                              {isNew && <Badge variant="new">✨ Nuevo</Badge>}
                              {isPopular && <Badge variant="popular">🔥 Popular</Badge>}
                            </div>

                            <div className="flex gap-4 md:gap-6">
                              <motion.div
                                whileHover={{ scale: 1.03 }}
                                className="relative w-24 md:w-28 h-36 md:h-40 bg-gray-200 dark:bg-gray-700 rounded-xl flex-shrink-0 overflow-hidden shadow-md"
                                style={{ 
                                  backgroundImage: `url(${book.cover})`, 
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }}
                              >
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    className="p-3 rounded-full bg-amber-500 text-black"
                                  >
                                    <Play size={20} fill="currentColor" />
                                  </motion.div>
                                </div>
                              </motion.div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                                      {book.title}
                                    </h3>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {book.author}
                                    </p>
                                  </div>
                                  {book.rating && (
                                    <div className="flex-shrink-0">
                                      <Rating value={book.rating} />
                                    </div>
                                  )}
                                </div>
                                
                                <p className={`text-sm mt-2 line-clamp-2 ${
                                  darkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                  {book.description}
                                </p>
                                
                                {book.tags && book.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {book.tags.slice(0, 3).map((tag) => (
                                      <Badge key={tag}>{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                                
                                <div className={`flex flex-wrap items-center gap-3 mt-4 text-xs ${
                                  darkMode ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  {book.duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} />
                                      {book.duration}
                                    </span>
                                  )}
                                  {book.chapters && (
                                    <span className="flex items-center gap-1">
                                      <BookOpen size={12} />
                                      {book.chapters} capítulos
                                    </span>
                                  )}
                                  {book.price && (
                                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                      <Zap size={12} />
                                      Desde {formatPrice(book.price.subscription)}/mes
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                  <span className={`text-sm font-medium ${
                                    darkMode ? 'text-amber-400' : 'text-amber-600'
                                  } group-hover:gap-2 transition-all flex items-center gap-1`}>
                                    Ver detalles
                                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                  </span>
                                  
                                  {book.price && (
                                    <span className={`text-sm font-semibold ${
                                      darkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                      {formatPrice(book.price.oneTime)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.article>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-center py-16 rounded-2xl border ${
                    darkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2">No encontramos resultados</h3>
                  <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Intentá con otros términos o explorá todas las categorías.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTag(null);
                    }}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition"
                  >
                    Ver todos los audiolibros
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </section>

      {/* ===== FOOTER SIMPLE ===== */}
      <footer className={`px-4 py-8 text-center text-sm ${
        darkMode ? 'text-gray-600' : 'text-gray-400'
      }`}>
        <p>© {new Date().getFullYear()} La Magia de Crear • Audiolibros</p>
    
      </footer>

      {/* ===== UTILITIES ===== */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </main>
  );
}

// Icono X para el botón de limpiar búsqueda
function X({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}