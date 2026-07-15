# Subash Jaganathan — Portfolio

Personal portfolio of **Subash Jaganathan**, Senior Cyber Security Consultant (DFIR · Cyber Advisory · GRC).

**Live:** https://subashjaganathan.github.io/

A single-page, dependency-free site with a DFIR / terminal aesthetic — hero IR terminal,
animated impact counters, scroll-spy nav, a "decrypt" reveal on section titles, and a
print stylesheet so the browser's print / Save-as-PDF produces a clean CV layout.

## Tech stack

- **Jekyll** (Ruby static-site generator) — built and served by GitHub Pages.
- **Vanilla HTML/CSS/JS** — no frameworks, no build step required for the front end.
- Content-hashed Google Fonts (JetBrains Mono, Sora); all icons are inline SVG.
- `_data/nav.yml` → Liquid → `_includes/nav-links.html` renders the nav.
- `jekyll-sitemap` (GitHub Pages whitelisted) generates `sitemap.xml`.

## Accessibility & performance

- Respects `prefers-reduced-motion` (JS animations and CSS effects both disable).
- Keyboard focus-visible styles; skip-link; `aria-expanded` on the mobile menu; ESC closes it.
- Canvas background scales node count to the viewport and pauses when the tab is hidden.
- Content-Security-Policy meta, external links hardened with `rel="noopener noreferrer"`,
  email address assembled at runtime to defeat scrapers.

## Run locally

```bash
bundle install
bundle exec jekyll serve --livereload   # or: rake serve
# http://127.0.0.1:4000
```

Handy Rake tasks (`rake -T`): `build`, `serve`, `check` (validate anchors/assets),
`stats`, `doctor`, `clean`.

## Continuous integration

`.github/workflows/ci.yml` builds the site and runs `scripts/check_links.rb`
(anchor + local-asset validation) on every push and PR. It is **validation only** —
it does not deploy, so GitHub Pages keeps publishing from the branch as usual.

> Note: GitHub Pages builds in "safe mode" and skips custom `_plugins/*.rb`
> (cache-buster, external-links, build-stamp). Those run only in local/CI builds;
> the production HTML sets the equivalent behavior explicitly. Asset URLs are
> versioned (`styles.css?v=N`) for cache-busting — bump `N` when CSS/JS changes.

## License

Content © Subash Jaganathan. Code may be referenced for learning.
