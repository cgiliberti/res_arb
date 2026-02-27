var crypto = require('crypto');
var redisCommand = require('../_redis').redisCommand;

// Restaurant config (keep in sync with app.js)
var RESTAURANTS = [
  { id: 'bistrot-ha', slug: 'bistrot-ha', name: 'Bistrot Ha', daysOut: 6,
    dropHour: 0, dropMinute: 0,
    resyUrl: 'https://resy.com/cities/new-york-ny/venues/bistrot-ha' },
  { id: 'polo-bar', slug: 'the-polo-bar', name: 'Polo Bar', daysOut: 30,
    dropHour: 10, dropMinute: 0,
    resyUrl: 'https://resy.com/cities/new-york-ny/venues/the-polo-bar' },
  { id: 'corner-store', slug: 'the-corner-store', name: 'Corner Store', daysOut: 14,
    dropHour: 10, dropMinute: 0,
    resyUrl: 'https://resy.com/cities/new-york-ny/venues/the-corner-store' }
];

var RESY_API_KEY = process.env.RESY_API_KEY || 'VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5';
var RESY_BASE = 'https://api.resy.com';

// ---- Time helpers ----

function getETComponents() {
  var parts = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).forEach(function (p) {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  });
  return parts;
}

function getDropDateISO(restaurant, et) {
  var d = new Date(et.year, et.month - 1, et.day);
  d.setDate(d.getDate() + restaurant.daysOut);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function formatDateNice(isoDate) {
  var d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatSlotTime(timeStr) {
  var timePart = (timeStr || '').split(' ')[1];
  if (!timePart) return timeStr;
  var pieces = timePart.split(':');
  var hours = parseInt(pieces[0], 10);
  var minutes = pieces[1];
  var period = hours >= 12 ? 'PM' : 'AM';
  var displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return displayHour + ':' + minutes + ' ' + period;
}

// ---- Resy availability ----

async function fetchAvailability(slug, date, partySize) {
  var headers = {
    'Authorization': 'ResyAPI api_key="' + RESY_API_KEY + '"',
    'Accept': 'application/json',
    'User-Agent': 'ResArb/1.0'
  };

  // Resolve venue ID
  var venueRes = await fetch(
    RESY_BASE + '/3/venue?url_slug=' + encodeURIComponent(slug) + '&location=new-york-ny',
    { headers: headers }
  );
  if (!venueRes.ok) return [];
  var venueData = await venueRes.json();
  var venueId = venueData && venueData.id && venueData.id.resy;
  if (!venueId) return [];

  // Fetch availability
  var findRes = await fetch(
    RESY_BASE + '/4/find?lat=0&long=0&day=' + encodeURIComponent(date)
    + '&party_size=' + partySize + '&venue_id=' + venueId,
    { headers: headers }
  );
  if (!findRes.ok) return [];
  var findData = await findRes.json();
  var venues = findData && findData.results && findData.results.venues;
  return (venues && venues[0] && venues[0].slots) || [];
}

// ---- Email ----

function generateUnsubToken(email) {
  return crypto.createHmac('sha256', process.env.CRON_SECRET || '')
    .update(email).digest('hex');
}

async function sendEmail(to, subject, html) {
  var from = process.env.RESEND_FROM || 'res arb <onboarding@resend.dev>';
  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from,
      to: [to],
      subject: subject,
      html: html
    })
  });
  if (!res.ok) {
    var body = await res.text().catch(function () { return ''; });
    console.error('Resend API error:', res.status, body);
  }
  return res.ok;
}

