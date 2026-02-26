var RESY_API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';
var RESY_BASE = 'https://api.resy.com';

var ALLOWED_SLUGS = ['bistrot-ha', 'the-polo-bar', 'the-corner-store'];

module.exports = async function handler(req, res) {
  var slug = req.query.slug;

  if (!slug || ALLOWED_SLUGS.indexOf(slug) === -1) {
    return res.status(400).json({ error: 'unknown restaurant' });
  }

  try {
    var venueRes = await fetch(
      RESY_BASE + '/3/venue?url_slug=' + encodeURIComponent(slug) + '&location=new-york-ny',
      {
        headers: {
          'Authorization': 'ResyAPI api_key="' + RESY_API_KEY + '"',
          'Accept': 'application/json',
          'User-Agent': 'ResArb/1.0'
        }
      }
    );

    if (!venueRes.ok) {
      return res.status(502).json({ error: 'resy returned ' + venueRes.status });
    }

    var data = await venueRes.json();
    var images = data && data.images;
    var imageUrl = null;

    if (Array.isArray(images) && images.length > 0) {
      imageUrl = images[0];
    } else if (typeof images === 'string') {
      imageUrl = images;
    }

    // Cache aggressively — restaurant photos rarely change
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.json({ image: imageUrl });
  } catch (err) {
    console.error('Venue image error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
};
