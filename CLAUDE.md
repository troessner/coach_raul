# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Marketing site and booking funnel for Coach Raul Payares (Berlin fitness and mental coach).
Astro 7, static output, no database, no user accounts. See [README.md](README.md) for the stack
rationale, the feature status table, and the launch checklist.

Read the README's "Feature status" section before starting work — it is the source of truth for
what exists and what is still planned.

## The bar

Ship the smallest thing that actually works, then stop.

- **Question whether it needs to exist.** Speculative features, config for values that never change,
  and abstractions with one implementation do not go in.
- **Reuse before writing.** A helper, token, or component a few files over beats a new one.
- **Native platform before dependencies.** CSS before JS. `<details>` before an accordion library.
  `<input type="date">` before a date picker. A new dependency needs a reason a few lines cannot cover.
- **Deletion beats addition.** Boring beats clever.

Never cut corners on: input validation at trust boundaries, error handling that loses data,
secrets handling, or accessibility basics.

## Running things

```sh
npm run dev     # localhost:4321
npm run ci      # format → check → build → test. Run this before handing work back.
```

`npm test` asserts against `dist/`, so **always build first**. `npm run ci` does that for you.

## Code conventions

### Styling

- **Plain scoped CSS in `.astro` files.** No Tailwind, no CSS-in-JS, no preprocessor.
  Astro scopes `<style>` blocks per component automatically.
- **Design tokens live in `src/layouts/Layout.astro`** under `:root` — `--accent`, `--bg`, `--fg`,
  `--muted`, `--gutter`, `--maxw`. Never hardcode a hex that duplicates a token.
- **Shared utility classes** (`.display`, `.section-heading`, `.shell`, `.cta`) are global, also in
  `Layout.astro`. Reuse them instead of restyling a heading from scratch.
- Use `clamp()` for anything that scales with viewport width rather than stacking breakpoints.
- Breakpoints in this project: `860px` (grids collapse to 2 columns) and `520px` (to 1 column).

### Components

- One component per file in `src/components/`, named `PascalCase.astro`.
- Every component declares a typed `interface Props`. No untyped `Astro.props`.
- Page content (services, testimonials, socials) belongs in arrays at the top of
  `src/pages/index.astro`, not inlined in markup. The Sanity schema will mirror those shapes.

### Images

- Images go in `src/assets/` and are imported, then rendered with `<Image />` from `astro:assets`
  so they get optimized and get `width`/`height`. Never reference them from `public/` to skip this.
- Every `<img>` needs `alt`. Decorative images take `alt=""` plus `aria-hidden="true"`.
- Use `widths` + `sizes` for anything that renders at more than one size.

### TypeScript

- Strict mode is on (`astro/tsconfigs/strict`). No `any`, no `@ts-ignore` without a comment saying why.
- Type function signatures. Prefer `as const` for literal config arrays so keys stay narrow.

### Accessibility

Not optional, and not a follow-up ticket:

- One `<h1>` per page; heading levels descend without gaps.
- Interactive elements are reachable by keyboard and show a visible `:focus-visible` outline.
- Icon-only links carry an `aria-label`.
- Text keeps a contrast ratio of at least 4.5:1 against its background.

## Testing

**Every piece of functional code gets a test.** Functional means logic that can be wrong: the
contact endpoint, Sanity query helpers, any data transform, any conditional rendering that matters.

- Tests live in `tests/`, named `<subject>.test.ts`, run by Vitest.
- `tests/build-output.test.ts` asserts against the **built HTML**, because that is what visitors get.
  Add to it when a regression would be invisible in source review — a dropped heading, a missing
  `alt`, an anchor that lost its `href`.
- **Do not write tests that restate configuration.** A test asserting that the services array has
  four entries pins the source against itself and proves nothing. Test behaviour and output.
- Launch gates are `it.todo(...)` entries. Convert each into a real assertion as the content lands
  instead of deleting it.
- After changing any logic, check whether an existing test needs updating, and update it.

## Secrets

- API keys (Stripe, Sanity, Mailgun) go in `.env`, never in source, never in a committed file.
- Document every new environment variable in `.env.example` and in the README.
- Astro exposes `PUBLIC_*` variables to the browser. Anything else must stay server-side.

## Git

- **Never commit, branch, or push ad hoc.** Branches, commits and PRs go through the `/publish`
  skill; revising an open PR goes through `/amend`. Nothing else creates a branch or a commit.
- Never commit directly to `main`; check the current branch before staging anything.
- Run `npm run ci` **before** staging — Prettier rewrites the working tree, not the index, so
  staging first ships unformatted code.
