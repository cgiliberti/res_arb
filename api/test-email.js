module.exports = async function handler(req, res) {
  // Only allow with cron secret for security
  var secret = req.query.secret || '';
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  var to = req.query.to || 'chris@itsavail.com';

  // Build a sample email with fake slots
  var restaurant = { name: 'Polo Bar', resyUrl: 'https://resy.com/cities/new-york-ny/venues/the-polo-bar' };
  var date = '2026-03-28';
  var bookUrl = restaurant.resyUrl + '?date=' + date + '&seats=2';

  var sampleSlots = ['5:30 PM', '6:00 PM', '7:00 PM', '7:30 PM', '8:00 PM', '9:00 PM'];
  var buttons = sampleSlots.map(function (time) {
    return '<span style="display:inline-block;padding:6px 14px;margin:3px;'
      + 'border:1px solid #1a1a1a;font-family:Courier New,monospace;font-size:14px;">'
      + time + '</span>';
  }).join('');

  var html = '<!DOCTYPE html><html><body style="font-family:Georgia,serif;'
    + 'max-width:600px;margin:0 auto;padding:24px;color:#1a1a1a;">'
    + '<h2 style="font-weight:400;letter-spacing:-1px;font-size:1.4rem;">res arb</h2>'
    + '<hr style="border:none;border-top:1px solid #d9cdb7;margin:12px 0 20px;">'
    + '<h3 style="font-weight:700;margin:0;">' + restaurant.name + ' just dropped!</h3>'
    + '<p style="color:#555;margin-top:8px;">Reservations for <strong>Sat, Mar 28</strong>'
    + ' (' + date + ') are now available.</p>'
    + '<p style="margin-top:20px;font-size:11px;text-transform:uppercase;'
    + 'letter-spacing:2px;color:#999;">Available Times</p>'
    + '<div style="margin-top:8px;">' + buttons + '</div>'
    + '<div style="margin-top:24px;">'
    + '<a href="' + bookUrl + '" style="display:inline-block;padding:12px 28px;'
    + 'background:#1a1a1a;color:#fff;text-decoration:none;font-family:Georgia,serif;'
    + 'font-size:16px;">Book Now on Resy</a>'
    + '</div>'
    + '<hr style="margin-top:32px;border:none;border-top:1px solid #d9cdb7;">'
    + '<p style="font-size:12px;color:#aaa;margin-top:12px;">'
    + 'You got this because you subscribed at res arb. '
    + '<a href="#" style="color:#aaa;">Unsubscribe</a></p>'
    + '</body></html>';

  var emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'res arb <onboarding@resend.dev>',
      to: [to],
      subject: 'Polo Bar reservations just dropped!',
      html: html
    })
  });

  var result = await emailRes.json();
  return res.json({ ok: emailRes.ok, status: emailRes.status, result: result });
};
