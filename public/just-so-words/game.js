// Just So Words: screen, input and saved progress. Rules live in logic.js.
import {
  LENGTHS, MAX_GUESSES, evaluateGuess, isWin, keyboardStates, validateGuess,
  pickNextWord, emptyStats, recordResult, winRate, shareText,
} from "./logic.js";
import { launchConfetti } from "./confetti.js";

const STORAGE_KEY = "kipling-games:just-so-words:v1";
const STATE_LABEL = { correct: "right spot", present: "wrong spot", absent: "not in the word" };
const WIN_TITLES = ["Genius!", "Magnificent!", "Brilliant!", "Splendid!", "Great job!", "Phew, just in time!"];
const LOSE_TITLES = ["So close!", "Good try!", "Next one's yours!"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const STEP = reducedMotion ? 0 : 260;
const FLIP = reducedMotion ? 0 : 500;

const $ = (id) => document.getElementById(id);
const els = {
  board: $("board"), keyboard: $("keyboard"), streak: $("streak"), toasts: $("toasts"),
  announcer: $("announcer"), confetti: $("confetti"), roundActions: $("round-actions"),
};

// ---------- saved state ----------
function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or storage blocked: the game still works, it just won't remember.
  }
}

function freshRound() {
  return { answer: null, guesses: [], done: false, won: false, seen: [], stats: emptyStats() };
}

function normalise(raw) {
  const s = {
    length: LENGTHS.includes(raw?.length) ? raw.length : 5,
    settings: { symbols: !!raw?.settings?.symbols, confetti: raw?.settings?.confetti !== false },
    rounds: {},
  };
  for (const L of LENGTHS) {
    const r = raw?.rounds?.[L] || {};
    s.rounds[L] = {
      ...freshRound(),
      answer: typeof r.answer === "string" ? r.answer : null,
      guesses: Array.isArray(r.guesses) ? r.guesses.filter((g) => typeof g === "string" && g.length === L).slice(0, MAX_GUESSES) : [],
      done: !!r.done,
      won: !!r.won,
      seen: Array.isArray(r.seen) ? r.seen : [],
      stats: { ...emptyStats(), ...(r.stats || {}) },
    };
  }
  return s;
}

const saved = loadSaved();
const state = normalise(saved);
// The home page can open the game at a chosen length: /just-so-words/?length=4
const askedLength = Number(new URLSearchParams(location.search).get("length"));
if (LENGTHS.includes(askedLength)) state.length = askedLength;
if (location.search) history.replaceState(null, "", location.pathname); // later reloads keep the player's own choice
let input = "";
let busy = true; // true while loading words or animating a guess

const round = () => state.rounds[state.length];

