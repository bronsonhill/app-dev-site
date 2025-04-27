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

/**
 * Submit contact form details to the backend (Submit-Contact Netlify function)
 */
export async function submitContact(contact: { name: string; email: string; phone: string; }): Promise<void> {
  const res = await fetch('/.netlify/functions/submit-contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact)
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

async function callOpenAI(input: any[], tools?: any[], tool_choice?: string, model = 'gpt-4o'): Promise<AIResponse> {
  const body: any = { input, model };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;
  const res = await fetch('/.netlify/functions/openai-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  console.log('OpenAI API response:', res);
  if (!res.ok) {
    const text = await res.text();
    console.error('OpenAI API error:', text);
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
 * Unified call: attaches both clarification and summary tools, auto tool choice
 * @param messages Conversation messages for tool calls
 */
export async function callTools(messages: any[]): Promise<AIResponse> {
  return callOpenAI(messages, [ASK_CLARIFICATION_TOOL, GENERATE_SUMMARY_TOOL], 'auto');
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

// Note: use callTools for unified interaction (both tools attached)