import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import greVocabulary from '@/data/gre-vocabulary.json';

// GRE Vocabulary data type (all fields optional to handle missing data)
interface GREWordData {
  'Short Explanation'?: string;
  'Long Explanation'?: string;
  Synonyms?: string;
  Definition?: string;
}

type GREVocabulary = Record<string, GREWordData>;

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Cost control: max cards per import
const MAX_CARDS_PER_IMPORT = 10;
const MAX_TEXT_LENGTH = 10000;
const MIN_TEXT_LENGTH = 50;

interface ExtractedWord {
  word: string;
  definition: string;
  context: string;
}

interface MnemonicData {
  mnemonic: string;
}

interface GeneratedCard {
  word: string;
  definition: string;
  mnemonic: string;
}

interface BulkGenerateRequest {
  text: string;
  userId: string;
  maxCards?: number;
}

interface BulkGenerateResponse {
  cards: Array<{
    id: string;
    word: string;
    definition: string;
    mnemonic?: string;
  }>;
  extractedCount: number;
  skippedCount: number;
}

interface ErrorResponse {
  error: string;
}

// Common word roots and prefixes for template mnemonics
const WORD_ROOTS: Record<string, string> = {
  'ambitious': 'amb = "around" + itious = " tending to" → tends to go around/around going for goals',
  'consequential': 'con = "with" + sequ = "follow" + ial = "related to" → following from, important',
  'ephemeral': 'ephemera = "things lasting a day" + al = relating to → lasting a very short time',
  'pragmatic': 'pragma = "deed" + ic = relating to → practical, dealing with things sensibly',
  'eloquent': 'e = "out" + loqu = "speak" + ent = "having" → speaking out, fluent',
  'gregarious': 'greg = "flock" + arious = "characterized by" → fond of company, sociable',
  'tenacious': 'ten = "hold" + acious = "having quality of" → holding firmly, persistent',
  'verbose': 'verb = "word" + ose = "full of" → full of words, wordy',
  'benevolent': 'bene = "good" + vol = "wish" + ent = "having" → having good wishes, kind',
  'meticulous': 'meticulosus = "fearful" (Latin) → very careful and precise',
  'audacious': 'audax = "bold" → bold, daring',
  'capricious': 'capri = "goat" + ious = "having quality" → like a goat, changeable',
  'cacophony': 'caco = "bad" + phon = "sound" + y → bad sound, harsh noise',
  'diligent': 'diligens = "careful" → careful and hardworking',
  'enigmatic': 'enigma = "puzzle" + ic → puzzling, mysterious',
  'fastidious': 'fastidiosus = "squeamish" → very attentive to detail, fussy',
  'harbinger': 'herberg = "shelter" → one who foreshadows, messenger',
  'innate': 'in = "not" + natus = "born" → inborn, natural',
  'juvenile': 'juven = "young" + ile = "relating to" → relating to young people',
  'kinetic': 'kine = "movement" + tic = "relating to" → relating to movement',
  'lethargic': 'lethe = "forgetfulness" + argic = "condition" → drowsy, sluggish',
  'mundane': 'mundus = "world" → relating to the world, ordinary',
  'nefarious': 'ne = "not" + fas = "law" → contrary to law, wicked',
  'obsolete': 'ob = "against" + solere = "to be used" → no longer used, outdated',
  'paradox': 'para = "beyond" + doxa = "opinion" → beyond opinion, self-contradictory',
  'quintessential': 'quinta = "fifth" + essence → purest essence of something',
  'resilient': 're = "back" + silire = "to jump" → bouncing back, recovering quickly',
  'scrutinize': 'scrutinium = "examination" → to examine closely',
  'ubiquitous': 'ubi = "where" + que = "every" → existing everywhere',
  'vehement': 'vehe = "carry" + ment → carried with force, passionate',
  'whimsical': 'whim + ical → fanciful, playful',
  'xenophobia': 'xeno = "stranger" + phobia = "fear" → fear of foreigners',
  'yearning': 'georn = "desire" → a strong desire',
  'zealous': 'zelos = "zeal" → full of zeal, passionate'
};

