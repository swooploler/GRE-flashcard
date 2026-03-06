'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  FileText,
  Wand2,
  AlertCircle
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkImport: (text: string, maxCards?: number) => Promise<{
    cards: Array<{
      id: string;
      word: string;
      definition: string;
      mnemonic?: string;
    }>;
    extractedCount: number;
    skippedCount: number;
  }>;
}

type ModalState = 'input' | 'processing' | 'complete';

const MAX_TEXT_LENGTH = 10000;
const MIN_TEXT_LENGTH = 50;

export default function BulkImportModal({ 
  isOpen, 
  onClose, 
  onBulkImport 
}: BulkImportModalProps) {
  const [state, setState] = useState<ModalState>('input');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    extractedCount: number;
    skippedCount: number;
  } | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setText('');
        setError(null);
        setResult(null);
        setState('input');
      }, 300); // Wait for close animation
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError(null);

    if (text.trim().length < MIN_TEXT_LENGTH) {
      setError(`Please paste a longer passage (at least ${MIN_TEXT_LENGTH} characters)`);
      return;
    }

    if (text.trim().length > MAX_TEXT_LENGTH) {
      setError(`Text must be ${MAX_TEXT_LENGTH} characters or less`);
      return;
    }

    setState('processing');

    try {
      const response = await onBulkImport(text.trim());
      setResult({
        extractedCount: response.extractedCount,
        skippedCount: response.skippedCount
      });
      setState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract words');
      setState('input');
    }
  };

  const handleClose = () => {
    onClose();
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
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Wand2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Magic Import</h2>
              <p className="text-xs text-zinc-500">Extract GRE words from articles</p>
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
            {state === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Instructions */}
                <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
                  <p className="text-sm text-zinc-400">
                    Paste a paragraph from any article (e.g., Economist, NYT, academic papers). 
                    We'll extract up to 10 GRE-level vocabulary words and generate mnemonics for you.
                  </p>
                </div>

                {/* Text Area */}
                <div>
                  <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Article Text
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your article text here..."
                    rows={8}
                    className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/[0.06] text-white placeholder:text-zinc-600 focus:border-violet-500/30 focus:outline-none transition-colors resize-none"
                  />
                  <div className="flex justify-between mt-2">
                    <span className={`text-xs ${text.length > MAX_TEXT_LENGTH ? 'text-red-400' : 'text-zinc-600'}`}>
                      {text.length} / {MAX_TEXT_LENGTH} characters
                    </span>
                    <span className="text-xs text-zinc-600">
                      Minimum {MIN_TEXT_LENGTH} characters
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={text.trim().length < MIN_TEXT_LENGTH}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Extract Words</span>
                </button>
              </motion.div>
            )}

            {state === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
                  <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  Extracting GRE Words
                </h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Analyzing text and generating mnemonics...
                </p>
                <p className="text-xs text-zinc-600">
                  Processing words sequentially - may take several minutes
                </p>
              </motion.div>
            )}

            {state === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Successfully Extracted!
                </h3>
                <p className="text-zinc-400 mb-6">
                  {result?.extractedCount} new {result?.extractedCount === 1 ? 'card' : 'cards'} added to your deck
                  {result?.skippedCount ? ` (${result.skippedCount} skipped)` : ''}
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-3 px-4 rounded-xl bg-white text-black font-medium hover:bg-zinc-200 transition-colors"
                  >
                    View Cards
                  </button>
                  <button
                    onClick={() => {
                      setText('');
                      setResult(null);
                      setState('input');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl border border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.12] transition-colors"
                  >
                    Import More
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
