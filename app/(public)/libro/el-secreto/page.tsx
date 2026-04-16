'use client';

import { useState } from 'react';
import { Play, Lock, CheckCircle } from 'lucide-react';

type Chapter = {
  id: string;
  title: string;
  duration: string;
  src: string;
  isPreview: boolean;
};

export default function ElSecretoPage() {
  const [hasAccess, setHasAccess] = useState(false);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  const book = {
    title: "El Secreto",
    author: "Rhonda Byrne",
    description:
      "El poder de la ley de atracción y cómo usarlo para transformar tu vida.",
    chapters: [
      {
        id: "cap1",
        title: "Introducción al Secreto",
        duration: "5:00",
        src: "/audios/secreto/intro.mp3",
        isPreview: true,
      },
      {
        id: "cap2",
        title: "La Ley de Atracción",
        duration: "7:30",
        src: "/audios/secreto/cap1.mp3",
        isPreview: false,
      },
      {
        id: "cap3",
        title: "El Poder del Pensamiento",
        duration: "6:10",
        src: "/audios/secreto/cap2.mp3",
        isPreview: false,
      },
    ] as Chapter[],
  };

  const handlePlay = (chapter: Chapter) => {
    if (!chapter.isPreview && !hasAccess) return;
    setActiveChapter(chapter);
  };

  const simulateUnlock = () => {
    setHasAccess(true);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      {/* HERO */}
      <section className="max-w-3xl mx-auto mb-10">
        <h1 className="text-4xl font-bold">{book.title}</h1>
        <p className="text-gray-400 mt-1">por {book.author}</p>

        <p className="mt-4 text-gray-300">{book.description}</p>

        {!hasAccess && (
          <button
            onClick={simulateUnlock}
            className="mt-6 px-5 py-2 bg-amber-500 text-black rounded-lg font-semibold"
          >
            Simular desbloqueo
          </button>
        )}
      </section>

      {/* PLAYER */}
      {activeChapter && (
        <section className="max-w-3xl mx-auto mb-10 p-4 bg-white/5 rounded-xl">
          <h2 className="text-lg font-semibold mb-2">
            Reproduciendo: {activeChapter.title}
          </h2>

          <audio controls autoPlay className="w-full">
            <source src={activeChapter.src} type="audio/mp3" />
          </audio>
        </section>
      )}

      {/* CHAPTERS */}
      <section className="max-w-3xl mx-auto space-y-3">
        {book.chapters.map((ch) => {
          const locked = !ch.isPreview && !hasAccess;

          return (
            <div
              key={ch.id}
              onClick={() => handlePlay(ch)}
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer
              ${
                locked
                  ? "bg-white/5 border-white/10 opacity-60"
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {locked ? (
                  <Lock size={18} />
                ) : (
                  <Play size={18} />
                )}

                <div>
                  <p className="font-medium">{ch.title}</p>
                  <p className="text-xs text-gray-400">{ch.duration}</p>
                </div>
              </div>

              {ch.isPreview && (
                <span className="text-xs text-amber-400">Gratis</span>
              )}

              {hasAccess && !ch.isPreview && (
                <CheckCircle size={18} className="text-green-400" />
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}