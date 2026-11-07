# Continue here

## Current state (2026-11-07, Claude Code, rename)
- **User changes:** the maker's note section is removed from the home page; the game is renamed **Guess the Word** (folder `public/guess-the-word/`); the school newspaper is called **Kipling Chronicles** (wordmark, titles, credits now say Kipling Chronicles).
- `public/just-so-words/index.html` only forwards old links to `guess-the-word/`. The saved-progress key is still `kipling-games:just-so-words:v1` on purpose so existing players keep their stats.
- Live address and QR code are unchanged: https://hussien-talha.github.io/kipling-games/
- **Checks:** `npm test` 15/15; home inspector 0 FAIL 0 WARN; old address forwards; game top bar fits at 375px.


## Current state (2026-11-07, Claude Code, moved to GitHub Pages)
- **Live:** https://hussien-talha.github.io/kipling-games/ (public repo https://github.com/Hussien-Talha/kipling-games, branch `main`). Netlify was unreachable for the user (and from this Mac), so the site moved to GitHub Pages.
- **How it publishes:** `.github/workflows/pages.yml` runs `npm test`, then deploys `public/` to Pages on every push to `main`. Pages source is "GitHub Actions".
- **Changes for Pages:** all in-site links are relative (site lives under `/kipling-games/`); `404.html` uses `/kipling-games/` absolute paths; share text uses the page's own URL. The print QR (`print/`) now points to the GitHub Pages link and was decoded to confirm. The old Netlify QR/link is obsolete.
- **Checks run:** `npm test` 15/15 locally and in the first workflow run (run 42387008801: test + deploy succeeded). Live URLs return 200 (home, game, word list, font) and 404 for a missing page. Played a 5-letter round on the live site in the in-app browser: no console errors.
- **Not covered:** GitHub Pages does not apply the `netlify.toml` security headers. Not tested on a real phone.
- **Next:** user scans the new QR on a phone; add the official school logo if provided.


## Current state (2026-11-07, Claude Code, redesign)
- **Objective:** remove the "AI-generated" look (user request) using the design-taste-frontend skill; keep it fun/colourful; keep "Made by Hussien Talha".
- **Decisions from the user:** no pictures at all (the Kipling *Just So Stories* illustrations were tried and removed: the school is not named after that Kipling). Use the school's own logo colours: navy #0b1a6e + orange #f07a1f. The official logo file was not provided, so the wordmark is typographic; add the logo if they send it.
- **Design:** direction "page is the object" (seed 1638688167): home = printed games sheet on navy, sample finished round (SVG) as the hero picture, how-it-works as a tear-off strip of six steps with letter tiles, maker's letter with stub, postcard footer. Game screen: navy ground, orange = right place, light blue = wrong place, grey = absent. Schibsted Grotesk self-hosted. No emoji/gradients/shadows/rounded corners.
- **Checks run:** `npm test` 15/15. Skill lint 0 FAIL. Inspector: home 0 FAIL 0 WARN (with --allow few-pictures,no-footage,palette-purple: the user chose no pictures, no video for phone data, navy is the school brand); game (--app) 0 FAIL, 2 WARN defended (navy brand ground = colour-sprawl; empty board read as blank). Played a 6-letter round via ?length=6 at 375x812; no console/CSP errors under the production CSP locally.
- **Deployed:** deploy 6aef355475c2d4b5d7a12874 is live at https://kipling-games.netlify.app (confirmed via Netlify API file list). Live URL still not reachable from this Mac's network, so not opened on the real domain or on a real phone.
- **Next:** user checks on a phone; swap in the official logo if provided; the "note from the maker" letter is drafted copy for Hussien to approve/edit.

## Earlier state

## Current state (2026-11-07, Claude Code)
- **Objective:** Kipling School newspaper games site; Issue 1 game "Just So Words" (word guessing, 4/5/6 letters, unlimited words, classic play only). Footer credit "Made by Hussien Talha" required on every page.
- **Live:** https://kipling-games.netlify.app (Netlify project `kipling-games`, id 8c7b9524-1240-4e92-a501-93a6924f998a, account sonson296). Deployed with `netlify deploy --prod --dir=public --no-build`; deploy 6aef2cec7f3b3810a81af20e state "ready". Not a git repo.
- **Done:** site + game + word lists + tests + print QR (`print/`). Design is bright/playful per user request ("fun and colourful"), light + dark mode, colour-blind symbols option, confetti on win.
- **Checks run:** `npm test` 14/14 pass. Browser preview at 375x812: win, loss, Next word, length switch, stats, settings, light/dark, no console errors. Game also tested under the production CSP locally (no violations). QR PNG decoded to https://kipling-games.netlify.app.
- **Not verified:** the live URL could not be opened from this Mac (every *.netlify.app host times out here, including older sites); deploy confirmed "ready" with all 13 files via the Netlify API only. Production headers not observed directly. Not tested on a real phone.
- **Next:** open the live site on a phone and scan `print/kipling-games-qr.png`; next month add the Issue 2 game (see README).
