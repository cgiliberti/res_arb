var crypto = require('crypto');
var redisCommand = require('./_redis').redisCommand;

function generateToken(email) {
  return crypto.createHmac('sha256', process.env.CRON_SECRET || '')
    .update(email).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var email = (req.query.email || '').trim().toLowerCase();
  var token = req.query.token || '';

  if (!email || !token) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(page('Bad Request', 'Missing email or token.'));
  }

  var expected = generateToken(email);
  if (token !== expected) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(403).send(page('Invalid Link', 'This unsubscribe link is invalid or expired.'));
  }

  try {
    // Read current subscription to find which sets to clean up
    var getResult = await redisCommand([['GET', 'sub:' + email]]);
    var data = getResult[0] && getResult[0].result
      ? JSON.parse(getResult[0].result)
      : null;

    var commands = [['DEL', 'sub:' + email]];
    if (data && data.restaurants) {
      data.restaurants.forEach(function (id) {
        commands.push(['SREM', 'restaurant:' + id + ':subs', email]);
      });
    }
    await redisCommand(commands);

    res.setHeader('Content-Type', 'text/html');
    return res.send(page('Unsubscribed', "You won't receive any more reservation alerts."));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(page('Error', 'Something went wrong. Try again later.'));
  }
};

function page(title, message) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    + '<title>' + title + ' \u2014 res arb</title>'
    + '<style>'
    + 'body{font-family:Georgia,serif;background:#faf8f4;color:#1a1a1a;'
    + 'display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}'
    + '.box{text-align:center;max-width:400px;padding:2rem;}'
    + 'h2{font-weight:400;letter-spacing:-1px;margin-bottom:0.5rem;}'
    + 'p{color:#777;font-size:0.95rem;}'
    + 'a{color:#1a1a1a;}'
    + '</style></head><body>'
    + '<div class="box">'
    + '<h2>' + title + '</h2>'
    + '<p>' + message + '</p>'
    + '<p style="margin-top:1.5rem;"><a href="/">\u2190 back to res arb</a></p>'
    + '</div></body></html>';
}

// Export for use in cron/notify.js
module.exports.generateToken = generateToken;
