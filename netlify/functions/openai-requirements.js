const OpenAI = require('openai');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  const input = body.input;
  if (!Array.isArray(input)) {
    return { statusCode: 400, body: 'Bad Request: input array missing' };
  }
  // Optional function calling tools, tool_choice, and custom model
  const tools = Array.isArray(body.tools) ? body.tools : undefined;
  const tool_choice = body.tool_choice;
  const model = body.model || 'gpt-4';
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Server Error: OPENAI_API_KEY not set' };
  }

  try {
    const openai = new OpenAI({ apiKey });
    // Build parameters for responses.create, including optional tools and model
    const params = { model, input };
    if (tools) params.tools = tools;
    if (tool_choice) params.tool_choice = tool_choice;
    // Call the Responses API
    const response = await openai.responses.create(params);
    // Extract the primary output choice
    let choice = null;
    if (response.output && Array.isArray(response.output)) {
      choice = response.output[0];
    } else if (response.choices && Array.isArray(response.choices)) {
      choice = response.choices[0].message || response.choices[0];
    }
    // Determine if a function_call occurred
    let fnCall = null;
    if (choice && choice.function_call) {
      fnCall = choice.function_call;
    } else if (choice && choice.name && choice.arguments !== undefined) {
      fnCall = { name: choice.name, arguments: choice.arguments };
    }
    if (fnCall) {
      // Parse function arguments
      let args = {};
      try { args = JSON.parse(fnCall.arguments || '{}'); } catch {}
      // Return as 'summary' payload
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: args })
      };
    }
    // No function call: return plain content
    const content = choice && (choice.content || (typeof choice === 'string' ? choice : ''));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    };
  } catch (err) {
    return {
      statusCode: err.statusCode || 500,
      body: err.message || JSON.stringify(err)
    };
  }
};
