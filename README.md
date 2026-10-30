# Coach Raul Payares — website

Marketing site and booking funnel for Raul Payares, a fitness and mental coach based in Berlin.
Personal training, nutrition coaching, mindset coaching, and a 90-day transformation program.

The design is a Canva one-pager the client approved; `design/` notes below explain how to get at it.
Everything is built from that design: black background, neon-yellow (`#d4ff00`) accents, wide light
all-caps display type.

## Why this stack

The site has to do four things that a Canva-published page cannot: take payments, let people book,
stay editable by a non-developer, and be something we control the source of. It does **not** need
user accounts — that decision is what keeps the stack this small.

| Concern         | Choice                   | Notes                                                            |
| --------------- | ------------------------ | ---------------------------------------------------------------- |
| Site            | **Astro 7**              | Static output, zero JS shipped by default                        |
| Styling         | **Plain scoped CSS**     | One page didn't justify Tailwind. Tokens in `Layout.astro`       |
| Content editing | **Sanity**               | Studio at `/studio`; publish is live immediately, no deploy      |
| Payments        | **Stripe Payment Links** | Hosted checkout, no backend, no webhooks, no card data           |
| Booking         | **Cal.com**              | Linked, not embedded — an iframe would leak visitor IPs on load  |
| Contact         | **`mailto:` / WhatsApp** | No backend to post a form to, and nothing yet needs one          |
| Hosting         | **Cloudflare Workers**   | Home page renders per request; everything else is a static asset |
| Database        | **None**                 | Stripe, Cal.com and Sanity each hold their own state             |

Class signups go through Cal.com rather than a form writing to our own database. Cal.com enforces
seats per slot, sends the confirmations and reminders, syncs Raul's calendar, gives him a dashboard
he can read without us, and exports CSV when we want the numbers. A self-built version would mean a
server runtime, a database, a capacity check that must not double-book under concurrency, spam
protection on a public endpoint, and a second processor in the Datenschutzerklärung — to arrive at
the same place. If we ever do need our own table, it is Cloudflare D1 on the host we already use,
not a move to another platform.

## Feature status

### Built

- [x] Hero with headline, subline and primary CTA
- [x] "Meet Coach Raul Payares" bio section
- [x] Four service cards (Personal Training, Nutrition, Mindset, 90-Day Challenge)
- [x] Success stories grid (4 testimonials)
- [x] Footer with logo, "Stay connected", social icons and legal links
- [x] Group classes section linking out to Cal.com booking — link still a `#` placeholder
- [x] Impressum and Datenschutzerklärung (German, as the law requires) — details still placeholders
- [x] Contact links in the footer — email, phone, WhatsApp — details still placeholders
- [x] Self-hosted Archivo — no request leaves the visitor's browser for a Google domain
- [x] Responsive down to phone width
- [x] Automatic responsive image optimization (PNG → WebP, ~6.9 MB → ~700 KB)
- [x] CI: formatting, type-check, build, tests
- [x] Sanity CMS — hero copy, bio, services, success stories and social links are all editable
- [x] Side-by-side preview of unpublished edits, and publishing without a deploy

### Requested, not yet built

| #   | Feature             | Plan                                                                                                               |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Registrations       | Answered: class slot booking, via Cal.com seats. Section built; needs the real event link                          |
| 2   | Payment links       | One Stripe Payment Link per service, wired to each `GET STARTED`                                                   |
| 3   | Intro video         | Section between hero and bio; YouTube/Vimeo embed                                                                  |
| 4   | Real client reviews | Replace the Canva placeholder copy and stock photos                                                                |
| 5   | Social media links  | Real profile URLs on the four footer icons                                                                         |
| 7   | Search bar          | **Deliberately skipped.** One page, ~5 sections — nothing to search. Revisit only if the site grows past ~10 pages |

### Launch checklist

These are encoded as `it.todo(...)` entries in `tests/build-output.test.ts`. Turn each into a real
assertion as the content lands:

- [ ] `X-Robots-Tag: noindex` removed from `public/_headers` — do this **last**, once
      everything else here is ticked
- [ ] `src/legal.ts` carries Raul's real address, phone and email — the Impressum is unusable without them
- [ ] `bookingHref` in `src/pages/index.astro` points at the real Cal.com event instead of `#`
- [ ] The Art. 28 AVV with Cal.com is signed, and the Kursbuchung section of `datenschutz.astro`
      matches reality (see the TODOs in its frontmatter)
