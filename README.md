# My Portfolio

https://dfir-hawk.github.io/

Built with **Jekyll** (the Ruby static-site generator) and hosted on GitHub Pages.

## Structure
- `_config.yml` - Jekyll site configuration
- `_data/nav.yml` - navigation items (data-driven)
- `_includes/nav-links.html` - nav rendered via Liquid loop over the data
- `index.html` - page content (front matter + sections)
- `styles.css`, `script.js`, `assets/` - styling, interactions, media

## Local development
```bash
bundle install
bundle exec jekyll serve
```
Then open http://localhost:4000. GitHub Pages rebuilds automatically on push to `main`.
