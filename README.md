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

| Concern         | Choice                           | Notes                                                      |
| --------------- | -------------------------------- | ---------------------------------------------------------- |
| Site            | **Astro 7**                      | Static output, zero JS shipped by default                  |
| Styling         | **Plain scoped CSS**             | One page didn't justify Tailwind. Tokens in `Layout.astro` |
| Content editing | **Sanity** _(planned)_           | Studio in-repo at `/studio` so Raul edits without a deploy |
| Payments        | **Stripe Payment Links**         | Hosted checkout, no backend, no webhooks, no card data     |
| Booking         | **Cal.com** _(planned)_          | Open source, embeddable, can carry Stripe prepayment       |
| Contact         | **`mailto:` / WhatsApp**         | No backend to post a form to, and nothing yet needs one    |
| Hosting         | **Cloudflare Pages** _(planned)_ | Static + one Worker for the contact endpoint               |
| Database        | **None**                         | Stripe, Cal.com and Sanity each hold their own state       |

## Feature status

### Built

- [x] Hero with headline, subline and primary CTA
- [x] "Meet Coach Raul Payares" bio section
- [x] Four service cards (Personal Training, Nutrition, Mindset, 90-Day Challenge)
- [x] Success stories grid (4 testimonials)
- [x] Footer with logo, "Stay connected", social icons and legal links
- [x] Impressum and Datenschutzerklärung (German, as the law requires) — details still placeholders
- [x] Contact links in the footer — email, phone, WhatsApp — details still placeholders
- [x] Self-hosted Archivo — no request leaves the visitor's browser for a Google domain
- [x] Responsive down to phone width
- [x] Automatic responsive image optimization (PNG → WebP, ~6.9 MB → ~700 KB)
- [x] CI: formatting, type-check, build, tests

### Requested, not yet built

| #   | Feature             | Plan                                                                                                               |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Registrations       | A form (Sanity-backed or a hosted form) — **not** user accounts                                                    |
| 2   | Payment links       | One Stripe Payment Link per service, wired to each `GET STARTED`                                                   |
| 3   | Intro video         | Section between hero and bio; YouTube/Vimeo embed                                                                  |
| 4   | Real client reviews | Replace the Canva placeholder copy and stock photos                                                                |
| 5   | Social media links  | Real profile URLs on the four footer icons                                                                         |
| 7   | Search bar          | **Deliberately skipped.** One page, ~5 sections — nothing to search. Revisit only if the site grows past ~10 pages |

### Launch checklist

These are encoded as `it.todo(...)` entries in `tests/build-output.test.ts`. Turn each into a real
assertion as the content lands:

- [ ] `src/legal.ts` carries Raul's real address, phone and email — the Impressum is unusable without them
- [ ] Every CTA points at a real Stripe Payment Link instead of `#`
- [ ] Real testimonials replace the Canva placeholder copy and stock portraits
- [ ] Each social icon links to a real profile
- [ ] Hero photo replaced — the current one is an AI composite with a cropped-off Meta AI watermark
- [ ] `gym-weights.png` swapped for an Unsplash/Pexels equivalent (Canva stock licensing is scoped to Canva designs)

## Build order

The remaining work has a deliberate sequence. Each step assumes the one before it:

1. ~~**Static page from the design**~~ — done. Real markup, hardcoded content.
2. **Sanity.** Studio in-repo at `/studio`. Model the schema on the arrays already at the top of
   `src/pages/index.astro` — the markup exists first precisely so the content model isn't guesswork.
3. **Stripe Payment Links + Cal.com embed.** Paste the links into the service cards. If a service
   needs prepaid slot booking rather than a one-off purchase, use Cal.com's Stripe integration for it
   instead of a bare Payment Link.
4. **Intro video section**, between hero and bio.

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
- Confirmation of what "registrations" means — a signup form, or booking a specific class slot.
  The answer decides between a plain form and a Cal.com embed in step 3.

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
│   ├── impressum.astro    § 5 DDG anbieterkennzeichnung
│   └── datenschutz.astro  Art. 13 DSGVO privacy notice
└── legal.ts            operator name, address and contact, shared by both legal pages
tests/
└── build-output.test.ts    assertions against the built HTML
```

Section content (services, testimonials, socials) sits in plain arrays at the top of
`index.astro`. That is intentional: it keeps content in one place, and those arrays are the shape
the Sanity schema should mirror when it lands.

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
