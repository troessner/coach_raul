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
| Contact form    | **Mailgun** _(planned)_          | One Astro endpoint; Mailgun is already a company vendor    |
| Hosting         | **Cloudflare Pages** _(planned)_ | Static + one Worker for the contact endpoint               |
| Database        | **None**                         | Stripe, Cal.com and Sanity each hold their own state       |

## Feature status

### Built

- [x] Hero with headline, subline and primary CTA
- [x] "Meet Coach Raul Payares" bio section
- [x] Four service cards (Personal Training, Nutrition, Mindset, 90-Day Challenge)
- [x] Success stories grid (4 testimonials)
- [x] Footer with logo, "Stay connected" and social icons
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
| 6   | Contact details     | Email / phone / WhatsApp, plus a form posting to a Mailgun endpoint                                                |
| 7   | Search bar          | **Deliberately skipped.** One page, ~5 sections — nothing to search. Revisit only if the site grows past ~10 pages |

### Launch checklist

These are encoded as `it.todo(...)` entries in `tests/build-output.test.ts`. Turn each into a real
assertion as the content lands:

- [ ] Every CTA points at a real Stripe Payment Link instead of `#`
- [ ] Real testimonials replace the Canva placeholder copy and stock portraits
- [ ] Each social icon links to a real profile
- [ ] Hero photo replaced — the current one is an AI composite with a cropped-off Meta AI watermark
- [ ] `gym-weights.png` swapped for an Unsplash/Pexels equivalent (Canva stock licensing is scoped to Canva designs)

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
└── pages/
    └── index.astro    the page; section content lives in arrays at the top
tests/
└── build-output.test.ts    assertions against the built HTML
```

Section content (services, testimonials, socials) sits in plain arrays at the top of
`index.astro`. That is intentional: it keeps content in one place, and those arrays are the shape
the Sanity schema should mirror when it lands.

## Design source

The Canva design is at
`https://www.canva.com/design/DAHZUSoMBCo/V4CFaw5l2yikSnc2lXJAvQ/edit` — login-only, so it cannot be
fetched. Export it as **Share → Download → PDF Standard** to read it.

All images in `src/assets/` were pulled from that PDF with `pdfimages -png <file.pdf> out`, which is
far quicker than exporting them one by one from Canva.

One deliberate deviation from the design: the Canva hero crops both heads off. Here the hero uses
`object-position: center 18%` so the faces stay in frame. Change that one value in `index.astro` to
restore the original crop.
