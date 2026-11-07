import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGuess, isWin, keyboardStates, validateGuess, pickNextWord,
  emptyStats, recordResult, winRate, shareText, CORRECT as C, PRESENT as P, ABSENT as A,
} from "../public/just-so-words/logic.js";

test("evaluateGuess marks exact, misplaced and missing letters", () => {
  assert.deepEqual(evaluateGuess("crane", "crane"), [C, C, C, C, C]);
  assert.deepEqual(evaluateGuess("react", "crane"), [P, P, C, P, A]);
  assert.deepEqual(evaluateGuess("ghost", "crane"), [A, A, A, A, A]);
});

test("evaluateGuess handles repeated letters", () => {
  // Answer has one L, already matched exactly: the other L stays grey.
  assert.deepEqual(evaluateGuess("llama", "plant"), [A, C, C, A, A]);
  // Exact match takes priority over an earlier misplaced copy.
  assert.deepEqual(evaluateGuess("speed", "abide"), [A, A, P, A, P]);
  assert.deepEqual(evaluateGuess("eerie", "there"), [P, A, P, A, C]);
  // Three Ss guessed, two in the answer: one exact, one misplaced, one grey.
  assert.deepEqual(evaluateGuess("sassy", "bless"), [P, A, A, C, A]);
});

test("evaluateGuess works for 4 and 6 letters and ignores case", () => {
  assert.deepEqual(evaluateGuess("BOOK", "book"), [C, C, C, C]);
  assert.deepEqual(evaluateGuess("planet", "plenty"), [C, C, A, C, P, P]);
  assert.throws(() => evaluateGuess("cat", "book"));
});

test("isWin", () => {
  assert.equal(isWin([C, C, C, C]), true);
  assert.equal(isWin([C, P, C, C]), false);
  assert.equal(isWin([]), false);
});

test("keyboardStates keeps the best state seen for each letter", () => {
  const states = keyboardStates(["react", "crane"], "crane");
  assert.equal(states.c, C); // present first, correct later
  assert.equal(states.t, A);
  assert.equal(states.r, C);
});

test("validateGuess", () => {
  const allowed = new Set(["crane", "plant"]);
  assert.equal(validateGuess("cra", 5, allowed), "Not enough letters");
  assert.equal(validateGuess("zzzzz", 5, allowed), "Not in word list");
  assert.equal(validateGuess("CRANE", 5, allowed), null);
});

test("pickNextWord never repeats until the list is used up", () => {
  const answers = ["aaaa", "bbbb", "cccc", "dddd"];
  let seen = [];
  const picked = [];
  for (let i = 0; i < answers.length; i++) {
    const r = pickNextWord(answers, seen, Math.random);
    picked.push(r.word);
    seen = r.seen;
  }
  assert.deepEqual([...picked].sort(), answers);
  // Fifth pick starts a fresh cycle.
  const r = pickNextWord(answers, seen, () => 0);
  assert.deepEqual(r.seen, [r.word]);
});

test("pickNextWord drops seen words that are no longer in the list", () => {
  const r = pickNextWord(["aaaa", "bbbb"], ["gone", "aaaa"], () => 0);
  assert.equal(r.word, "bbbb");
  assert.deepEqual(r.seen, ["aaaa", "bbbb"]);
});

test("recordResult tracks streaks and guess distribution", () => {
  let s = emptyStats();
  s = recordResult(s, true, 3);
  s = recordResult(s, true, 4);
  assert.equal(s.currentStreak, 2);
  assert.equal(s.bestStreak, 2);
  s = recordResult(s, false, 6);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.bestStreak, 2);
  assert.equal(s.played, 3);
  assert.equal(s.wins, 2);
  assert.deepEqual(s.distribution, [0, 0, 1, 1, 0, 0]);
  assert.equal(winRate(s), 67);
  assert.equal(winRate(emptyStats()), 0);
});

test("recordResult does not mutate the old stats", () => {
  const before = emptyStats();
  recordResult(before, true, 1);
  assert.equal(before.played, 0);
  assert.deepEqual(before.distribution, [0, 0, 0, 0, 0, 0]);
});

test("shareText shows the grid and credit but never the answer", () => {
  const text = shareText({
    guesses: ["react", "crane"], answer: "crane", won: true, length: 5, streak: 3,
    url: "https://kipling-games.netlify.app",
  });
  assert.match(text, /Just So Words · 5 letters · 2\/6/);
  assert.match(text, /🟧🟧🟧🟧🟧/); // taste-skill-ignore
  assert.match(text, /Streak: 3/);
  assert.match(text, /Made by Hussien Talha/);
  assert.doesNotMatch(text, /crane/i);
  const lost = shareText({ guesses: ["react"], answer: "crane", won: false, length: 5, streak: 0, url: "x" });
  assert.match(lost, /X\/6/);
  assert.doesNotMatch(lost, /Streak/);
});
