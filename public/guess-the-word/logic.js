// Pure game rules for Guess the Word. No DOM or storage here, so it can be
// unit-tested with Node (see tests/logic.test.js).

export const LENGTHS = [4, 5, 6];
export const MAX_GUESSES = 6;

export const CORRECT = "correct";
export const PRESENT = "present";
export const ABSENT = "absent";

const RANK = { [ABSENT]: 1, [PRESENT]: 2, [CORRECT]: 3 };

/**
 * Score a guess against the answer. Handles repeated letters the way players
 * expect: a letter is only marked "present" as many times as it is still
 * unaccounted for in the answer.
 */
export function evaluateGuess(guess, answer) {
  guess = guess.toLowerCase();
  answer = answer.toLowerCase();
  if (guess.length !== answer.length) {
    throw new Error("Guess and answer must be the same length");
  }
  const result = new Array(guess.length).fill(ABSENT);
  const remaining = {};

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = CORRECT;
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === CORRECT) continue;
    const ch = guess[i];
    if (remaining[ch] > 0) {
      result[i] = PRESENT;
      remaining[ch]--;
    }
  }
  return result;
}

export function isWin(evaluation) {
  return evaluation.length > 0 && evaluation.every((s) => s === CORRECT);
}

/** Best-known state for each letter, for colouring the on-screen keyboard. */
export function keyboardStates(guesses, answer) {
  const states = {};
  for (const guess of guesses) {
    const evaluation = evaluateGuess(guess, answer);
    [...guess.toLowerCase()].forEach((ch, i) => {
      const s = evaluation[i];
      if (!states[ch] || RANK[s] > RANK[states[ch]]) states[ch] = s;
    });
  }
  return states;
}

/** Returns null if the guess is acceptable, otherwise a short message for the player. */
export function validateGuess(guess, length, allowed) {
  if (guess.length < length) return "Not enough letters";
  if (!/^[a-z]+$/i.test(guess)) return "Letters only";
  if (!allowed.has(guess.toLowerCase())) return "Not in word list";
  return null;
}

/**
 * Pick the next answer without repeating any word until every word in the list
 * has been played. Returns { word, seen } where seen is the updated list.
 */
export function pickNextWord(answers, seen = [], random = Math.random) {
  if (answers.length === 0) throw new Error("No answers available");
  const answerSet = new Set(answers);
  let seenValid = seen.filter((w) => answerSet.has(w));
  let pool = answers.filter((w) => !seenValid.includes(w));
  if (pool.length === 0) {
    seenValid = [];
    pool = answers.slice();
  }
  const word = pool[Math.floor(random() * pool.length) % pool.length];
  return { word, seen: [...seenValid, word] };
}

export function emptyStats() {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
    distribution: new Array(MAX_GUESSES).fill(0),
  };
}

/** Record a finished round. guessCount is how many guesses were used. */
export function recordResult(stats, won, guessCount) {
  const next = {
    ...emptyStats(),
    ...stats,
    distribution: [...(stats?.distribution || emptyStats().distribution)],
  };
  next.played += 1;
  if (won) {
    next.wins += 1;
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
    if (guessCount >= 1 && guessCount <= MAX_GUESSES) next.distribution[guessCount - 1] += 1;
  } else {
    next.currentStreak = 0;
  }
  return next;
}

export function winRate(stats) {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}

// Squares for the pasted result, in the game's colours (text for chats, not page UI). taste-skill-ignore
const SHARE_SQUARES = { [CORRECT]: "🟧", [PRESENT]: "🟦", [ABSENT]: "⬜" }; // taste-skill-ignore

/** Plain-text result players can paste into a chat. Does not reveal the word. */
export function shareText({ guesses, answer, won, length, streak, url }) {
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = guesses
    .map((g) => evaluateGuess(g, answer).map((s) => SHARE_SQUARES[s]).join(""))
    .join("\n");
  const lines = [`Guess the Word · ${length} letters · ${score}`, grid];
  if (streak > 1) lines.push(`Streak: ${streak}`);
  lines.push(`Play at ${url}`, "Made by Hussien Talha");
  return lines.join("\n");
}
