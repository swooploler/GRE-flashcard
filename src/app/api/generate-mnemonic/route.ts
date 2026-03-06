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

    // Get Gemini API key
    const geminiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Add GEMINI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Call Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a GRE vocabulary expert specializing in memory techniques. Always respond with valid JSON only.\n\nFor the word "${trimmedWord}", create: 1) A memorable mnemonic (memory tip using word associations), 2) An example sentence using the word. Respond ONLY with JSON: {"mnemonic": "...", "sentence": "..."}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            responseMimeType: 'application/json',
          },
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      return NextResponse.json(
        { error: errorData.error?.message || `AI service error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
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