- [ ] Every CTA points at a real Stripe Payment Link instead of `#`
- [ ] Real testimonials replace the Canva placeholder copy and stock portraits
- [ ] Each social icon links to a real profile
- [ ] Hero photo replaced — the current one is an AI composite with a cropped-off Meta AI watermark
- [ ] `gym-weights.png` swapped for an Unsplash/Pexels equivalent (Canva stock licensing is scoped to Canva designs)

## CMS

Content lives in Sanity. **Publishing is live immediately — there is no deploy and no rebuild.**
That is the whole reason the home page renders per request instead of being baked at build time.

### How the rendering splits

| Route                           | Rendering         | Why                                           |
| ------------------------------- | ----------------- | --------------------------------------------- |
| `/`                             | per request       | Reads the CMS, so a publish has to show up    |
| `/impressum/`, `/datenschutz/`  | prerendered       | Content comes from `src/legal.ts`, not Sanity |
| `/404`                          | prerendered       | Static                                        |
| `/studio`                       | prerendered shell | The Studio itself is a client-side React SPA  |
| `/api/draft/enable`, `/disable` | per request       | Set and clear the preview cookie              |

Only `/` costs a Worker invocation on a normal visit, and its HTML is cached at Cloudflare's edge
for 60 seconds (`s-maxage=60, stale-while-revalidate=600`). A publish is therefore visible within
about a minute. Set that to `0` in `src/pages/index.astro` if it ever needs to be instant — the
cost is one Sanity query per page view instead of one per minute.

### Preview

The Studio is mounted at **`/studio`**, on the same origin as the site. Sanity's Presentation tool
iframes the live site next to the editor and swaps content in as it is typed, before anything is
published.

Same-origin is deliberate: a Studio on `*.sanity.studio` previewing a site on another domain needs
CORS entries and a `SameSite=None` cookie, and this needs neither. It is also why `public/_headers`
sets `X-Frame-Options: SAMEORIGIN` rather than `DENY` — `DENY` blocks the preview iframe and the
pane renders blank with only a console error to explain it.

The preview flow:

1. Presentation mints a single-use secret and stores it in the dataset.
2. It opens `/api/draft/enable?sanity-preview-secret=…`.
3. That route validates the secret **against the dataset** and only then sets an httpOnly cookie.
4. While the cookie is set, `/` queries the `drafts` perspective with a read token and renders the
   visual-editing overlay. Nothing is cached (`private, no-store`).
5. `/api/draft/disable` clears it.

Validating the secret is what stops the route being an open switch for serving unpublished content
to anyone who guesses the path.

### What is editable

| Document       | Holds                                                                          |
| -------------- | ------------------------------------------------------------------------------ |
| `siteSettings` | Hero headline and subline (one entry per line), button label, bio, booking URL |
| `service`      | The four service cards — title, body, Stripe link, position                    |
| `testimonial`  | Success stories — quote, client name, photo, position                          |
| `social`       | Footer icons — network, accessible label, profile URL, position                |

Hero, portrait and footer photos are **not** in the CMS. They are design assets rather than content,
and keeping them local preserves the `astro:assets` optimization. Testimonial photos do go through
Sanity, served from its CDN — which is why `Testimonial.astro` uses a plain `<img>` with a `srcset`
rather than `<Image />`. Running both pipelines would download every image at build time to
re-encode what Sanity already encoded.

### First-time setup

```sh
npx sanity@latest init     # creates the project, prints a projectId
cp .env.example .env       # fill in projectId and a read token
npm run dev                # Studio at localhost:4321/studio
```

Then import the copy that used to be hardcoded, so the Studio does not start empty:

```sh
SANITY_WRITE_TOKEN=... node scripts/seed-sanity.mjs
```

### Environment

| Variable                   | Where                               | Secret?                            |
| -------------------------- | ----------------------------------- | ---------------------------------- |
| `PUBLIC_SANITY_PROJECT_ID` | local `.env`, Cloudflare build vars | no                                 |
| `PUBLIC_SANITY_DATASET`    | local `.env`, Cloudflare build vars | no                                 |
| `SANITY_READ_TOKEN`        | local `.env`, Cloudflare **secret** | **yes** — reads unpublished drafts |
| `SANITY_WRITE_TOKEN`       | nowhere but your shell, once        | **yes** — revoke after seeding     |