// Template mnemonics for common patterns
const TEMPLATE_MNEMONICS = {
  'tion': 'Think "action" - when you see -tion, think of an action or process',
  'ness': 'Think "state of" - -ness means a state or quality of being',
  'able': 'Think "can do" - -able means capable of being',
  'ful': 'Think "full of" - -ful means full of the quality',
  'less': 'Think "without" - -less means without the quality',
  'pre': 'Think "before" - pre- means before or earlier',
  're': 'Think "again" - re- means again or back',
  'un': 'Think "not" - un- means not or opposite',
  'dis': 'Think "not" - dis- means not or opposite',
  'mis': 'Think "wrong" - mis- means wrong or bad',
  'over': 'Think "too much" - over- means too much',
  'under': 'Think "not enough" - under- means not enough',
  'inter': 'Think "between" - inter- means between or among',
  'trans': 'Think "across" - trans- means across or beyond',
  'sub': 'Think "under" - sub- means under or below',
  'super': 'Think "above" - super- means above or beyond',
  'anti': 'Think "against" - anti- means against or opposite',
  'auto': 'Think "self" - auto- means self or same',
  'bio': 'Think "life" - bio- means life or living',
  'geo': 'Think "earth" - geo- means earth or ground',
  'micro': 'Think "small" - micro- means small or tiny',
  'macro': 'Think "large" - macro- means large or big',
  'photo': 'Think "light" - photo- means light or photograph',
  'tele': 'Think "far" - tele- means far or distant',
  'scope': 'Think "see" - -scope means instrument for seeing',
  'logy': 'Think "study of" - -logy means study of',
  'ist': 'Think "person who" - -ist means person who does'
};

/**
 * Fetch definition from Free Dictionary API
 */
async function fetchDefinition(word: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const firstEntry = data[0];
    const meanings = firstEntry.meanings;
    if (!meanings || meanings.length === 0) return null;
    
    const firstMeaning = meanings[0];
    const definitions = firstMeaning.definitions;
    if (!definitions || definitions.length === 0) return null;
    
    return definitions[0].definition;
  } catch (error) {
    console.error('[bulk-generate] Dictionary API error:', error);
    return null;
  }
}

/**
 * Generate template-based mnemonic
 */
function generateTemplateMnemonic(word: string, definition: string): string {
  const lowerWord = word.toLowerCase();
  
  // Check for known roots
  for (const [root, mnemonic] of Object.entries(WORD_ROOTS)) {
    if (lowerWord.includes(root)) {
      return `${root}: ${mnemonic}`;
    }
  }
  
  // Check for common suffixes/prefixes
  for (const [pattern, template] of Object.entries(TEMPLATE_MNEMONICS)) {
    if (lowerWord.includes(pattern)) {
      return `The "${pattern}" in "${word}" means "${template.split(' - ')[1] || template}". ${definition}`;
    }
  }
  
  // Default mnemonic - use word as its own memory cue
  return `Think of "${word}" as a unique word. Its meaning: ${definition}. Associate the word with its definition through a personal connection.`;
}

/**
 * Generate mnemonic using local GRE vocabulary JSON (no API needed!)
 */
function generateFreeMnemonic(word: string, context: string): MnemonicData {
  const lowerWord = word.toLowerCase();
  const vocab = greVocabulary as GREVocabulary;
  
  // Look up word in local vocabulary
  const wordData = vocab[lowerWord];
  
  if (wordData) {
    // Use Short Explanation as the primary definition
    const definition = wordData['Short Explanation'] || wordData.Definition || '';
    const synonyms = wordData.Synonyms || '';
    
    // Clean up synonyms - replace newlines with commas
    const cleanedSynonyms = synonyms
      ? synonyms.replace(/\n/g, ', ')
      : '';
    
    return {
      mnemonic: cleanedSynonyms,
    };
  }
  
  // Fallback: use context if word not in vocabulary
  const fallbackDef = context
    ? `Related to: ${context.substring(0, 100)}...`
    : 'Word not found in vocabulary database';
  
  return {
    mnemonic: `Think of "${word}" as meaning: ${fallbackDef}`
  };
}

/**
 * Extract GRE words from text using local vocabulary (completely offline!)
 */
function extractGREWords(text: string, maxCards: number): ExtractedWord[] {
  const vocab = greVocabulary as GREVocabulary;
  
  // Clean and tokenize the text
  const words = text.toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Count word occurrences in the text
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }
  
  // Find words that exist in our vocabulary
  const foundWords: ExtractedWord[] = [];
  const seen = new Set<string>();
  
  for (const word of words) {
    if (seen.has(word)) continue;
    
    const wordData = vocab[word];
    if (wordData) {
      seen.add(word);
      foundWords.push({
        word: word,
        definition: wordData.Definition || wordData['Short Explanation'] || '',
        context: `Found in your text (${wordCount[word]} time${wordCount[word] > 1 ? 's' : ''})`
      });
      
      if (foundWords.length >= maxCards) break;
    }
  }
  
  return foundWords;
}

/**
 * Generate mnemonic (not needed anymore - using local vocab)
 */
