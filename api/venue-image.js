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

    // Try multiple known locations where Resy stores venue images
    var imageUrl = null;

    // data.images could be an array of URLs or objects
    var images = data && data.images;
    if (Array.isArray(images) && images.length > 0) {
      // Could be string URLs or objects with a url property
      var first = images[0];
      imageUrl = (typeof first === 'string') ? first : (first && (first.url || first.src));
    } else if (typeof images === 'string') {
      imageUrl = images;
    }

    // Fallback: check data.image (singular)
    if (!imageUrl && data && data.image) {
      var img = data.image;
      imageUrl = (typeof img === 'string') ? img : (img && (img.url || img.src));
    }

    // Fallback: check data.config.images or data.media
    if (!imageUrl && data && data.config && data.config.images) {
      var cfgImg = data.config.images;
      if (Array.isArray(cfgImg) && cfgImg.length > 0) {
        var cfgFirst = cfgImg[0];
        imageUrl = (typeof cfgFirst === 'string') ? cfgFirst : (cfgFirst && (cfgFirst.url || cfgFirst.src));
      }
    }

    if (!imageUrl && data && data.media && data.media.images) {
      var mediaImg = data.media.images;
      if (Array.isArray(mediaImg) && mediaImg.length > 0) {
        var mFirst = mediaImg[0];
        imageUrl = (typeof mFirst === 'string') ? mFirst : (mFirst && (mFirst.url || mFirst.src));
      }
    }

    // Cache aggressively — restaurant photos rarely change
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

    // Return debug info so we can see the actual structure
    return res.json({
      image: imageUrl,
      _debug_keys: data ? Object.keys(data) : [],
      _debug_images_type: typeof images,
      _debug_images_sample: Array.isArray(images) ? images.slice(0, 2) : images
    });
  } catch (err) {
    console.error('Venue image error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
};
