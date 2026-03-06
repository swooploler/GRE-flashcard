'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  LogOut, 
  CheckCircle2, 
  Circle,
  Loader2,
  LayoutGrid,
  List
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useFlashcards } from '@/lib/useFlashcards';
import Flashcard, { FlashcardData } from '@/components/Flashcard';
import AddCardForm from '@/components/AddCardForm';
import ErrorBoundary from '@/components/ErrorBoundary';

type ViewMode = 'all' | 'mastered' | 'learning';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { 
    cards, 
    loading, 
    error, 
    addCard, 
    addCardWithMnemonic, 
    toggleMastered, 
    deleteCard 
  } = useFlashcards();
  
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const filteredCards = useMemo(() => {
    switch (viewMode) {
      case 'mastered':
        return cards.filter(card => card.mastered);
      case 'learning':
        return cards.filter(card => !card.mastered);
      default:
        return cards;
    }
  }, [cards, viewMode]);

  const stats = useMemo(() => ({
    total: cards.length,
    mastered: cards.filter(c => c.mastered).length,
    learning: cards.filter(c => !c.mastered).length,
  }), [cards]);

  const handleToggleMastered = async (id: string) => {
    try {
      await toggleMastered(id);
    } catch (err) {
      console.error('Failed to toggle mastered:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCard(id);
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          <p className="text-zinc-500 text-sm">Loading your flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#171717] border border-white/[0.06]">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">GRE Flashcards</h1>
                <p className="text-xs text-zinc-500">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <span className="text-zinc-500">
                  <span className="text-white font-medium">{stats.total}</span> total
                </span>
                <span className="text-zinc-500">
                  <span className="text-emerald-400 font-medium">{stats.mastered}</span> mastered
                </span>
              </div>
              
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-[#171717] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Stats for mobile */}
        <div className="sm:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500">
              <span className="text-white font-medium">{stats.total}</span> total
            </span>
            <span className="text-zinc-500">
              <span className="text-emerald-400 font-medium">{stats.mastered}</span> mastered
            </span>
          </div>
        </div>

        {/* View Toggle and Add Form */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#171717] border border-white/[0.06]">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'all' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>All</span>
            </button>
            <button
              onClick={() => setViewMode('learning')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'learning' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Circle className="w-4 h-4" />
              <span>Learning</span>
            </button>
            <button
              onClick={() => setViewMode('mastered')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'mastered' 
                  ? 'bg-white text-black' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mastered</span>
            </button>
          </div>

          <div className="sm:ml-auto w-full sm:w-auto">
            <AddCardForm 
              onAddCard={addCard}
              onAddCardWithMnemonic={addCardWithMnemonic}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Flashcards Grid */}
        <ErrorBoundary>
          {filteredCards.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#171717] border border-white/[0.06] mb-4">
                <Brain className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {cards.length === 0 ? 'No flashcards yet' : 'No cards match this filter'}
              </h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                {cards.length === 0 
                  ? 'Add your first GRE vocabulary word to start building your study deck.'
                  : 'Try changing the filter to see more cards.'}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredCards.map((card) => (
                  <Flashcard
                    key={card.id}
                    card={card}
                    onToggleMastered={handleToggleMastered}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}
