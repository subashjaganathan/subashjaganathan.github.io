# Subash Jaganathan — Portfolio

Personal portfolio of **Subash Jaganathan**, Senior Cyber Security Consultant — DFIR · SOC · Threat Hunting · Threat Intelligence · Malware Analysis.

🔗 **Live site:** https://dfir-hawk.github.io (once published)

## Stack

Pure static site — no build step, no dependencies.

- `index.html` — single-page layout (hero, about, arsenal, experience, impact, certifications, contact)
- `styles.css` — dark cyber/terminal theme, fully responsive, respects `prefers-reduced-motion`
- `script.js` — typewriter effect, matrix-rain canvas, scroll reveals, animated counters

## Run locally

Just open `index.html` in a browser, or:

```bash
python -m http.server 8000
```

## Deploy to GitHub Pages

1. Create a repo named `DFIR-Hawk.github.io` (user site) — or any repo name for a project site.
2. Push this folder's contents to the `main` branch.
3. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
4. Site goes live at `https://dfir-hawk.github.io` within a minute or two.