// ---------- word lists ----------
const wordCache = {};
async function loadWords(L) {
  if (!wordCache[L]) {
    wordCache[L] = fetch(`./words/${L}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => ({ answers: d.answers, answerSet: new Set(d.answers), allowed: new Set(d.allowed) }))
      .catch((err) => {
        delete wordCache[L];
        throw err;
      });
  }
  return wordCache[L];
}

function newWord(words, r) {
  const { word, seen } = pickNextWord(words.answers, r.seen);
  Object.assign(r, { answer: word, seen, guesses: [], done: false, won: false });
}

// ---------- building the screen ----------
function buildBoard() {
  const L = state.length;
  els.board.style.setProperty("--len", L);
  els.board.replaceChildren();
  for (let i = 0; i < MAX_GUESSES; i++) {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", `Guess ${i + 1}`);
    for (let j = 0; j < L; j++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      row.append(tile);
    }
    els.board.append(row);
  }
}

const KB_ROWS = ["qwertyuiop", "asdfghjkl", "^zxcvbnm<"];
function buildKeyboard() {
  for (const letters of KB_ROWS) {
    const row = document.createElement("div");
    row.className = "kb-row";
    for (const ch of letters) {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "key";
      if (ch === "^") {
        key.classList.add("wide", "enter");
        key.textContent = "Enter";
        key.dataset.key = "Enter";
      } else if (ch === "<") {
        key.classList.add("wide");
        key.dataset.key = "Backspace";
        key.setAttribute("aria-label", "Delete letter");
        key.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="M12 9l5 6M17 9l-5 6"/></svg>';
      } else {
        key.textContent = ch;
        key.dataset.key = ch;
        key.setAttribute("aria-label", ch.toUpperCase());
      }
      row.append(key);
    }
    els.keyboard.append(row);
  }
  els.keyboard.addEventListener("click", (e) => {
    const key = e.target.closest(".key");
    if (key) handleKey(key.dataset.key);
  });
}

// ---------- painting ----------
function paintBoard() {
  const r = round();
  const rows = els.board.children;
  for (let i = 0; i < MAX_GUESSES; i++) {
    const tiles = rows[i].children;
    const guess = r.guesses[i];
    const evaluation = guess ? evaluateGuess(guess, r.answer) : null;
    const typed = !guess && i === r.guesses.length && !r.done ? input : "";
    for (let j = 0; j < tiles.length; j++) {
      const t = tiles[j];
      const letter = guess ? guess[j] : typed[j] || "";
      t.textContent = letter;
      t.className = "tile" + (letter ? " filled" : "");
      t.style.animationDelay = "";
      if (evaluation) {
        t.dataset.state = evaluation[j];
        t.setAttribute("aria-label", `${letter.toUpperCase()}, ${STATE_LABEL[evaluation[j]]}`);
      } else {
        delete t.dataset.state;
        t.removeAttribute("aria-label");
      }
    }
  }
}

function paintTypedRow() {
  const r = round();
  const row = els.board.children[r.guesses.length];
  if (!row) return;
  [...row.children].forEach((t, j) => {
    const letter = input[j] || "";
    if (t.textContent !== letter) {
      t.textContent = letter;
      t.classList.toggle("filled", !!letter);
    }
  });
}

function paintKeyboard() {
  const r = round();
  const states = r.answer ? keyboardStates(r.guesses, r.answer) : {};
  for (const key of els.keyboard.querySelectorAll(".key")) {
    const ch = key.dataset.key;
    if (ch.length !== 1) continue;
    if (states[ch]) {
      key.dataset.state = states[ch];
      key.setAttribute("aria-label", `${ch.toUpperCase()}, ${STATE_LABEL[states[ch]]}`);
    } else {
      delete key.dataset.state;
      key.setAttribute("aria-label", ch.toUpperCase());
    }
  }
}

function paintChrome() {
  const r = round();
  for (const b of document.querySelectorAll(".lengths button")) {
    b.setAttribute("aria-pressed", String(Number(b.dataset.length) === state.length));
  }
  const streak = r.stats.currentStreak;
  els.streak.textContent = streak >= 2 ? `${streak} in a row` : "";
  els.roundActions.hidden = !r.done;
  els.keyboard.hidden = r.done;
  $("round-msg").textContent = !r.done ? "" : r.won
    ? `Solved in ${r.guesses.length}! Ready for another?`
    : `The word was ${r.answer.toUpperCase()}. Try another!`;
  document.body.classList.toggle("symbols", state.settings.symbols);
}

function paintAll() {
  paintBoard();
  paintKeyboard();
  paintChrome();
}

// ---------- feedback ----------
function toast(message, ms = 1500) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  els.toasts.prepend(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, ms);
}

function announce(text) {
  els.announcer.textContent = "";
  requestAnimationFrame(() => { els.announcer.textContent = text; });
}

function shakeRow() {
  const row = els.board.children[round().guesses.length];
  if (!row) return;
  row.classList.remove("shake");
  void row.offsetWidth; // restart the animation
  row.classList.add("shake");
}

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

async function revealRow(index, guess, answer) {
  const evaluation = evaluateGuess(guess, answer);
  const tiles = [...els.board.children[index].children];
  tiles.forEach((t, j) => {
    setTimeout(() => {
      t.classList.add("flip");
      setTimeout(() => {
        t.dataset.state = evaluation[j];
        t.setAttribute("aria-label", `${guess[j].toUpperCase()}, ${STATE_LABEL[evaluation[j]]}`);
      }, FLIP / 2);
    }, j * STEP);
  });
  await wait((tiles.length - 1) * STEP + FLIP);
  tiles.forEach((t) => t.classList.remove("flip"));
  announce(`${guess.toUpperCase()}: ` + evaluation.map((s, j) => `${guess[j].toUpperCase()} ${STATE_LABEL[s]}`).join(", "));
}

async function bounceRow(index) {
  const tiles = [...els.board.children[index].children];
  tiles.forEach((t, j) => {
    t.style.animationDelay = `${j * 90}ms`;
    t.classList.add("bounce");
  });
  await wait(reducedMotion ? 0 : 600 + tiles.length * 90);
}

// ---------- game flow ----------
function handleKey(key) {
  if (busy) return;
  const r = round();
  if (r.done) {
    if (key === "Enter") nextWord();
    return;
  }
  if (key === "Enter") return submit();
  if (key === "Backspace") {
    input = input.slice(0, -1);
    return paintTypedRow();
  }
  if (/^[a-z]$/.test(key) && input.length < state.length) {
    input += key;
    paintTypedRow();
  }
}

async function submit() {
  busy = true; // block a quick double-Enter while the word list promise resolves
  const r = round();
  const words = await loadWords(state.length);
  const problem = validateGuess(input, state.length, words.allowed);
  if (problem) {
    toast(problem);
    shakeRow();
    busy = false;
    return;
  }

  const guess = input.toLowerCase();
  const rowIndex = r.guesses.length;
  input = "";
  r.guesses.push(guess);
  const won = isWin(evaluateGuess(guess, r.answer));
  const lost = !won && r.guesses.length >= MAX_GUESSES;
  if (won || lost) {
    r.done = true;
    r.won = won;
    r.stats = recordResult(r.stats, won, r.guesses.length);
  }
  save(); // save before animating so a refresh can't undo the guess

  await revealRow(rowIndex, guess, r.answer);
  paintKeyboard();

  if (won) {
    paintChrome();
    toast(WIN_TITLES[rowIndex], 1800);
    if (state.settings.confetti) launchConfetti(els.confetti);
    await bounceRow(rowIndex);
    await wait(reducedMotion ? 300 : 900);
    openResult();
  } else if (lost) {
    paintChrome();
    toast(r.answer.toUpperCase(), 2200);
    await wait(1400);
    openResult();
  }
  busy = false;
}

async function nextWord() {
  if (busy) return;
  busy = true;
  try {
    const words = await loadWords(state.length);
    newWord(words, round());
    input = "";
    save();
    $("result").close();
    paintAll();
  } catch {
    toast("Couldn't load words. Check your connection.", 2500);
  }
  busy = false;
}

async function showLength(L) {
  busy = true;
  state.length = L;
  input = "";
  save();
  buildBoard();
  paintAll();
  try {
    const words = await loadWords(L);
    const r = round();
    if (!r.answer || !words.answerSet.has(r.answer)) {
      newWord(words, r);
      save();
    }
    paintAll();
    busy = false;
  } catch {
    toast("Couldn't load words. Check your connection and refresh.", 3000);
    busy = false;
  }
}

// ---------- dialogs ----------
function fillStats(prefix, stats) {
  $(`${prefix}-played`).textContent = stats.played;
  $(`${prefix}-rate`).textContent = winRate(stats);
  $(`${prefix}-streak`).textContent = stats.currentStreak;
  $(`${prefix}-best`).textContent = stats.bestStreak;
}

function openStats() {
  const r = round();
  $("stats-length").textContent = state.length;
  fillStats("st", r.stats);
  const max = Math.max(1, ...r.stats.distribution);
  const dist = $("st-dist");
  dist.replaceChildren();
  r.stats.distribution.forEach((n, i) => {
    const row = document.createElement("div");
    row.className = "dist-row";
    const bar = document.createElement("div");
    bar.className = "dist-bar" + (r.done && r.won && r.guesses.length === i + 1 ? " last" : "");
    bar.style.width = `${Math.max(8, (n / max) * 100)}%`;
    bar.textContent = n;
    row.append(String(i + 1), bar);
    dist.append(row);
  });
  $("stats").showModal();
}

function openResult() {
  const r = round();
  if (!r.done) return;
  const n = r.guesses.length;
  $("result-title").textContent = r.won ? WIN_TITLES[n - 1] : LOSE_TITLES[r.stats.played % LOSE_TITLES.length];
  const word = $("result-word");
  word.replaceChildren(...[...r.answer].map((ch) => Object.assign(document.createElement("span"), { textContent: ch })));
  word.setAttribute("aria-label", r.answer);
  fillStats("rs", r.stats);
  $("result").showModal();
}

async function share() {
  const r = round();
  const text = shareText({
    guesses: r.guesses, answer: r.answer, won: r.won, length: state.length,
    streak: r.stats.currentStreak, url: new URL("./", location.href).href,
  });
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast("Copied. Paste it to a friend");
  } catch (err) {
    if (err?.name !== "AbortError") toast("Couldn't share from this browser");
  }
}

// ---------- wiring ----------
function wire() {
  for (const b of document.querySelectorAll(".lengths button")) {
    b.addEventListener("click", () => {
      const L = Number(b.dataset.length);
      b.blur(); // keep typing going to the game, not this button
      if (!busy && L !== state.length) showLength(L);
    });
  }
  for (const b of document.querySelectorAll("[data-open]")) {
    b.addEventListener("click", () => {
      if (b.dataset.open === "stats") openStats();
      else $(b.dataset.open).showModal();
    });
  }
  for (const d of document.querySelectorAll("dialog")) {
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); // tap outside to close
  }
  $("next-btn").addEventListener("click", nextWord);
  $("result-next").addEventListener("click", nextWord);
  $("result-btn").addEventListener("click", openResult);
  $("share-btn").addEventListener("click", share);

  const symbols = $("opt-symbols");
  const confetti = $("opt-confetti");
  symbols.checked = state.settings.symbols;
  confetti.checked = state.settings.confetti;
  symbols.addEventListener("change", () => { state.settings.symbols = symbols.checked; save(); paintChrome(); });
  confetti.addEventListener("change", () => { state.settings.confetti = confetti.checked; save(); });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector("dialog[open]")) return;
    if (e.key === "Enter" || e.key === "Backspace") {
      e.preventDefault(); // stop a focused button from also being pressed
      handleKey(e.key);
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      handleKey(e.key.toLowerCase());
    }
  });
}

buildKeyboard();
wire();
showLength(state.length);
if (!saved) $("help").showModal(); // first visit: explain the rules
