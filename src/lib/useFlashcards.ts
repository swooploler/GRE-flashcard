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
  serverTimestamp
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
            sentence: data.sentence,
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
    mnemonic: string, 
    sentence: string
  ) => {
    if (!user) throw new Error('Must be logged in to add cards');

    try {
      const flashcardsRef = collection(db, 'flashcards');
      await addDoc(flashcardsRef, {
        word: word.trim(),
        definition: definition.trim(),
        mnemonic: mnemonic.trim(),
        sentence: sentence.trim(),
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

  const updateCardMnemonic = useCallback(async (
    cardId: string, 
    mnemonic: string, 
    sentence: string
  ) => {
    try {
      const cardRef = doc(db, 'flashcards', cardId);
      await updateDoc(cardRef, {
        mnemonic,
        sentence
      });
    } catch (err) {
      console.error('Error updating mnemonic:', err);
      throw new Error('Failed to update mnemonic');
    }
  }, []);

  return {
    cards,
    loading,
    error,
    addCard,
    addCardWithMnemonic,
    toggleMastered,
    deleteCard,
    updateCardMnemonic,
  };
}
