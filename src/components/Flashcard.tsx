'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Sparkles, BookOpen } from 'lucide-react';

export interface FlashcardData {
  id: string;
  word: string;
  definition: string;
  mnemonic?: string;
  mastered: boolean;
  createdAt: number;
}

interface FlashcardProps {
  card: FlashcardData;
  onToggleMastered: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function Flashcard({ card, onToggleMastered, onDelete }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(card.id);
    }, 200);
  };

  const handleToggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMastered(card.id);
  };

  // Parse synonyms/mnemonic into an array for display as tags
  const getSynonyms = () => {
    if (!card.mnemonic) return [];
    // Split by comma or newline and filter empty
    return card.mnemonic
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 5); // Limit to 5 tags
  };

  const synonyms = getSynonyms();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isDeleting ? 0 : 1, 
        y: isDeleting ? -20 : 0,
        scale: isDeleting ? 0.95 : 1
      }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flip-card-container w-full h-80 sm:h-96 cursor-pointer"
      onClick={handleFlip}
    >
      <div 
        className={`flip-card relative w-full h-full ${isFlipped ? 'flipped' : ''}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front Face */}
        <div 
          className="flip-card-front absolute inset-0 flex flex-col items-center justify-center p-6 rounded-2xl border border-white/[0.06] bg-[#171717] glow-border"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="absolute top-4 right-4 text-xs text-zinc-600 uppercase tracking-wider">
            Tap to flip
          </span>
          <h3 className="text-3xl sm:text-4xl font-semibold text-center text-white">
            {card.word}
          </h3>
          {card.mastered && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 text-emerald-500">
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Mastered</span>
            </div>
          )}
        </div>

        {/* Back Face */}
        <div 
          className="flip-card-back absolute inset-0 flex flex-col p-5 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-y-auto"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header with word and actions */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white capitalize">{card.word}</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleMastered}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  card.mastered 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                }`}
                title={card.mastered ? 'Unmark as mastered' : 'Mark as mastered'}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg bg-zinc-800/50 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                title="Delete card"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Definition */}
          <div className="mb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Definition</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {card.definition || 'Definition not available'}
            </p>
          </div>

          {/* Synonyms as tags */}
          {synonyms.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span>Synonyms</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {synonyms.map((synonym, idx) => (
                  <span 
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs"
                  >
                    {synonym}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mnemonic / Explanation */}
          {card.mnemonic && synonyms.length === 0 && (
            <div className="mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <BookOpen className="w-3 h-3 text-amber-400" />
                <span>Explanation</span>
              </div>
              <p className="text-sm text-amber-400/90 leading-relaxed italic">
                "{card.mnemonic}"
              </p>
            </div>
          )}

          {/* If no synonyms but has mnemonic, show it as explanation */}
          {card.mnemonic && synonyms.length > 0 && (
            <div className="mt-auto">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider mb-2">
                <BookOpen className="w-3 h-3 text-amber-400" />
                <span>Explanation</span>
              </div>
              <p className="text-sm text-amber-400/90 leading-relaxed italic">
                "{card.mnemonic}"
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
