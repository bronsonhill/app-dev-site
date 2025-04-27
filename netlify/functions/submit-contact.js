// Netlify Function to receive contact form submissions and email via SendGrid
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
  const { name, email, phone } = data;
  if (!name || !email) {
    return { statusCode: 400, body: 'Missing required fields: name and email' };
  }
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;
  const SENDGRID_TO_EMAIL = process.env.SENDGRID_TO_EMAIL;
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL || !SENDGRID_TO_EMAIL) {
    console.error('Missing SendGrid environment variables');
    return { statusCode: 500, body: 'Server Error: Email configuration not set' };
  }
  const messageContent = `New contact form submission:\n* Name: ${name}\n* Email: ${email}\n* Phone: ${phone}`;
  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SENDGRID_TO_EMAIL }] }],
        from: { email: SENDGRID_FROM_EMAIL },
        subject: 'New Contact Form Submission',
        content: [{ type: 'text/plain', value: messageContent }]
      })
    });
  } catch (err) {
    console.error('Error sending contact email', err);
    return { statusCode: 500, body: 'Server Error: Failed to send email' };
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Thank you! Your contact info has been submitted.' })
  };
};