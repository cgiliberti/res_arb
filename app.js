// ============================================================
// Restaurant Configuration
// To add a new restaurant, add an entry here and add its
// slug to the allowlist in api/availability.js.
// ============================================================

var RESTAURANTS = [
  {
    id: 'bistrot-ha',
    name: 'Bistrot Ha',
    slug: 'bistrot-ha',
    address: '137 Eldridge St \u00b7 Lower East Side',
    description: 'French-Vietnamese bistro from the team behind Ha\u2019s Snack Bar.',
    note: 'Walk-ins possible \u2014 line up by 4:45 PM.',
    color: '#4a6741',
    drop: { daysOut: 6, hour: 0, minute: 0 },
    dropLabel: '6 days out \u00b7 midnight ET',
    resyUrl: 'https://resy.com/cities/new-york-ny/venues/bistrot-ha'
  },
  {
    id: 'polo-bar',
    name: 'Polo Bar',
    slug: 'the-polo-bar',
    address: '1 E 55th St \u00b7 Midtown',
    description: 'Ralph Lauren\u2019s clubby American restaurant. Jacket suggested.',
    note: 'Most reservations are phone-only. Resy shows limited pre/post-theater times.',
    phone: '212-207-8562',
    color: '#1a3a5c',
    drop: { daysOut: 30, hour: 10, minute: 0 },
    dropLabel: '30 days out \u00b7 10:00 AM ET',
    resyUrl: 'https://resy.com/cities/new-york-ny/venues/the-polo-bar'
  },
  {
    id: 'corner-store',
    name: 'Corner Store',
    slug: 'the-corner-store',
    address: '324 Lafayette St \u00b7 NoHo',
    description: 'Neighborhood restaurant from the team behind King and Cervo\u2019s.',
    note: 'Bar seats are walk-in only (first come, first served).',
    color: '#8b4513',
    drop: { daysOut: 14, hour: 10, minute: 0 },
    dropLabel: '14 days out \u00b7 10:00 AM ET',
    resyUrl: 'https://resy.com/cities/new-york-ny/venues/the-corner-store'
  }
];

// ============================================================
// Time Utilities
// ============================================================

function getETComponents() {
  var parts = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date()).forEach(function (p) {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  });
  return parts;
}

function getDropInfo(restaurant) {
  var et = getETComponents();
  var dropSec = restaurant.drop.hour * 3600 + restaurant.drop.minute * 60;
  var nowSec = et.hour * 3600 + et.minute * 60 + et.second;

  var passed = nowSec >= dropSec;
  var secsUntil = passed
    ? (86400 - nowSec + dropSec)
    : (dropSec - nowSec);

  // Midnight drops: if drop is at 00:00 and nowSec is 0, it just happened
  // (passed = true), so next drop is tomorrow. That's correct.

  var daysToAdd = passed ? 1 : 0;
  var dropDate = new Date(et.year, et.month - 1, et.day + daysToAdd);

  var openDate = new Date(dropDate);
  openDate.setDate(openDate.getDate() + restaurant.drop.daysOut);

  return { secsUntil: secsUntil, dropDate: dropDate, openDate: openDate };
}

function formatCountdown(totalSecs) {
  var h = Math.floor(totalSecs / 3600);
  var m = Math.floor((totalSecs % 3600) / 60);
  var s = totalSecs % 60;
  return h + 'h ' + String(m).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's';
}