function buildEmailHtml(restaurant, date, slots, unsubUrl) {
  var dateNice = formatDateNice(date);
  var bookUrl = restaurant.resyUrl + '?date=' + date + '&seats=2';

  var slotsHtml;
  if (slots.length > 0) {
    var buttons = slots.slice(0, 12).map(function (slot) {
      var time = slot.date && slot.date.start;
      return '<span style="display:inline-block;padding:6px 14px;margin:3px;'
        + 'border:1px solid #1a1a1a;font-family:Courier New,monospace;font-size:14px;">'
        + formatSlotTime(time) + '</span>';
    }).join('');
    slotsHtml = '<p style="margin-top:20px;font-size:11px;text-transform:uppercase;'
      + 'letter-spacing:2px;color:#999;">Available Times</p>'
      + '<div style="margin-top:8px;">' + buttons + '</div>';
  } else {
    slotsHtml = '<p style="color:#999;font-style:italic;margin-top:16px;">'
      + 'Slots may still be loading \u2014 check Resy now!</p>';
  }

  return '<!DOCTYPE html><html><body style="font-family:Georgia,serif;'
    + 'max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">'
    + '<h2 style="font-weight:400;letter-spacing:-1px;font-size:1.4rem;">res arb</h2>'
    + '<hr style="border:none;border-top:1px solid #d9cdb7;margin:12px 0 20px;">'
    + '<h3 style="font-weight:700;margin:0;">' + restaurant.name + ' just dropped!</h3>'
    + '<p style="color:#555;margin-top:8px;">Reservations for <strong>' + dateNice
    + '</strong> (' + date + ') are now available.</p>'
    + slotsHtml
    + '<div style="margin-top:24px;">'
    + '<a href="' + bookUrl + '" style="display:inline-block;padding:12px 28px;'
    + 'background:#1a1a1a;color:#fff;text-decoration:none;font-family:Georgia,serif;'
    + 'font-size:16px;">Book Now on Resy</a>'
    + '</div>'
    + '<hr style="margin-top:32px;border:none;border-top:1px solid #d9cdb7;">'
    + '<p style="font-size:12px;color:#aaa;margin-top:12px;">'
    + 'You got this because you subscribed at res arb. '
    + '<a href="' + unsubUrl + '" style="color:#aaa;">Unsubscribe</a></p>'
    + '</body></html>';
}

// ---- Main handler ----

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Verify cron secret (Vercel sends this for cron invocations)
  var authHeader = req.headers['authorization'] || '';
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== 'Bearer ' + cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  var et = getETComponents();

  // Find restaurants dropping right now (within 5-minute window)
  var dropping = RESTAURANTS.filter(function (r) {
    return r.dropHour === et.hour && Math.abs(r.dropMinute - et.minute) <= 5;
  });

  if (dropping.length === 0) {
    return res.json({ message: 'no drops right now', etHour: et.hour, etMinute: et.minute });
  }

  var host = req.headers.host || 'res-arb.vercel.app';
  var results = [];

  for (var i = 0; i < dropping.length; i++) {
    var restaurant = dropping[i];
    var date = getDropDateISO(restaurant, et);

    // Check if we already notified for this restaurant+date
    var checkKey = 'notified:' + restaurant.id + ':' + date;
    var checkResult = await redisCommand([['GET', checkKey]]);
    if (checkResult[0] && checkResult[0].result) {
      results.push({ restaurant: restaurant.id, date: date, skipped: 'already notified' });
      continue;
    }

    // Get subscribers
    var subsResult = await redisCommand([['SMEMBERS', 'restaurant:' + restaurant.id + ':subs']]);
    var emails = (subsResult[0] && subsResult[0].result) || [];

    if (emails.length === 0) {
      results.push({ restaurant: restaurant.id, date: date, subscribers: 0, skipped: 'no subscribers' });
      continue;
    }

    // Wait 30s for Resy to populate slots after drop
    await new Promise(function (resolve) { setTimeout(resolve, 30000); });

    // Fetch availability
    var slots = await fetchAvailability(restaurant.slug, date, 2);

    // Send emails
    var sent = 0;
    for (var j = 0; j < emails.length; j++) {
      var email = emails[j];
      var token = generateUnsubToken(email);
      var unsubUrl = 'https://' + host + '/api/unsubscribe?email='
        + encodeURIComponent(email) + '&token=' + token;

      var html = buildEmailHtml(restaurant, date, slots, unsubUrl);
      var subject = restaurant.name + ' reservations just dropped!';

      var ok = await sendEmail(email, subject, html);
      if (ok) sent++;
    }

    // Mark as notified (expire after 48 hours)
    await redisCommand([['SET', checkKey, '1', 'EX', '172800']]);

    results.push({
      restaurant: restaurant.id,
      date: date,
      subscribers: emails.length,
      sent: sent,
      slots: slots.length
    });
  }

  return res.json({ results: results });
};
