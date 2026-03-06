'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Trash2 } from 'lucide-react';

export interface FlashcardData {
  id: string;
  word: string;
  definition: string;
  mnemonic?: string;
  sentence?: string;
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
    // Small delay for visual feedback
    setTimeout(() => {
      onDelete(card.id);
    }, 200);
  };

  const handleToggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMastered(card.id);
  };

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
          className="flip-card-back absolute inset-0 flex flex-col p-6 rounded-2xl border border-white/[0.06] bg-[#171717] overflow-y-auto"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Header with word */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">{card.word}</h3>
            <div className="flex items-center gap-2">
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
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Definition</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {card.definition || 'Definition not available'}
            </p>
          </div>

          {/* Mnemonic */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Mnemonic</span>
            </div>
            <p className="text-sm text-amber-400/90 leading-relaxed">
              {card.mnemonic || 'Generating mnemonic...'}
            </p>
          </div>

          {/* Example Sentence */}
          <div className="mt-auto">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Example</p>
            <p className="text-sm text-zinc-300 italic leading-relaxed">
              {card.sentence || 'Generating example...'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