function generateMnemonic(word: string, definition: string): MnemonicData {
  // Just use the local vocabulary - no AI needed!
  return generateFreeMnemonic(word, definition);
}

export async function POST(request: NextRequest): Promise<NextResponse<BulkGenerateResponse | ErrorResponse>> {
  try {
    console.log('[bulk-generate] Received request');
    
    // Check API key configuration
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    console.log('[bulk-generate] API key configured:', !!openRouterKey, openRouterKey?.substring(0, 10) + '...' || 'undefined');
    
    if (!openRouterKey || openRouterKey === 'your_openrouter_api_key' || openRouterKey.length < 10) {
      console.error('[bulk-generate] OpenRouter API key is not properly configured');
      return NextResponse.json(
        { error: 'AI service is not configured. Please add OPENROUTER_API_KEY to your .env.local file.' },
        { status: 500 }
      );
    }
    
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(clientId, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    // Parse and validate request body
    const body: BulkGenerateRequest = await request.json();
    const { text, userId, maxCards = MAX_CARDS_PER_IMPORT } = body;

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate text input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();
    
    if (trimmedText.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Please paste a longer passage (at least ${MIN_TEXT_LENGTH} characters)` },
        { status: 400 }
      );
    }

    if (trimmedText.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text must be ${MAX_TEXT_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Validate maxCards
    const cardLimit = Math.min(Math.max(1, maxCards), MAX_CARDS_PER_IMPORT);

    // Step 1: Extract GRE words from text
    const extractedWords = await extractGREWords(trimmedText, cardLimit);

    if (extractedWords.length === 0) {
      return NextResponse.json(
        { error: 'No GRE-level vocabulary found. Try a more academic article.' },
        { status: 400 }
      );
    }

    // Step 1.5: Filter out words that already exist for this user
    const existingWordsQuery = query(
      collection(db, 'flashcards'),
      where('userId', '==', userId)
    );
    const existingDocs = await getDocs(existingWordsQuery);
    const existingWords = new Set(
      existingDocs.docs.map(doc => doc.data().word?.toLowerCase())
    );
    
    const newWords = extractedWords.filter(word => !existingWords.has(word.word.toLowerCase()));
    const skippedDuplicates = extractedWords.length - newWords.length;
    
    console.log(`[bulk-generate] Found ${skippedDuplicates} existing words, ${newWords.length} new words`);
    
    if (newWords.length === 0) {
      return NextResponse.json({
        cards: [],
        extractedCount: 0,
        skippedCount: skippedDuplicates
      });
    }
    
    // Use only new words
    extractedWords.length = 0;
    extractedWords.push(...newWords);

    // Step 2: Generate mnemonics using free Dictionary API (no AI needed)
    const generatedCards: GeneratedCard[] = [];
    
    for (const word of extractedWords) {
      try {
        const mnemonicData = generateFreeMnemonic(word.word, word.context);
        generatedCards.push({
          ...word,
          mnemonic: mnemonicData.mnemonic
        });
      } catch (error) {
        // If mnemonic generation fails, use empty
        console.error(`Error generating mnemonic for ${word.word}:`, error);
        generatedCards.push({
          ...word,
          mnemonic: ''
        });
      }
    }

    // Step 3: Batch create flashcards in Firestore
    const flashcardsRef = collection(db, 'flashcards');
    const createdCards: BulkGenerateResponse['cards'] = [];

    for (const card of generatedCards) {
      try {
        const docRef = await addDoc(flashcardsRef, {
          word: card.word,
          definition: card.definition,
          mnemonic: card.mnemonic || '',
          userId: userId,
          mastered: false,
          source: 'bulk-import',
          createdAt: serverTimestamp(),
        });

        createdCards.push({
          id: docRef.id,
          word: card.word,
          definition: card.definition,
          mnemonic: card.mnemonic || undefined,
        });
      } catch (error) {
        console.error('Error creating flashcard:', error);
      }
    }

    const skippedCount = generatedCards.length - createdCards.length;

    return NextResponse.json({
      cards: createdCards,
      extractedCount: createdCards.length,
      skippedCount
    });

  } catch (error) {
    console.error('Error in bulk-generate:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    // Handle rate limit errors - provide user-friendly message
    if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('DAILY_RATE_LIMIT')) {
      return NextResponse.json(
        { error: "You've reached your daily AI limit. Please try again tomorrow or add credits to your OpenRouter account." },
        { status: 429 }
      );
    }
    
    // Handle timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      return NextResponse.json(
        { error: 'Processing took too long. Try a shorter passage.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
