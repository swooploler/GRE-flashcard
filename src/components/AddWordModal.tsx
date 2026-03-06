'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  Search,
  Plus,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import greVocabulary from '@/data/gre-vocabulary.json';

interface WordData {
  Definition: string;
  Synonyms: string;
  'Short Explanation': string;
}

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCardWithMnemonic: (word: string, definition: string, mnemonic: string) => Promise<void>;
}

type ModalState = 'search' | 'found' | 'not-found' | 'adding' | 'success';

export default function AddWordModal({ 
  isOpen, 
  onClose, 
  onAddCardWithMnemonic 
}: AddWordModalProps) {
  const [searchWord, setSearchWord] = useState('');
  const [state, setState] = useState<ModalState>('search');
  const [foundWord, setFoundWord] = useState<string | null>(null);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSearchWord('');
        setFoundWord(null);
        setWordData(null);
        setError(null);
        setState('search');
      }, 300);
    }
  }, [isOpen]);

  const lookupWord = () => {
    const word = searchWord.trim().toLowerCase();
    
    if (!word) {
      setError('Please enter a word');
      return;
    }

    // Check if word exists in vocabulary
    // The vocabulary keys are lowercase
    const found = greVocabulary[word as keyof typeof greVocabulary];
    
    if (found) {
      setFoundWord(word);
      setWordData(found as WordData);
      setState('found');
      setError(null);
    } else {
      setFoundWord(word);
      setWordData(null);
      setState('not-found');
      setError(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      lookupWord();
    }
  };

  const handleAddWord = async () => {
    if (!foundWord || !wordData) return;

    setIsAdding(true);
    setState('adding');

    try {
      // Format synonyms as mnemonic (first line or comma-separated)
      const synonyms = wordData.Synonyms.split('\n').filter(s => s.trim()).slice(0, 3).join(', ');
      
      await onAddCardWithMnemonic(
        foundWord,
        wordData.Definition,
        synonyms || wordData['Short Explanation']
      );
      
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card');
      setState('found');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddWithoutAI = async () => {
    if (!foundWord) return;

    setIsAdding(true);
    setState('adding');

    try {
      await onAddCardWithMnemonic(
        foundWord,
        'Definition not found in vocabulary',
        ''
      );
      
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card');
      setState('not-found');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleAddAnother = () => {
    setSearchWord('');
    setFoundWord(null);
    setWordData(null);
    setError(null);
    setState('search');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg mx-4 bg-[#171717] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <Search className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Add Word</h2>
              <p className="text-xs text-zinc-500">Look up GRE vocabulary</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {/* SEARCH STATE */}
            {state === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Instructions */}
                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-sm text-zinc-400">
                    Enter a GRE vocabulary word to look it up. If found, you'll see the definition, synonyms, and explanation.
                  </p>
                </div>

                {/* Search Input */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Word
                  </label>
                  <input
                    type="text"
                    value={searchWord}
                    onChange={(e) => setSearchWord(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Ephemeral, Ubiquitous, Enigma"
                    autoFocus
                    className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-white placeholder:text-zinc-600 focus:border-emerald-500/30 focus:outline-none transition-colors"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Search Button */}
                <button
                  onClick={lookupWord}
                  disabled={!searchWord.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Search className="w-5 h-5" />
                  <span>Look Up Word</span>
                </button>
              </motion.div>
            )}

            {/* FOUND STATE - Show word details */}
            {(state === 'found' || state === 'adding') && wordData && (
              <motion.div
                key="found"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Word Header */}
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 text-sm">Word found in vocabulary!</span>
                </div>

                {/* Word & Definition */}
                <div className="p-4 rounded-lg bg-[#0a0a0a] border border-white/[0.06]">
                  <h3 className="text-xl font-semibold text-white capitalize mb-2">
                    {foundWord}
                  </h3>
                  <p className="text-zinc-300 text-sm mb-3">
                    {wordData.Definition}
                  </p>
                  
                  {/* Synonyms */}
                  {wordData.Synonyms && (
                    <div className="mb-3">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Synonyms:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {wordData.Synonyms.split('\n').filter(s => s.trim()).slice(0, 5).map((synonym, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs"
                          >
                            {synonym.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Short Explanation */}
                  {wordData['Short Explanation'] && (
                    <div>
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">Explanation:</span>
                      <p className="text-zinc-400 text-sm mt-1 italic">
                        "{wordData['Short Explanation']}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddWord}
                    disabled={isAdding}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add to Deck</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAddAnother}
                    disabled={isAdding}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Look Up Another
                  </button>
                </div>
              </motion.div>
            )}

            {/* NOT FOUND STATE */}
            {state === 'not-found' && (
              <motion.div
                key="not-found"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Not Found Message */}
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-amber-400 text-sm mb-1">
                    "{foundWord}" not found in vocabulary
                  </p>
                  <p className="text-zinc-500 text-xs">
                    This word may not be in our GRE vocabulary list.
                  </p>
                </div>

                {/* Word Display */}
                <div className="p-4 rounded-lg bg-[#0a0a0a] border border-white/[0.06]">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Looking for:</span>
                  <h3 className="text-xl font-semibold text-white capitalize mt-1">
                    {foundWord}
                  </h3>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddWithoutAI}
                    disabled={isAdding}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Anyway</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleAddAnother}
                    disabled={isAdding}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Try Another
                  </button>
                </div>
              </motion.div>
            )}

            {/* SUCCESS STATE */}
            {state === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Added to Deck!
                </h3>
                <p className="text-zinc-400 mb-6">
                  "{foundWord}" has been added to your flashcards
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                  >
                    View Cards
                  </button>
                  <button
                    onClick={handleAddAnother}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] transition-colors"
                  >
                    Add Another
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
