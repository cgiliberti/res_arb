var redisCommand = require('./_redis').redisCommand;

var VALID_RESTAURANTS = ['bistrot-ha', 'polo-bar', 'corner-store'];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  var body = req.body;
  if (!body || !body.email || !body.restaurants) {
    return res.status(400).json({ error: 'email and restaurants are required' });
  }

  var email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid email address' });
  }

  var restaurants = body.restaurants.filter(function (id) {
    return VALID_RESTAURANTS.indexOf(id) !== -1;
  });
  if (restaurants.length === 0) {
    return res.status(400).json({ error: 'no valid restaurants selected' });
  }

  try {
    // Read existing subscription to clean up stale set memberships
    var getOld = await redisCommand([['GET', 'sub:' + email]]);
    var oldData = getOld[0] && getOld[0].result
      ? JSON.parse(getOld[0].result)
      : null;

    var commands = [
      ['SET', 'sub:' + email, JSON.stringify({
        restaurants: restaurants,
        subscribedAt: Date.now()
      })]
    ];

    // Remove from old restaurant sets no longer selected
    if (oldData && oldData.restaurants) {
      oldData.restaurants.forEach(function (oldId) {
        if (restaurants.indexOf(oldId) === -1) {
          commands.push(['SREM', 'restaurant:' + oldId + ':subs', email]);
        }
      });
    }

    // Add to selected restaurant sets
    restaurants.forEach(function (id) {
      commands.push(['SADD', 'restaurant:' + id + ':subs', email]);
    });

    await redisCommand(commands);

    return res.json({
      success: true,
      message: "you're in! we'll email you when reservations drop."
    });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'something went wrong. try again?' });
  }
};
