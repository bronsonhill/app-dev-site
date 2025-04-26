// Module: api.ts
// Provides functions for backend interactions (Netlify functions)

/**
 * Submit all collected answers to the backend (Submit-Idea Netlify function)
 * @param answers The map of question keys to answers
 */
/**
 * Submit all collected answers to the backend (Submit-Idea Netlify function)
 */
export async function submitAnswers(answers: Record<string, any>): Promise<void> {
  const res = await fetch('/.netlify/functions/submit-idea', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

// ----- OpenAI interactions -----
interface AIResponse {
  summary?: any;
  content?: string;
}

async function callOpenAI(input: any[], tools?: any[], tool_choice?: string, model = 'gpt-4.1'): Promise<AIResponse> {
  const body: any = { input, model };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;
  const res = await fetch('/.netlify/functions/openai-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API Error: ${text}`);
  }
  const data = await res.json();
  return {
    summary: data.summary,
    content: data.content
  };
}

// Clarification tool definition
const ASK_CLARIFICATION_TOOL = {
  type: 'function',
  name: 'ask_clarification',
  description: 'Ask a follow-up clarifying question for more detail',
  parameters: {
    type: 'object',
    properties: {
      question: { type: 'string', description: 'The clarifying question to ask the user' }
    },
    required: ['question']
  }
};

/**
 * Ask a clarifying question using the OpenAI clarification tool.
 * @param messages Complete conversation messages for clarity
 */
export async function askClarification(messages: any[]): Promise<AIResponse> {
  return callOpenAI(messages, [ASK_CLARIFICATION_TOOL], 'auto');
}

// Summary generation tool definition
const GENERATE_SUMMARY_TOOL = {
  type: 'function',
  name: 'generate_summary',
  description: 'Generate a JSON summary of project requirements based on provided Q&A.',
  parameters: {
    type: 'object',
    properties: {
      userRole: { type: 'string' },
      'project Type': { type: 'string' },
      subType: { type: 'string' },
      platforms: { type: 'string' },
      description: { type: 'string' },
      users: { type: 'array', items: { type: 'string' } },
      features: { type: 'array', items: { type: 'string' } },
      constraints: { type: 'array', items: { type: 'string' } }
    },
    required: ['userRole', 'project Type', 'description', 'users', 'features']
  }
};

/**
 * Generate the project summary using the OpenAI summary tool.
 * @param messages Q&A messages including system prompt
 */
export async function generateSummary(messages: any[]): Promise<AIResponse> {
  return callOpenAI(messages, [GENERATE_SUMMARY_TOOL], 'auto');
}