Set the read token as an encrypted secret, not a build variable:

```sh
npx wrangler secret put SANITY_READ_TOKEN
```

GitHub Actions sets placeholder values for the two public ones. That is honest rather than lazy:
the build never queries Sanity, because the only CMS-driven page renders per request.

### Placeholder links

The seed writes reserved `example.com` URLs rather than `#` for every link that does not exist yet
(Stripe, Cal.com, social profiles). A `#` renders as a button that looks live and does nothing;
`example.com` is visibly unfinished, and a launch gate in `tests/home-page.test.ts` asserts none of
them survive.

### A missing variable fails the request, deliberately

`src/lib/sanity.ts` throws when `PUBLIC_SANITY_PROJECT_ID` is unset, and every query throws on an
empty result rather than returning one. The alternative — falling back to placeholder content —
serves a page that looks fine while the CMS behind it does nothing. `tests/sanity.test.ts` pins
that behaviour.

## Build order

The remaining work has a deliberate sequence. Each step assumes the one before it:

1. ~~**Static page from the design**~~ — done. Real markup, hardcoded content.
2. ~~**Sanity.**~~ — done. Schema mirrors the arrays that used to sit at the top of
   `src/pages/index.astro`; see the CMS section below.
3. **Stripe Payment Links + Cal.com.** Paste the links into the service cards. If a service needs
   prepaid slot booking rather than a one-off purchase, use Cal.com's Stripe integration for it
   instead of a bare Payment Link. Cal.com is **linked, not embedded** — see below.
4. **Intro video section**, between hero and bio.

Cal.com is reached by a link rather than an `<iframe>`, and `tests/build-output.test.ts` asserts no
iframe reaches the built page. An embedded frame fetches on page load, so every visitor's IP goes to
Cal.com whether or not they ever intended to book — the same exposure that made remote Google Fonts
a standing Abmahnung risk, and it would falsify the "Keine Cookies, kein Tracking" section of the
Datenschutzerklärung. The same constraint applies to the intro video in step 4: a bare YouTube
embed is the identical problem and needs a click-to-load wrapper or a link.

A contact _form_ was considered and dropped. The footer's `mailto:`, `tel:` and WhatsApp links do
the same job with no endpoint, no Mailgun account, no secret to rotate, no spam filtering and no
validation to get wrong. Build `src/pages/api/contact.ts` when those links demonstrably are not
enough — and note that doing so is what first forces a server runtime into a static site.

## Waiting on the client

None of these are blocked on engineering:

- Real testimonials — names, quotes, photos (4 of them)
- Social profile URLs for Facebook, X, Instagram, TikTok
- Contact details: email and phone. The phone number has to be in international format
  (`+49 30 …`) or the WhatsApp link will not resolve
- A postal address for the Impressum, and whether he has a USt-IdNr. § 5 DDG needs a real
  street address — a PO box does not satisfy it
- A Stripe account, plus the price of each service
- The intro video
- A replacement hero photo (see the launch checklist)
- A Cal.com account with the class event type configured (**Offer Seats** set to the class size,
  which is on the free plan), the public event URL, and the signed Art. 28 AVV. Confirm whether
  recurring events are available on the plan he ends up on — sources disagreed on that one

## Deployment

Pushes to `main` build and deploy automatically through Cloudflare Workers Builds.

Live at **https://coach-raul.timo-roessner.workers.dev** — temporary, and `noindex`ed.

The build emits two directories, which is a change from when the whole site was static:

- `dist/client/` — static assets, the prerendered pages, `_headers`, the Studio bundle
- `dist/server/` — the Worker that renders `/`, plus a generated `wrangler.json`

That generated config is the one that gets deployed. **`wrangler.jsonc` in the repo root
deliberately sets no `main` and no `assets`**: the Cloudflare Vite plugin derives both from the
build, and hardcoding them makes it try to resolve an entry point that does not exist until the
build has already run.

- `astro.config.mjs` — `site` feeds the canonical URL and `og:url`. **It currently points at the
  workers.dev hostname**; swap it the day a real domain is attached, or the two will compete in
  search results.
