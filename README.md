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
- [x] Group classes section linking out to Cal.com booking — link still the seeded `example.com` placeholder
- [x] Impressum and Datenschutzerklärung (German, as the law requires) — details still placeholders
- [x] Contact links in the footer — email, phone, WhatsApp — details still placeholders
- [x] Self-hosted Archivo — no request leaves the visitor's browser for a Google domain
- [x] Responsive down to phone width
- [x] Automatic responsive image optimization (PNG → WebP, ~6.9 MB → ~700 KB)
- [x] CI: formatting, type-check, build, tests
- [x] Sanity CMS — hero copy and photo, bio, services, success stories and social links are all editable
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

These are encoded as `it.todo(...)` entries in `tests/build-output.test.ts` and
`tests/home-page.test.ts`. Turn each into a real assertion as the content lands — except the
placeholder-link gate, which cannot be a test (see below):

- [ ] `X-Robots-Tag: noindex` removed from **both** `public/_headers` _and_
      `src/pages/index.astro` — the home page renders per request and never sees
      `_headers`. Do this **last**, once everything else here is ticked
- [ ] Domain swap, when a real domain is attached — four things change together:
      `site` in `astro.config.mjs`, the Sanity **CORS origin**, the Sanity
      **Studio host URL**, and the canonical/`og:url` they feed
- [ ] `src/legal.ts` carries Raul's real address, phone and email — the Impressum is unusable without them
- [ ] `siteSettings.bookingUrl` holds the real Cal.com event link instead of the `example.com`
      placeholder. This is **CMS content, not code** — Raul pastes it in the Studio and it is live
      within ~60s. See the Cal.com runbook below
- [ ] The Art. 28 AVV with Cal.com is signed, and the Kursbuchung section of `datenschutz.astro`
      matches reality (see the TODOs in its frontmatter)
- [ ] Every CTA points at a real Stripe Payment Link instead of `#`
- [ ] Real testimonials replace the Canva placeholder copy and stock portraits
- [ ] Each social icon links to a real profile
- [ ] Hero photo replaced — the current one is an AI composite with a cropped-off Meta AI watermark.
      This one is now a Studio upload rather than a code change (Site settings → Hero photo)
- [ ] `gym-weights.png` swapped for an Unsplash/Pexels equivalent (Canva stock licensing is scoped to Canva designs)

### Operational follow-ups

Not launch blockers, but open and easy to forget. Each one is done in a dashboard, not in this repo.

- [ ] **Delete the stray `SANITY_READ_TOKEN` from Cloudflare → Settings → _Build_ → Variables.**
      It belongs in **Runtime** only, where it already is. The build copy was added while
      diagnosing a 500 and nothing reads it — it is a credential sitting somewhere it has no
      reason to be
- [ ] **Revoke the `seed` (Editor) token** in sanity.io/manage, and drop `SANITY_WRITE_TOKEN` from
      the local `.env`. It existed to run `scripts/seed-sanity.mjs` and the hero upload. Both are
      done; re-issue one if the dataset ever needs re-seeding
- [ ] **Invite Raul as an Editor** on the Sanity project, so he edits content under his own login
- [ ] **Check what Sanity's free tier covers** before the trial lapses — it was showing "26 days
      left" on 2026-11-03, so roughly **2026-11-29**
- [ ] **Add `http://localhost:4321` as a Sanity CORS origin** if the Studio is ever to be used
      locally. Only the deployed origin is registered today
- [ ] **Declare `@sanity/preview-url-secret` in `package.json`.** `src/pages/api/draft/enable.ts`
      imports it, but it only resolves as a transitive dependency of `sanity`. It works today and
      breaks silently the day a `sanity` bump stops pulling it in

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

#### If Presentation says "Unable to connect"

The console message is _"Unable to connect to visual editing. Make sure you've setup
'@sanity/visual-editing' correctly"_, the document list is empty and the Edit toggle does nothing.

**Check the overlay is actually being emitted before suspecting draft mode.** Draft mode failing
and the overlay missing look identical from the Studio, and they are fixed in completely different
places. Distinguish them from a terminal:

```sh
curl -sD - -H 'Cookie: sanity-draft-mode=true' http://localhost:4321/ -o /tmp/p.html | grep -i cache-control
grep -c astro-island /tmp/p.html
```

- `cache-control: private, no-store` → draft mode is **working** (`index.astro` sets that only in
  preview). Zero-width characters in the body confirm stega is encoding too.
- `astro-island` count of 0 → the overlay is **not** being emitted. That is the bug.

`@sanity/astro`'s `VisualEditing` component renders `null` unless it is passed `enabled`:

```astro
{enabled ? <VisualEditingComponent client:only="react" ... /> : null}
```

Gating it from the outside — `{preview && <VisualEditing />}` — type-checks, because `enabled` is
optional, and emits no island at all. It must be `<VisualEditing enabled={preview} />`.
`tests/home-page.test.ts` asserts both directions: island present in preview, absent without it.

