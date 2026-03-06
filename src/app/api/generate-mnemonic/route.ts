import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

interface MnemonicResponse {
  mnemonic: string;
  sentence: string;
}

interface ErrorResponse {
  error: string;
}

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export async function POST(request: NextRequest): Promise<NextResponse<MnemonicResponse | ErrorResponse>> {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = rateLimit(clientId, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_MS);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }
    const body = await request.json();
    const { word } = body;

    // Validate the request
    if (!word || typeof word !== 'string') {
      return NextResponse.json(
        { error: 'Word parameter is required and must be a string' },
        { status: 400 }
      );
    }

    const trimmedWord = word.trim();
    if (trimmedWord.length === 0) {
      return NextResponse.json(
        { error: 'Word cannot be empty' },
        { status: 400 }
      );
    }

    // Validate max length to prevent abuse
    const MAX_WORD_LENGTH = 50;
    if (trimmedWord.length > MAX_WORD_LENGTH) {
      return NextResponse.json(
        { error: `Word must be ${MAX_WORD_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    // Get OpenRouter API key
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    
    if (!openRouterKey || openRouterKey === 'your_openrouter_api_key') {
      return NextResponse.json(
        { error: 'OpenRouter API key is not configured. Add OPENROUTER_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Call OpenRouter API with free model
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'GRE Flashcards',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.2-1b-instruct',
          messages: [
            {
              role: 'system',
              content: 'You are a GRE vocabulary expert. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: `For the word "${trimmedWord}", provide: 1) A memorable mnemonic, 2) An example sentence. Respond ONLY with JSON: {"mnemonic": "...", "sentence": "..."}`
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', response.status, errorData);
      return NextResponse.json(
        { error: errorData.error?.message || `AI service error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Parse the response
    const generatedText = data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Could not parse AI response' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate the parsed response
    if (!parsed.mnemonic || !parsed.sentence) {
      return NextResponse.json(
        { error: 'AI response missing required fields' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mnemonic: parsed.mnemonic.trim(),
      sentence: parsed.sentence.trim()
    });

  } catch (error) {
    console.error('Error generating mnemonic:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