- `.nvmrc` — pins Node 22, matching CI. Cloudflare's default is older than `engines` allows.
- `public/_headers` — response headers. Two separate noindex rules: a temporary site-wide one that
  comes off at launch, and a permanent one on `/studio/*` that does not.

Cloudflare needs, once:

- `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` as build variables
- `SANITY_READ_TOKEN` as an encrypted secret (`npx wrangler secret put SANITY_READ_TOKEN`)

Astro's session storage is enabled by the adapter and backed by a `SESSION` KV namespace that
Cloudflare provisions on first deploy. Nothing here uses sessions; it costs nothing to leave alone.

Cloudflare builds `main` without running the tests. The GitHub Actions workflow is the gate, and it
only runs on pull requests — so keep merging through PRs rather than pushing to `main`.

## Getting started

```sh
npm install
npm run dev        # http://localhost:4321
```

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Dev server on `localhost:4321`                             |
| `npm run build`        | Production build to `./dist/`                              |
| `npm run preview`      | Serve the built site locally                               |
| `npm run check`        | `astro check` — type-checks components and frontmatter     |
| `npm run format`       | Prettier, writing fixes                                    |
| `npm run format:check` | Prettier, failing instead of fixing (what CI runs)         |
| `npm test`             | Vitest — **requires a build first**, it asserts on `dist/` |
| `npm run ci`           | format → check → build → test. Run before pushing.         |

## Project structure

```text
src/
├── assets/            images, imported by components so Astro optimizes them
├── components/
│   ├── Logo.astro          CRP wordmark, light + accent variants
│   ├── ServiceCard.astro   one service, repeated 4x
│   ├── SocialLinks.astro   footer icons; SVG paths live here
│   └── Testimonial.astro   one success story, repeated 4x
├── layouts/
│   └── Layout.astro   html shell, meta tags, design tokens, global styles
├── pages/
│   ├── index.astro        the page; section content lives in arrays at the top
│   ├── 404.astro          served by Cloudflare via not_found_handling
│   ├── impressum.astro    § 5 DDG anbieterkennzeichnung
│   └── datenschutz.astro  Art. 13 DSGVO privacy notice
├── lib/
│   └── sanity.ts      published + draft clients, typed GROQ, image URLs, guards
├── sanity/
│   └── schemaTypes/   one file per document type
└── legal.ts            operator name, address and contact, shared by both legal pages
sanity.config.ts        Studio wiring: Presentation preview + the siteSettings singleton
scripts/
└── seed-sanity.mjs     one-shot import of the formerly hardcoded copy
tests/
├── home-page.test.ts       the home page, rendered through Astro's container
├── build-output.test.ts    the prerendered pages, read from dist/client/
├── legal.test.ts           phone/WhatsApp link transforms
└── sanity.test.ts          the env and empty-result guards
```

`src/pages/index.astro` renders per request; `tests/home-page.test.ts` therefore renders it through
Astro's container against a fixture rather than reading a file out of `dist/`. That is also why
`astro.config.mjs` skips the Cloudflare adapter when `VITEST` is set — its Vite plugin otherwise
takes the test runner into workerd, where the runner's own entry point cannot load.

Section content used to sit in plain arrays at the top of `index.astro`. It now comes from Sanity,
and the schema in `studio/schemaTypes/` mirrors the shape those arrays had.

## Design source

**`design/canva-design.pdf` is the approved design and the spec for this site.** It is committed so
it stays readable without Canva access — read it directly rather than trying to fetch the Canva link.

The original lives at `https://www.canva.com/design/DAHZUSoMBCo/V4CFaw5l2yikSnc2lXJAvQ/edit`. That is
login-only and returns 403 to any fetch; re-export it as **Share → Download → PDF Standard** if the
design changes.

All images in `src/assets/` were pulled from that PDF with `pdfimages -png design/canva-design.pdf out`,
which is far quicker than exporting them one at a time from Canva. The hero needed its Meta AI
watermark bars cropped off with `sips --cropOffset` afterwards.

One deliberate deviation from the design: the Canva hero crops both heads off. Here the hero uses
`object-position: center 18%` so the faces stay in frame. Change that one value in `index.astro` to
restore the original crop.