function formatDateNice(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateISO(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function formatSlotTime(timeStr) {
  // timeStr is like "2026-03-12 18:00:00"
  var timePart = timeStr.split(' ')[1];
  if (!timePart) return timeStr;
  var pieces = timePart.split(':');
  var hours = parseInt(pieces[0], 10);
  var minutes = pieces[1];
  var period = hours >= 12 ? 'PM' : 'AM';
  var displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
  return displayHour + ':' + minutes + ' ' + period;
}

// ============================================================
// Placeholder Images
// ============================================================

function placeholderSVG(name, color) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="740" height="220" viewBox="0 0 740 220">'
    + '<rect width="100%" height="100%" fill="' + color + '"/>'
    + '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"'
    + ' font-family="Georgia, serif" font-size="28" fill="rgba(255,255,255,0.5)"'
    + ' font-style="italic">' + name + '</text>'
    + '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ============================================================
// Rendering
// ============================================================

function renderCard(restaurant) {
  var info = getDropInfo(restaurant);
  var defaultDate = formatDateISO(info.openDate);
  var imgSrc = placeholderSVG(restaurant.name, restaurant.color);

  var card = document.createElement('div');
  card.className = 'card';
  card.id = 'card-' + restaurant.id;

  var noteHtml = restaurant.note
    ? '<p class="card-note">' + restaurant.note + '</p>'
    : '';

  var phoneHtml = restaurant.phone
    ? '<a class="phone-link" href="tel:' + restaurant.phone + '">' + restaurant.phone + '</a>'
    : '';

  card.innerHTML = ''
    + '<img class="card-image" src="' + imgSrc + '" alt="' + restaurant.name + '">'
    + '<div class="card-body">'
    +   '<div class="card-name">' + restaurant.name + '</div>'
    +   '<div class="card-address">' + restaurant.address + '</div>'
    +   '<p class="card-desc">' + restaurant.description + '</p>'
    +   noteHtml
    +   '<div class="drop-box">'
    +     '<div class="drop-label">Next Drop</div>'
    +     '<div class="countdown" id="countdown-' + restaurant.id + '">' + formatCountdown(info.secsUntil) + '</div>'
    +     '<div class="drop-detail">opens reservations for <strong>' + formatDateNice(info.openDate) + '</strong></div>'
    +     '<div class="drop-schedule">' + restaurant.dropLabel + '</div>'
    +   '</div>'
    +   '<div class="availability-controls">'
    +     '<div class="control-group">'
    +       '<label for="date-' + restaurant.id + '">Date</label>'
    +       '<input type="date" id="date-' + restaurant.id + '" value="' + defaultDate + '">'
    +     '</div>'
    +     '<div class="control-group">'
    +       '<label for="party-' + restaurant.id + '">Party</label>'
    +       '<select id="party-' + restaurant.id + '">'
    +         '<option value="1">1</option>'
    +         '<option value="2" selected>2</option>'
    +         '<option value="3">3</option>'
    +         '<option value="4">4</option>'
    +       '</select>'
    +     '</div>'
    +     '<button class="btn" id="check-' + restaurant.id + '">Check Availability</button>'
    +   '</div>'
    +   '<div class="slots-section" id="slots-' + restaurant.id + '"></div>'
    +   '<div class="card-links">'
    +     '<a class="resy-link" href="' + restaurant.resyUrl + '" target="_blank" rel="noopener">\u2197 view on resy</a>'
    +     phoneHtml
    +   '</div>'
    + '</div>';

  return card;
}

function renderSlots(restaurantId, data) {
  var el = document.getElementById('slots-' + restaurantId);
  var restaurant = RESTAURANTS.find(function (r) { return r.id === restaurantId; });

  if (!data.slots || data.slots.length === 0) {
    el.innerHTML = '<p class="slots-empty">no tables available for this date and party size</p>';
    return;
  }

  var slotsHtml = data.slots.map(function (slot) {
    var timeDisplay = formatSlotTime(slot.time);
    var bookUrl = restaurant.resyUrl + '?date=' + data.date + '&seats=' + data.party_size;
    return '<a class="slot-btn" href="' + bookUrl + '" target="_blank" rel="noopener">' + timeDisplay + '</a>';
  }).join('');

  el.innerHTML = ''
    + '<div class="slots-label">Available Times</div>'
    + '<div class="slots-grid">' + slotsHtml + '</div>';
}

// ============================================================
// Availability Fetching
// ============================================================

function checkAvailability(restaurantId) {
  var restaurant = RESTAURANTS.find(function (r) { return r.id === restaurantId; });
  var date = document.getElementById('date-' + restaurantId).value;
  var partySize = document.getElementById('party-' + restaurantId).value;
  var el = document.getElementById('slots-' + restaurantId);

  el.innerHTML = '<p class="slots-loading">checking resy...</p>';

  fetch('/api/availability?slug=' + encodeURIComponent(restaurant.slug)
    + '&date=' + encodeURIComponent(date)
    + '&party_size=' + encodeURIComponent(partySize))
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      renderSlots(restaurantId, data);
    })
    .catch(function () {
      el.innerHTML = '<p class="slots-error">couldn\u2019t fetch availability. '
        + '<a href="' + restaurant.resyUrl + '" target="_blank" rel="noopener">try resy directly</a></p>';
    });
}

// ============================================================
// Countdown Ticker
// ============================================================

function updateCountdowns() {
  RESTAURANTS.forEach(function (restaurant) {
    var info = getDropInfo(restaurant);
    var el = document.getElementById('countdown-' + restaurant.id);
    if (!el) return;

    el.textContent = formatCountdown(info.secsUntil);

    if (info.secsUntil < 300) {
      el.classList.add('urgent');
    } else {
      el.classList.remove('urgent');
    }

    // Update the "opens reservations for" text in case the day rolled over
    var detailEl = el.nextElementSibling;
    if (detailEl && detailEl.classList.contains('drop-detail')) {
      detailEl.innerHTML = 'opens reservations for <strong>' + formatDateNice(info.openDate) + '</strong>';
    }
  });
}

// ============================================================
// Init
// ============================================================

function init() {
  var main = document.getElementById('restaurants');

  RESTAURANTS.forEach(function (restaurant) {
    var card = renderCard(restaurant);
    main.appendChild(card);

    // Bind check button
    document.getElementById('check-' + restaurant.id)
      .addEventListener('click', function () {
        checkAvailability(restaurant.id);
      });
  });

  // Tick countdowns every second
  setInterval(updateCountdowns, 1000);
}

document.addEventListener('DOMContentLoaded', init);
