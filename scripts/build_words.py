"""Build the Guess the Word word lists.

Run once (or whenever the lists should change):

    python3 -m venv .venv && .venv/bin/pip install wordfreq
    npm install
    .venv/bin/python scripts/build_words.py

Outputs public/guess-the-word/words/{4,5,6}.json, each shaped as
{"answers": [...], "allowed": [...]}.

- allowed: every plain English word of that length (an-array-of-english-words),
  minus blocked words. Used to accept guesses.
- answers: the most common, school-friendly words of that length (ranked by
  wordfreq), with plurals/-ed forms, proper nouns and blocked words removed.
"""

import json
import re
from pathlib import Path

from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "guess-the-word" / "words"

ANSWER_COUNTS = {4: 700, 5: 1200, 6: 1000}
MIN_ZIPF = 3.0  # roughly: appears at least once per million words
ALLOWED_MIN_ZIPF = 1.0  # guesses: drop only the most obscure dictionary entries


def load_words(path: Path) -> set[str]:
    """Words from a text file: whitespace-separated, '#' starts a comment line."""
    words = set()
    for ln in path.read_text().splitlines():
        if not ln.strip().startswith("#"):
            words.update(w.lower() for w in ln.split())
    return words


def main() -> None:
    english = json.loads((ROOT / "node_modules/an-array-of-english-words/index.json").read_text())
    english = {w for w in english if re.fullmatch(r"[a-z]+", w)}

    # /usr/share/dict/words keeps proper nouns capitalised, so lowercase entries
    # are ordinary words. Used to keep names and oddities out of the answers.
    system_dict = {w for w in Path("/usr/share/dict/words").read_text().split() if re.fullmatch(r"[a-z]+", w)}

    naughty = {w.lower() for w in json.loads((ROOT / "node_modules/naughty-words/en.json").read_text())}
    blocked = naughty | load_words(ROOT / "scripts/blocklist-extra.txt")
    not_answers = load_words(ROOT / "scripts/answer-exclude.txt")

    known = english | system_dict

    def is_inflection(w: str) -> bool:
        if w.endswith("ss"):
            return False
        if w.endswith("s") and (w[:-1] in known or (w.endswith("es") and w[:-2] in known)):
            return True
        if w.endswith("ed") and (w[:-2] in known or w[:-1] in known):
            return True
        if w.endswith("ed") and len(w) > 4 and w[-3] == w[-4] and w[:-3] in known:
            return True  # doubled consonant: tagged, pinned
        return False

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for length, count in ANSWER_COUNTS.items():
        candidates = [
            w for w in english
            if len(w) == length and w in system_dict and w not in blocked and w not in not_answers
            and not is_inflection(w)
        ]
        ranked = sorted(candidates, key=lambda w: zipf_frequency(w, "en"), reverse=True)
        answers = [w for w in ranked if zipf_frequency(w, "en") >= MIN_ZIPF][:count]

        allowed = {
            w for w in english
            if len(w) == length and w not in blocked and zipf_frequency(w, "en") >= ALLOWED_MIN_ZIPF
        }
        allowed |= set(answers)

        data = {"answers": sorted(answers), "allowed": sorted(allowed)}
        (OUT_DIR / f"{length}.json").write_text(json.dumps(data, separators=(",", ":")))
        print(f"{length} letters: {len(answers)} answers, {len(allowed)} allowed guesses")


if __name__ == "__main__":
    main()
