// Netlify Function to receive and process submitted idea responses
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
  // TODO: integrate with database, email service, or webhook as needed.
  console.log('New idea submitted:', data);
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Thanks! Your responses have been submitted.' })
  };
};