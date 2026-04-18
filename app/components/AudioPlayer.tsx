'use client';

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Volume2, Lock } from "lucide-react";

export interface AudioPlayerProps {
  src: string;
  title: string;
  chapter: string;
  isPreview?: boolean;
  previewDuration?: number;
  onPreviewEnd?: () => void;
  skipInterval?: number; // 👈 Nuevo: segundos para skip (default: 15)
  onTimeUpdate?: (time: number) => void;
  onSpeedChange?: React.Dispatch<React.SetStateAction<number>>;
}

export default function AudioPlayer({ 
  src, 
  title, 
  chapter, 
  isPreview = false, 
  previewDuration = 90,
  onPreviewEnd,
  skipInterval = 15, // 👈 Default: 15 segundos
  onTimeUpdate,
  onSpeedChange
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // Verificar límite de preview
  useEffect(() => {
    if (!isPreview || !isPlaying) return;
    
    const checkPreviewLimit = () => {
      if (progress >= previewDuration) {
        audioRef.current?.pause();
        setIsPlaying(false);
        setShowLockModal(true);
        onPreviewEnd?.();
      }
    };
    
    const interval = setInterval(checkPreviewLimit, 500);
    return () => clearInterval(interval);
  }, [isPreview, isPlaying, progress, previewDuration, onPreviewEnd]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPreview && progress >= previewDuration) {
      setShowLockModal(true);
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
      setError(null);
    } catch (err) {
      console.warn("Error al reproducir:", err);
      setError("No se pudo reproducir el audio. Verifica el archivo o la red.");
    }
  };

  // ⏪ NUEVO: Retroceder X segundos
  const skipBackward = () => {
    if (isPreview) {
      setShowLockModal(true);
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = Math.max(0, audio.currentTime - skipInterval);
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  // ⏩ NUEVO: Adelantar X segundos
  const skipForward = () => {
    if (isPreview) {
      setShowLockModal(true);
      return;
    }
    
    const audio = audioRef.current;
    if (!audio) return;
    
    // Respetar límite de preview si aplica
    const maxTime = isPreview ? Math.min(previewDuration, duration || previewDuration) : (duration || 0);
    const newTime = Math.min(maxTime, audio.currentTime + skipInterval);
    
    // Si al adelantar supera el límite de preview, mostrar modal
    if (isPreview && newTime >= previewDuration) {
      audio.pause();
      setIsPlaying(false);
      setShowLockModal(true);
      onPreviewEnd?.();
      return;
    }
    
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPreview) {
      setShowLockModal(true);
      return;
    }
    
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const changeSpeed = () => {
    if (isPreview) {
      setShowLockModal(true);
      return;
    }
    
    const newSpeed = speed >= 2 ? 0.5 : speed + 0.5;
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
    if (onSpeedChange) onSpeedChange(newSpeed);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Reinicia estado si cambia la fuente
  useEffect(() => {
    setError(null);
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
    setShowLockModal(false);
  }, [src]);

  // Calcular progreso máximo para preview
  const maxProgress = isPreview ? Math.min(previewDuration, duration || previewDuration) : (duration || 0);

  // 👇 NUEVO: Atajos de teclado para skip
  useEffect(() => {
    if (isPreview) return; // Desactivar atajos en preview
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Ignorar si el foco está en un input
      }
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBackward();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipForward();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreview, skipInterval]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg max-w-md mx-auto mt-6 border border-gray-200 dark:border-gray-700">
      {/* Header con badge de preview */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-gray-500 dark:text-gray-400">{chapter}</p>
        </div>
        {isPreview && (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2.5 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20"
          >
            🎧 Preview
          </motion.span>
        )}
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm border border-red-200 dark:border-red-800"
        >
          ⚠️ {error}
        </motion.div>
      )}

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            if (onTimeUpdate) onTimeUpdate(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
          }
        }}
        onError={() => setError("Error al cargar el archivo de audio. Verifica la ruta o el formato.")}
        onEnded={() => {
          setIsPlaying(false);
          if (isPreview && onPreviewEnd) {
            onPreviewEnd();
          }
        }}
        className="hidden"
      />

      {/* Progress Bar */}
      <div className="relative mb-3">
        <input
          type="range"
          min="0"
          max={maxProgress}
          value={Math.min(progress, maxProgress)}
          onChange={handleSeek}
          disabled={error !== null || isPreview}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all
            ${isPreview 
              ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' 
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 
            [&::-webkit-slider-thumb]:hover:bg-blue-700 [&::-webkit-slider-thumb]:transition
            disabled:[&::-webkit-slider-thumb]:bg-gray-400 disabled:[&::-webkit-slider-thumb]:cursor-not-allowed
            mb-2`}
          aria-label="Barra de progreso del audio"
        />
        {/* Barra de progreso visual */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 left-0 h-2 bg-blue-600 rounded-l-lg pointer-events-none transition-all"
          style={{ width: `${duration ? (Math.min(progress, maxProgress) / maxProgress) * 100 : 0}%` }}
        />
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 font-mono">
        <span aria-label="Tiempo transcurrido">{formatTime(Math.min(progress, maxProgress))}</span>
        <span aria-label="Duración total">
          {isPreview ? `${formatTime(previewDuration)} / ${formatTime(duration || 0)}` : formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* 👇 NUEVOS: Botones de skip */}
        {!isPreview && (
          <>
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={skipBackward}
              disabled={error !== null || progress <= 0}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed 
                transition flex items-center justify-center"
              aria-label={`Retroceder ${skipInterval} segundos`}
              title={`Retroceder ${skipInterval}s (←)`}
            >
              <SkipBack size={20} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={skipForward}
              disabled={error !== null || progress >= maxProgress}
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed 
                transition flex items-center justify-center"
              aria-label={`Adelantar ${skipInterval} segundos`}
              title={`Adelantar ${skipInterval}s (→)`}
            >
              <SkipForward size={20} />
            </motion.button>
          </>
        )}
        
        {/* Botón de velocidad (oculto en preview) */}
        {!isPreview && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={changeSpeed}
            disabled={error !== null}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition text-sm font-medium text-gray-700 dark:text-gray-300"
            title="Velocidad de reproducción"
            aria-label={`Velocidad: ${speed}x`}
          >
            {speed}x
          </motion.button>
        )}
        
        {/* Botón Play/Pause principal */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          disabled={error !== null}
          className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2
            ${isPlaying 
              ? 'bg-amber-500 hover:bg-amber-600 text-black' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          <span className="hidden sm:inline">{isPlaying ? "Pausa" : "Reproducir"}</span>
        </motion.button>

        {/* Icono de lock en preview 
        {isPreview && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLockModal(true)}
            className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            title="Desbloquear contenido completo"
            aria-label="Desbloquear contenido completo"
          >
            <Lock size={18} />
          </motion.button>
        )}*/}
      </div>

      {/* 👇 NUEVO: Hint de atajos de teclado (solo desktop) */}
      {!isPreview && (
        <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-3 hidden sm:block">
          💡 Usá <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">←</kbd> y <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">→</kbd> para saltar {skipInterval}s
        </p>
      )}

      {/* Modal de bloqueo para preview (sin cambios) */}
      {showLockModal && isPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLockModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center">
                <Lock className="text-amber-500" size={24} />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Contenido Premium
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                Este es un preview de {previewDuration} segundos. 
                Desbloqueá el audiolibro completo para acceder a todos los capítulos.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="/contact"
                  className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition text-center"
                >
                  Desbloquear Ahora
                </a>
                <button
                  onClick={() => setShowLockModal(false)}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition"
                >
                  Seguir explorando
                </button>
              </div>
            </div>
          </motion.div>



          
        </motion.div>
      )}
    </div>
  );
}