**Open the Studio on this site's own hostname**, not through sanity.io. The draft cookie is
`SameSite=lax`, so a cross-site iframe drops it and preview silently never turns on.

### What is editable

| Document       | Holds                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------ |
| `siteSettings` | Hero headline and subline (one entry per line), hero photo, button label, bio, booking URL |
| `service`      | The four service cards — title, body, Stripe link, position                                |
| `testimonial`  | Success stories — quote, client name, photo, position                                      |
| `social`       | Footer icons — network, accessible label, profile URL, position                            |

The portrait and the footer photo are **not** in the CMS. They are design assets rather than
content, and keeping them local preserves the `astro:assets` optimization.

The hero photo and the testimonial photos **are**, because those are the ones Raul is expected to
change. They come from Sanity's CDN, which is why `Testimonial.astro` and the hero in
`index.astro` both use a plain `<img>` with a `srcset` rather than `<Image />` — running both
pipelines would download every image at build time to re-encode what Sanity already encoded.

`src/assets/hero.png` is still in the repo even though nothing imports it: `scripts/seed-sanity.mjs`
uploads it when bootstrapping a dataset.

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

### Build-time config and runtime secrets are different places

This has now caused two production-only failures, so it is worth stating plainly:

| Source                      | Reaches                         | Does **not** reach                     |
| --------------------------- | ------------------------------- | -------------------------------------- |
| Local `.env`                | `import.meta.env` at build time | anything at request time on Cloudflare |
| Cloudflare **build** vars   | `import.meta.env` at build time | the deployed Worker                    |
| Cloudflare **runtime** vars | `process.env` per request       | the build                              |

`PUBLIC_SANITY_PROJECT_ID` is baked into the bundle at build time, so it is a
**build** variable. `SANITY_READ_TOKEN` is read per request, so it is a
**runtime** secret and `import.meta.env` can never see it — `resolveSecret()`
in `src/lib/sanity.ts` checks both sides for exactly this reason.

Anything read in `astro.config.mjs` is a third case again: that file runs before
Astro populates `import.meta.env`, which is why it uses Vite's `loadEnv`.

Set the read token as an encrypted secret, not a build variable:

```sh
npx wrangler secret put SANITY_READ_TOKEN
```

GitHub Actions sets placeholder values for the two public ones. That is honest rather than lazy:
the build never queries Sanity, because the only CMS-driven page renders per request.

### Placeholder links

The seed writes reserved `example.com` URLs rather than `#` for every link that does not exist yet
(Stripe, Cal.com, social profiles). A `#` renders as a button that looks live and does nothing;
`example.com` is visibly unfinished.

**No test can gate these.** The home page renders from a mocked fixture, so the live Sanity value
never enters the test process — an assertion would only flip green when someone edits the fixture,
which gates nothing. That is why `it.todo('replaces every example.com placeholder link…')` is still
a todo and should stay one.

The gate that works is a GROQ query. Paste it into the Studio's **Vision** tool before launch; it
covers the booking link, the four Stripe links and the four social URLs at once:

```groq
*[defined(bookingUrl) && bookingUrl match "*example.com*"] + *[defined(href) && href match "*example.com*"]
```

An empty result means the gate passed.

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

Cal.com is reached by a link rather than an `<iframe>`, and `tests/home-page.test.ts` asserts no
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
- A Cal.com account with the class event type configured, the public event URL, and the signed
  Art. 28 AVV — see the runbook below

## Class booking (Cal.com)

Registration is a link out to a Cal.com event. Cal.com owns the schedule, the seat count, the
confirmations and the cancellations; this site owns one `<a>`. The URL is CMS content
(`siteSettings.bookingUrl`), so changing it needs no deploy.

### Do not turn on "Recurring"

Cal.com's docs state it verbatim: **"Recurring events are not available with seats, payments, or
the per-booker booking limit."** Seats are the entire mechanism of a group class, so Recurring
would silently reduce every slot to one attendee.

Weekly classes do **not** need that feature. Weekly repetition comes from the _availability
schedule_ — every Tuesday 18:30 becomes its own bookable slot with its own seats. Recurring is for
letting one person book a whole series in one action (term enrolment), which is a different
product and would also rule out prepayment.

On the **free plan this is self-enforcing**: Cal.com's pricing page lists "Recurring events" as a
Teams feature, so the trap cannot be sprung by accident. The warning stands anyway — it becomes
live the moment anyone upgrades, and a `Recurring` entry is visible in the event sidebar either
way.

### Status — where this stands (2026-11-05)

A scouting run on a **throwaway Cal.com account** (free plan, personal Google login) walked this
far and stopped. The account is disposable and none of it carries over: the real event must be
created under **Raul's own account**, because the Art. 28 AVV is accepted inside the account that
processes the bookings, and because Cal.com's free plan is **1 user** — there is no way to add a
second person to someone else's account, so this cannot be set up on his behalf and handed over.

**Verified against the live product, not the docs:**

