# Spin for Supper 🎡

Can't decide where to eat? Enter a zip (or tap **Near me**), pick what you're craving, your budget,
whether the kids are coming, and hit **Make my wheel!** The wheel loads with random nearby restaurants
that match. Spin it and go. Tap any slice to peek at that restaurant's Google listing.

Built with Next.js. Restaurant data comes from the **Google Places API (New)** through a server route
(`app/api/restaurants/route.ts`), so the API key never reaches the browser. With no key set, the app
runs in **demo mode** with made-up restaurants.

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste your key (optional)
npm run dev                  # http://localhost:3000
```

## Get a Google Places API key

1. Go to <https://console.cloud.google.com/>, create (or pick) a project, and turn on billing.
   Google gives a monthly free allowance that easily covers personal use.
2. **APIs & Services → Library** → enable **Places API (New)**.
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Restrict the key: under *API restrictions* choose **Places API (New)** only.
   (Leave *Application restrictions* as *None*; the key is only used server-side.)
5. Optional but smart: set a budget alert or a daily quota cap on the Places API.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo. Framework is detected as Next.js.
3. Under **Environment Variables**, add `GOOGLE_PLACES_API_KEY` with your key.
4. Deploy. Location sharing ("Near me") needs HTTPS, which Vercel gives you automatically.

## How picking works

- One search returns up to 40 restaurants (two pages) matching cuisine, price, and "open now".
- **Kids coming** drops places Google marks as not good for children and favors ones marked good.
- 8 are picked at random for the wheel, so every **New wheel** is different.
- **Nope, spin again** removes the winner from the wheel.
