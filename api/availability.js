var RESY_API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';
var RESY_BASE = 'https://api.resy.com';

// Allowed restaurant slugs — add new ones here when adding restaurants
var ALLOWED_SLUGS = ['bistrot-ha', 'the-polo-bar', 'the-corner-store'];

// In-memory venue ID cache (persists across warm invocations)
var venueIdCache = {};

function resyHeaders() {
  return {
    'Authorization': 'ResyAPI api_key="' + RESY_API_KEY + '"',
    'Accept': 'application/json',
    'User-Agent': 'ResArb/1.0'
  };
}

async function getVenueId(slug) {
  if (venueIdCache[slug]) return venueIdCache[slug];

  var res = await fetch(
    RESY_BASE + '/3/venue?url_slug=' + encodeURIComponent(slug) + '&location=new-york-ny',
    { headers: resyHeaders() }
  );

  if (!res.ok) return null;

  var data = await res.json();
  var id = data && data.id && data.id.resy;
  if (id) venueIdCache[slug] = id;
  return id;
}

module.exports = async function handler(req, res) {
  var slug = req.query.slug;
  var date = req.query.date;
  var partySize = req.query.party_size || '2';

  // Validate required params
  if (!slug || !date) {
    return res.status(400).json({ error: 'slug and date are required' });
  }

  // Validate slug against allowlist
  if (ALLOWED_SLUGS.indexOf(slug) === -1) {
    return res.status(400).json({ error: 'unknown restaurant' });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
  }

  // Validate party size
  var size = parseInt(partySize, 10);
  if (isNaN(size) || size < 1 || size > 20) {
    return res.status(400).json({ error: 'party_size must be 1-20' });
  }

  try {
    var venueId = await getVenueId(slug);
    if (!venueId) {
      return res.status(404).json({ error: 'venue not found on resy' });
    }

    var findUrl = RESY_BASE + '/4/find'
      + '?lat=0&long=0'
      + '&day=' + encodeURIComponent(date)
      + '&party_size=' + size
      + '&venue_id=' + venueId;

    var findRes = await fetch(findUrl, { headers: resyHeaders() });

    if (!findRes.ok) {
      return res.status(502).json({ error: 'resy api returned ' + findRes.status });
    }

    var findData = await findRes.json();
    var venues = findData && findData.results && findData.results.venues;
    var slots = (venues && venues[0] && venues[0].slots) || [];

    var availability = slots.map(function (slot) {
      return {
        time: slot.date && slot.date.start,
        endTime: slot.date && slot.date.end,
        type: slot.config && slot.config.type
      };
    });

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    return res.json({
      available: availability.length > 0,
      slots: availability,
      date: date,
      party_size: size,
      venue: slug
    });
  } catch (err) {
    console.error('Error fetching availability:', err);
    return res.status(500).json({ error: 'internal error' });
  }
};
