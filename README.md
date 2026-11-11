# Spin for Supper 🎡

Can't decide where to eat? Enter a zip or city (or tap **Near me**), pick one or more cravings, your budget,
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

## Analytics

Set these in Vercel (Settings → Environment Variables), then redeploy:

- `NEXT_PUBLIC_GA_ID`: your Google Analytics 4 measurement ID (`G-XXXXXXXXXX`). Page views are tracked automatically,
  plus these events: `search`, `new_wheel`, `spin_result`, `veto`, `view` (wheel/list), `open_listing`, `lets_go`,
  `open_website`, `theme`.
- `NEXT_PUBLIC_GTM_ID` (optional): a Google Tag Manager container (`GTM-XXXXXXX`) for adding other tags
  (Meta Pixel, ad conversions, etc.) without code changes.

## Keeping Google Places costs down

Each search costs one billed Text Search call per craving (max 4). The app already:

- asks for one page of results only, and only requests the pricier kid-friendly fields when "Kids coming" is on;
- reshuffles the places it already has for **New wheel** and for repeat searches with the same filters (no new call);
- limits each visitor to 20 Google searches per 10 minutes.

On the Google Cloud side, also set a hard cap: **APIs & Services → Places API (New) → Quotas** → lower
"Text Search requests per day" (e.g. 300), and add a budget alert under **Billing → Budgets & alerts**.

## Admin panel (`/admin`)

1. In Vercel, add `ADMIN_PASSWORD` (Settings → Environment Variables).
2. Connect storage so counts and settings survive deploys: Vercel → Storage → **Upstash for Redis** → Create →
   connect to this project (it adds `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically).
3. Redeploy, then open `/admin`.

What it does: today's searches, Google calls and estimated cost; a daily cap on Google calls (visitors see sample
restaurants once it's hit); a pause switch; a 14-day history with Book/Order/Maps click counts; the Book and Order
link templates (paste affiliate links there, using `{name}`, `{query}` or `{address}`); and the blocklist. While logged
in, every restaurant popup on the main site has a "Block this place" button.

Optional: `NEXT_PUBLIC_CONTACT_EMAIL` adds a contact line to `/privacy`.
