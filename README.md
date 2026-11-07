# Kipling School Games

The games website for the Kipling School newspaper: https://hussien-talha.github.io/kipling-games/
Made by Hussien Talha.

The newspaper prints one QR code that always points at the home page, so the same
code works in every issue. Each month the home page features that issue's game.

## What's here

| Path | What it is |
|---|---|
| `public/` | The whole website (plain HTML/CSS/JS, no build step). This folder is what gets published. |
| `public/index.html` | Games home page ("This month's game"). |
| `public/just-so-words/` | Issue 1 game: guess the hidden 4, 5 or 6-letter word in six tries, unlimited words. |
| `public/just-so-words/logic.js` | The game rules (scoring guesses, picking words, stats). Unit-tested. |
| `public/just-so-words/words/*.json` | Generated word lists (`answers` + `allowed` guesses). |
| `scripts/build_words.py` | Rebuilds the word lists. |
| `scripts/blocklist-extra.txt` | Words never accepted at all (on top of a standard rude-words list). |
| `scripts/answer-exclude.txt` | Words you may type but that are never the hidden answer (names, places, unsuitable topics). |
| `print/` | QR code for the newspaper (`.svg` for layout software, `.png` 2400px). Not published. |
| `tests/` | Automated tests. |

## Look

The site uses Kipling School's own colours: navy (`#0b1a6e`) and orange (`#f07a1f`), with a light
blue (`#8fb4ff`) for "right letter, wrong place". Each page is laid out like the newspaper's printed
games sheet: paper panels on the navy. One typeface, Schibsted Grotesk (SIL Open Font Licence),
is stored in `public/assets/fonts/` so the site loads nothing from other websites. Square corners,
no gradients, shadows or emoji. Colour tokens live at the top of `public/assets/site.css`.
The home page can open the game at a length: `/just-so-words/?length=4`.

Saved progress (streaks, stats, current word) lives only in each player's browser
(`localStorage`). There are no accounts, no tracking and no third-party requests.

## Common tasks

Run the tests:

```bash
npm install
npm test
```

Preview locally, then open http://localhost:8765:

```bash
python3 -m http.server 8765 --directory public
```

Publish: push to the `main` branch. The GitHub Actions workflow in `.github/workflows/pages.yml`
runs the tests and, if they pass, publishes the `public/` folder to GitHub Pages. Links inside the
site are relative so it works under `/kipling-games/`; `404.html` uses `/kipling-games/` paths
because GitHub serves it at any depth. (`netlify.toml` is left from an earlier Netlify setup.)

Remove a word that shouldn't be an answer: add it to `scripts/answer-exclude.txt`, then rebuild:

```bash
python3 -m venv .venv && .venv/bin/pip install wordfreq
.venv/bin/python scripts/build_words.py && npm test
```

Regenerate the QR codes: `npm run qr`.

## Adding next month's game

1. Make a new folder in `public/` (for example `public/issue-2-game/`) with its own `index.html`.
   Link `/assets/site.css` for the shared colours and keep the "Made by Hussien Talha" footer.
2. In `public/index.html`, put the new game in the "This month's game" card and add a
   "Past games" list linking to `/just-so-words/`.
3. Test, then deploy. The printed QR code doesn't change.
