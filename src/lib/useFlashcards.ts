'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { FlashcardData } from '@/components/Flashcard';

export function useFlashcards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const flashcardsRef = collection(db, 'flashcards');
    const q = query(
      flashcardsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCards: FlashcardData[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetchedCards.push({
            id: doc.id,
            word: data.word,
            definition: data.definition,
            mnemonic: data.mnemonic,
            mastered: data.mastered || false,
            createdAt: data.createdAt?.toMillis() || Date.now(),
          });
        });
        setCards(fetchedCards);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching flashcards:', err);
        setError('Failed to load flashcards');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addCard = useCallback(async (word: string, definition: string) => {
    if (!user) throw new Error('Must be logged in to add cards');

    try {
      // Add the card first without mnemonic/sentence
      const flashcardsRef = collection(db, 'flashcards');
      await addDoc(flashcardsRef, {
        word: word.trim(),
        definition: definition.trim(),
        userId: user.uid,
        mastered: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding card:', err);
      throw new Error('Failed to add flashcard');
    }
  }, [user]);

  const addCardWithMnemonic = useCallback(async (
    word: string,
    definition: string,
    mnemonic: string
  ) => {
    if (!user) throw new Error('Must be logged in to add cards');

    try {
      const flashcardsRef = collection(db, 'flashcards');
      await addDoc(flashcardsRef, {
        word: word.trim(),
        definition: definition.trim(),
        mnemonic: mnemonic.trim(),
        userId: user.uid,
        mastered: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error adding card with mnemonic:', err);
      throw new Error('Failed to add flashcard');
    }
  }, [user]);

  const toggleMastered = useCallback(async (cardId: string) => {
    try {
      const cardRef = doc(db, 'flashcards', cardId);
      const card = cards.find(c => c.id === cardId);
      if (!card) return;

      await updateDoc(cardRef, {
        mastered: !card.mastered
      });
    } catch (err) {
      console.error('Error toggling mastered:', err);
      throw new Error('Failed to update flashcard');
    }
  }, [cards]);

  const deleteCard = useCallback(async (cardId: string) => {
    try {
      const cardRef = doc(db, 'flashcards', cardId);
      await deleteDoc(cardRef);
    } catch (err) {
      console.error('Error deleting card:', err);
      throw new Error('Failed to delete flashcard');
    }
  }, []);

  const deleteAllCards = useCallback(async (): Promise<number> => {
    if (!user) throw new Error('Must be logged in to delete cards');
    
    try {
      const cardsRef = collection(db, 'flashcards');
      const q = query(cardsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];
      
      snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, 'flashcards', docSnapshot.id)));
        deletedCount++;
      });
      
      await Promise.all(deletePromises);
      return deletedCount;
    } catch (err) {
      console.error('Error deleting all cards:', err);
      throw new Error('Failed to delete all flashcards');
    }
  }, [user]);

  const updateCardMnemonic = useCallback(async (
    cardId: string,
    mnemonic: string
  ) => {
    try {
      const cardRef = doc(db, 'flashcards', cardId);
      await updateDoc(cardRef, {
        mnemonic
      });
    } catch (err) {
      console.error('Error updating mnemonic:', err);
      throw new Error('Failed to update mnemonic');
    }
  }, []);

  const bulkGenerateCards = useCallback(async (
    text: string,
    maxCards?: number
  ): Promise<{
    cards: FlashcardData[];
    extractedCount: number;
    skippedCount: number;
  }> => {
    if (!user) throw new Error('Must be logged in to generate cards');

    let response: Response;
    try {
      console.log('[useFlashcards] Calling bulk-generate API');
      response = await fetch('/api/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          userId: user.uid,
          maxCards
        }),
      });
      console.log('[useFlashcards] Response status:', response.status);
    } catch (networkError) {
      console.error('[useFlashcards] Network error:', networkError);
      throw new Error('Network error: Could not connect to the server. Please check your internet connection.');
    }

    // Try to parse response as JSON
    let result;
    let errorMessage: string;
    try {
      result = await response.json();
      errorMessage = result?.error || `Server error: ${response.status}`;
    } catch (parseError) {
      console.error('[useFlashcards] Failed to parse response:', parseError);
      // Response might not be JSON
      const text = await response.text().catch(() => 'Unknown error');
      console.error('[useFlashcards] Response text:', text);
      throw new Error(`Server error: ${response.status}. Please check the server console for details.`);
    }

    if (!response.ok) {
      console.error('[useFlashcards] API error:', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('[useFlashcards] Success:', result);
    
    // The cards will be added to Firestore by the API
    // and the real-time listener will automatically update the cards state
    return {
      cards: result.cards,
      extractedCount: result.extractedCount,
      skippedCount: result.skippedCount
    };
  }, [user]);

  return {
    cards,
    loading,
    error,
    addCard,
    addCardWithMnemonic,
    toggleMastered,
    deleteCard,
    deleteAllCards,
    updateCardMnemonic,
    bulkGenerateCards,
  };
}
