const https = require('https');

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
  const messages = body.messages;
  if (!Array.isArray(messages)) {
    return { statusCode: 400, body: 'Bad Request: messages array missing' };
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'Server Error: OPENAI_API_KEY not set' };
  }

  try {
    const response = await callOpenAI(messages, apiKey);
    const content = response.choices[0].message.content;
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

function callOpenAI(messages, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model: 'gpt-3.5-turbo', messages });
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`OpenAI API Error: ${res.statusCode} - ${body}`));
        }
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}