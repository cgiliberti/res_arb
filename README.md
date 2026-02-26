# res arb

Secret weapon to land the most competitive NYC restaurant reservations.

Shows countdowns to the next reservation drop for each restaurant and lets you check what's available on Resy in real time.

## Restaurants

| Restaurant | Drop Schedule | Platform |
|---|---|---|
| Bistrot Ha | 6 days out, midnight ET | Resy |
| Polo Bar | 30 days out, 10:00 AM ET | Resy + Phone |
| Corner Store | 14 days out, 10:00 AM ET | Resy |

## Setup

### Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add the environment variable `RESY_API_KEY` (see below)
4. Deploy

### Resy API Key

The app uses Resy's public-facing API to check availability. Set the `RESY_API_KEY` environment variable in your Vercel project settings.

You can find the current API key by:
1. Opening any restaurant page on resy.com
2. Opening browser DevTools > Network tab
3. Looking at the `Authorization` header on any `api.resy.com` request

### Local Development

```
npx vercel dev
```

Then open http://localhost:3000.

## Adding a Restaurant

1. Add an entry to the `RESTAURANTS` array in `app.js`
2. Add the Resy slug to `ALLOWED_SLUGS` in `api/availability.js`
3. To use a real photo, replace the placeholder by changing the `<img>` src or adding image handling

## How It Works

- **Countdowns**: Calculated client-side using `Intl.DateTimeFormat` for accurate ET timezone handling. Ticks every second.
- **Availability**: Client calls `/api/availability` which proxies to Resy's `/4/find` endpoint. Venue IDs are resolved from URL slugs and cached.
- **Booking**: Time slot buttons link to the restaurant's Resy page with date and party size pre-filled. The actual booking happens on Resy.
