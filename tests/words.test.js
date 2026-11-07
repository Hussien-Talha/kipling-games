// Checks the generated word lists that ship with the site.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const naughty = new Set(JSON.parse(read("../node_modules/naughty-words/en.json")).map((w) => w.toLowerCase()));
const fileWords = (p) => new Set(
  read(p).split("\n").filter((l) => !l.trim().startsWith("#")).flatMap((l) => l.split(/\s+/)).filter(Boolean),
);
const blockedExtra = fileWords("../scripts/blocklist-extra.txt");
const notAnswers = fileWords("../scripts/answer-exclude.txt");

for (const length of [4, 5, 6]) {
  test(`${length}-letter word list is valid`, () => {
    const { answers, allowed } = JSON.parse(read(`../public/guess-the-word/words/${length}.json`));
    const allowedSet = new Set(allowed);

    assert.ok(answers.length >= 500, "enough answers for months of play");
    assert.equal(new Set(answers).size, answers.length, "no duplicate answers");
    for (const w of [...answers, ...allowed]) {
      assert.match(w, new RegExp(`^[a-z]{${length}}$`), `bad word: ${w}`);
    }
    for (const w of answers) {
      assert.ok(allowedSet.has(w), `answer ${w} must be guessable`);
      assert.ok(!notAnswers.has(w), `excluded answer ${w}`);
    }
    for (const w of allowed) {
      assert.ok(!naughty.has(w) && !blockedExtra.has(w), `blocked word ${w}`);
    }
  });
}

test("home page word counts match the word lists", () => {
  const html = read("../public/index.html");
  for (const length of [4, 5, 6]) {
    const { answers } = JSON.parse(read(`../public/guess-the-word/words/${length}.json`));
    const m = html.match(new RegExp(`value="${length}" data-count="([\\d,]+)"`));
    assert.ok(m, `picker option for ${length} letters`);
    assert.equal(Number(m[1].replace(/,/g, "")), answers.length);
  }
});