| Question                           | Answer                                              |
| ---------------------------------- | --------------------------------------------------- |
| Is "Offer seats" on the free plan? | **Yes.** No `Teams` badge, no upgrade prompt        |
| Is paid booking on the free plan?  | **Yes**, same — relevant only if classes go prepaid |
| Does the seat setting persist?     | **Yes.** Set to 10, saved, hard-reloaded, still 10  |
| Does the booking page show seats?  | **Yes** — each slot renders "10 Seats available"    |

That first row was the load-bearing unknown in the plan; Cal.com's pricing page never names seats
at any tier, and the answer only exists in the product.

**Still to do, in order:**

1. Raul creates his own account with a **deliberate ASCII username** (see below)
2. Availability — the real class windows
3. Location — currently defaults to Cal Video
4. A test booking in a private window, watching the seat count drop
5. The Art. 28 AVV, and the three checks in `src/pages/datenschutz.astro`
6. Paste the public URL into Studio → Site settings → booking link

### The UI, as of 2026-11-05

Cal.com's own docs and every tutorial still say "Event Types → Advanced". **That navigation no
longer exists.** What is actually there:

- Left sidebar: Home, **Links**, Events, Bookings, Availability, Teams, Apps, Routing, Workflows,
  Insights. **"Links" is what the docs call "Event Types."**
- Inside an event, a second sidebar: **Setup** (Basics, Availability) · **Booking experience**
  (Booking form, Confirmation, Appearance, **Payments & Seats**, Recurring) · **Policies**
  (Limits & buffers, Reschedule & cancel, Privacy & security).

Seats live under **Payments & Seats**, not "Advanced". If a future redesign moves them again, the
fastest way to find anything in this product is to open the event and Cmd+F the page.

Paid-only features are labelled in place with a `Teams` badge and an Upgrade button — that is how
the free-plan questions above were answered, and how to answer the next one without reading a
pricing page.

### Setup

1. **Sign up at cal.com — as Raul, with a username chosen on purpose.** Signing up with Google
   generates one from the profile name plus a random suffix, and it does not sanitise it: this
   scouting account came out as `timo-roßner-prrjqm`. A `ß` in a URL percent-encodes to `%C3%9F`,
   which looks broken everywhere it is pasted. The username is the public booking URL. It can be
   changed later in Settings → Profile, but that **breaks every link already published**,
   including the one stored in Sanity.
2. **Links → + New.** Title "Group class" — visitors see this. Duration = real class length.
3. Event → **Setup → Availability** → **Custom**, and set the real class windows there (e.g.
   Tue 18:30–19:30, Thu 18:30–19:30). Timezone **Europe/Berlin**. The default is Cal.com's 9–5
   weekday schedule, which is not a class timetable.

   Custom rather than a named shared schedule because there is exactly one class event. Promote it
   to a shared schedule the day a second class type needs the same hours — not before.

   **This step is the weekly recurrence.** Every Tuesday 18:30 becomes its own bookable slot with
   its own seats. See the warning above for why this is not the "Recurring" feature.

4. Event → **Setup → Basics** → location → **In Person (organizer address)** with the gym address.
   The default is Cal Video. **Not** "In Person (attendee address)" — Cal.com blocks seats with
   that one.
5. Event → **Booking experience → Payments & Seats** → **Offer seats** on, seat count = room
   capacity. Then:
   - **"Share attendee information between guests" — leave unchecked.** On, it shows every
     attendee the names and email addresses of everyone else in the class. That is a disclosure of
     personal data to third parties with no legal basis behind it, and it would make the
     Kursbuchung section of `datenschutz.astro` untrue.
   - **"Show the number of available seats"** — on is fine and creates urgency as a class fills.
     The cost is that an empty class advertises its emptiness.
6. **Seats and manual approval are mutually exclusive.** The toggle's own help text: _"This
   automatically disables guest & opt-in bookings."_ Opt-in is "Requires confirmation", so on a
   seated event Raul cannot vet attendees before they take a seat. If vetting ever matters more
   than capacity, this whole approach needs revisiting.
7. Event → **Policies → Limits & buffers** → a minimum notice (e.g. 2 h), so nobody books a class
   starting in five minutes.
8. Copy the **public** link: `https://cal.com/<username>/<event-slug>`.
9. **Open it in a private window and book a test seat.** A login screen means the
   `app.cal.com/event-types/…` dashboard URL was copied by mistake — both forms pass the schema's
   URL validation, so nothing downstream will catch it. Watch the seat count drop by one; that is
   the only check that exercises the whole chain.
10. Studio → **Site settings** → booking link → paste → **Publish**. Live within ~60s, no deploy.

### If classes become prepaid

Cal.com's Stripe app charges on their hosted booking page, after slot selection. **Nothing in this
repo changes** — same URL, same link, same markup. What it does add is legal: prepayment makes it a
distance contract, so price-with-VAT, cancellation terms and a `Widerrufsbelehrung` have to exist
where the booker sees them, and Stripe must be named alongside Cal.com in the Kursbuchung section
of `datenschutz.astro`.

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
