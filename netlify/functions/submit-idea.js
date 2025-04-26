// Netlify Function to receive and process submitted idea responses and email via SendGrid
const fetch = require('node-fetch');
exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  // Read SendGrid configuration from environment
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
  const SENDGRID_TO_EMAIL = process.env.SENDGRID_TO_EMAIL;
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL || !SENDGRID_TO_EMAIL) {
    console.error('Missing SendGrid environment variables');
    return { statusCode: 500, body: 'Server Error: Email configuration not set' };
  }
  // Format the email content from submitted data
  const lines = Object.entries(data).map(
    ([key, value]) => `* ${key}: ${value}`
  );
  const messageContent = lines.join('\n');
  // Send email via SendGrid REST API
  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SENDGRID_TO_EMAIL }] }],
        from: { email: SENDGRID_FROM_EMAIL },
        subject: 'New Idea Submission',
        content: [{ type: 'text/plain', value: messageContent }]
      })
    });
  } catch (err) {
    console.error('Error sending email', err);
    return { statusCode: 500, body: 'Server Error: Failed to send email' };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Thanks! Your responses have been submitted.' })
  };
};