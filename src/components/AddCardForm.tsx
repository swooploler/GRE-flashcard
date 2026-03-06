'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Loader2 } from 'lucide-react';

interface AddCardFormProps {
  onAddCard: (word: string, definition: string) => Promise<void>;
  onAddCardWithMnemonic: (word: string, definition: string, mnemonic: string, sentence: string) => Promise<void>;
}

export default function AddCardForm({ onAddCard, onAddCardWithMnemonic }: AddCardFormProps) {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const generateMnemonic = async (word: string): Promise<{ mnemonic: string; sentence: string } | null> => {
    try {
      const response = await fetch('/api/generate-mnemonic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate mnemonic');
      }

      return await response.json();
    } catch (err) {
      console.error('Error generating mnemonic:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!word.trim() || !definition.trim()) {
      setError('Please enter both word and definition');
      return;
    }

    setIsLoading(true);

    try {
      // Try to generate mnemonic
      const mnemonicData = await generateMnemonic(word.trim());

      if (mnemonicData) {
        await onAddCardWithMnemonic(
          word.trim(),
          definition.trim(),
          mnemonicData.mnemonic,
          mnemonicData.sentence
        );
      } else {
        // Fallback: add card without mnemonic
        await onAddCard(word.trim(), definition.trim());
      }

      // Reset form
      setWord('');
      setDefinition('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWithoutAI = async () => {
    setError(null);

    if (!word.trim() || !definition.trim()) {
      setError('Please enter both word and definition');
      return;
    }

    setIsLoading(true);

    try {
      await onAddCard(word.trim(), definition.trim());
      setWord('');
      setDefinition('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-white/[0.06] bg-[#171717] text-zinc-400 hover:text-white hover:border-white/[0.12] transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Card</span>
          </motion.button>
        ) : (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="p-4 rounded-xl border border-white/[0.06] bg-[#171717] space-y-4"
          >
            <div>
              <label htmlFor="word" className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Word
              </label>
              <input
                id="word"
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g., Ephemeral"
                className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-white placeholder:text-zinc-600 focus:border-white/[0.12] focus:outline-none transition-colors"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="definition" className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Definition
              </label>
              <textarea
                id="definition"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="e.g., Lasting for a very short time"
                rows={2}
                className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-white placeholder:text-zinc-600 focus:border-white/[0.12] focus:outline-none transition-colors resize-none"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Add with AI</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleAddWithoutAI}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 rounded-lg border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add without AI
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
