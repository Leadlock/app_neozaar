import { NextResponse } from 'next/server';

// Static system prompt (fallback)
const STATIC_SYSTEM_PROMPT = `
You are a NeoZaar cloud solutions advisor.

Your goal is to understand customer requirements before recommending products.

You should gather information such as:

- Business objective
- Current challenge
- Preferred cloud provider (AWS, Azure, GCP, Multi-cloud, No Preference)
- Budget
- Company size
- Industry
- Compliance requirements
- Existing tools/vendors
- Timeline
- Assessment vs Implementation vs Managed Services vs Licensing

Rules:

1. Do NOT recommend products immediately.
2. Ask only 2-4 questions at a time.
3. Use previous answers to determine the next questions.
4. Avoid repeating questions already answered.
5. Once enough information has been collected, recommend products.
6. When recommending products, return ONLY a JSON array of product IDs.
7. Example recommendation response:
   [12,34,56]
8. Do not include explanations when returning product IDs.
9. If information is insufficient, continue asking questions.
`;

// Helper: fetch dynamic prompts from external API
async function fetchDynamicPrompts() {
  const API_URL = process.env.INSTRUCTIONS_API_URL || `${process.env.NEXT_PUBLIC_API_BASE}/instructions/get-questions`;
  const TIMEOUT_MS = 2000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(API_URL, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.status === 'success' && data?.data) {
      return {
        systemPrompt: data.data.system_prompt || STATIC_SYSTEM_PROMPT,
        instruction: data.data.instruction || null,
      };
    }
    throw new Error('Invalid response structure');
  } catch (error) {
    console.warn('Failed to fetch dynamic prompts, using static fallback:', error.message);
    return {
      systemPrompt: STATIC_SYSTEM_PROMPT,
      instruction: null,
    };
  }
}

// Build product context (used inside POST)
function buildProductContext(products, dynamicInstruction = null) {
  const productListText = products
    .map(
      (p) =>
        `ID: ${p.id}\nName: ${p.name}\nDescription: ${(p.description || '').substring(0, 300)}`
    )
    .join('\n\n');

  let context = `
Available Products:

${productListText}

Instructions:

- Use ONLY products from the catalog above.
- If more information is needed, ask follow-up questions.
- When ready, return ONLY a JSON array of product IDs.
- Example:
[1,2,3]
`;

  if (dynamicInstruction) {
    context += `\n\nAdditional instruction from API:\n${dynamicInstruction}`;
  }
  return context;
}

export async function POST(req) {
  try {
    // 1. Auth check (optional)
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) console.warn('No token provided – continuing anyway');

    // 2. OpenAI key check
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'Server misconfiguration: OPENAI_API_KEY is missing' },
        { status: 500 }
      );
    }

    // 3. Parse request body
    let messages, products;
    try {
      const body = await req.json();
      messages = body.messages;
      products = body.products;
    } catch (bodyErr) {
      console.error('Invalid JSON body:', bodyErr);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }
    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Products array is required' }, { status: 400 });
    }

    // 4. Fetch dynamic prompts (with timeout & fallback)
    const { systemPrompt, instruction: dynamicInstruction } = await fetchDynamicPrompts();

    // 5. Build product context using the dynamic instruction (if any)
    const productContext = buildProductContext(products, dynamicInstruction);

    // 6. Call OpenAI
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: productContext },
          ...messages,
        ],
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      console.error('OpenAI API error:', openAiResponse.status, errorText);
      const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      const fallbackIds = getKeywordFallback(latestUserMessage, products);
      return NextResponse.json({
        type: 'recommendation',
        productIds: fallbackIds,
        source: 'fallback',
      });
    }

    const data = await openAiResponse.json();
    let content = data?.choices?.[0]?.message?.content?.trim() || '';
    content = content.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    // 7. Try to parse as JSON (recommendation)
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const validIds = products.map(p => p.id);
        const productIds = parsed.filter(id => validIds.includes(id)).slice(0, 3);
        if (productIds.length > 0) {
          return NextResponse.json({ type: 'recommendation', productIds });
        }
      }
    } catch (err) {
      // Not JSON -> AI is asking questions
    }

    // 8. Still gathering requirements
    return NextResponse.json({ type: 'question', message: content });
  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Keyword fallback (unchanged)
function getKeywordFallback(query, products) {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/);
  const scored = products.map(product => {
    let score = 0;
    const nameLower = product.name.toLowerCase();
    const descLower = (product.description || '').toLowerCase();
    for (const word of queryWords) {
      if (nameLower.includes(word)) score += 3;
      if (descLower.includes(word)) score += 1;
    }
    if (nameLower.includes(lowerQuery)) score += 5;
    if (descLower.includes(lowerQuery)) score += 2;
    return { id: product.id, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter(item => item.score > 0)
    .map(item => item.id);
}