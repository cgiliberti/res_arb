// Shared Upstash Redis helper (raw REST API, no npm packages)
// Underscore prefix prevents Vercel from exposing this as an API route.

async function redisCommand(commands) {
  var url = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN must be set');
  }

  var res = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });

  if (!res.ok) {
    throw new Error('Redis error: HTTP ' + res.status);
  }

  return res.json();
}

module.exports = { redisCommand: redisCommand };
