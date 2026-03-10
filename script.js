const prefixDisplay = document.getElementById("prefixDisplay");
const prefixStat = document.getElementById("prefixStat");
const timeStat = document.getElementById("timeStat");
const scoreStat = document.getElementById("scoreStat");
const foundStat = document.getElementById("foundStat");
const bubbleField = document.getElementById("bubbleField");
const guessInput = document.getElementById("guessInput");
const submitBtn = document.getElementById("submitBtn");
const skipBtn = document.getElementById("skipBtn");
const startBtn = document.getElementById("startBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const endBtn = document.getElementById("endBtn");
const feedback = document.getElementById("feedback");
const difficultySelect = document.getElementById("difficultySelect");
const durationSelect = document.getElementById("durationSelect");
const missedWordsList = document.getElementById("missedWordsList");
const summaryText = document.getElementById("summaryText");

let timerId = null;
let timeLeft = Number(durationSelect.value);
let score = 0;
let roundActive = false;
let currentPrefix = "";
let currentAnswers = [];
let guessedWords = new Set();
let usedPrefixes = new Set();
let currentDifficulty = difficultySelect.value;

let prefixPools = {
  easy: [],
  medium: [],
  hard: []
};

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function loadPrefixPools() {
  try {
    showFeedback("Loading prefix rounds...", "good");
    summaryText.textContent = "Loading prefix rounds...";

    const response = await fetch("prefixes.json");

    if (!response.ok) {
      throw new Error(`Could not load prefixes.json (${response.status})`);
    }

    const data = await response.json();

    prefixPools = {
      easy: Array.isArray(data.easy?.rounds) ? data.easy.rounds : [],
      medium: Array.isArray(data.medium?.rounds) ? data.medium.rounds : [],
      hard: Array.isArray(data.hard?.rounds) ? data.hard.rounds : []
    };

    const totalPrefixes =
      prefixPools.easy.length +
      prefixPools.medium.length +
      prefixPools.hard.length;

    if (!totalPrefixes) {
      throw new Error("No playable prefixes were found in prefixes.json.");
    }

    showFeedback(
      `Loaded ${totalPrefixes.toLocaleString()} playable prefix rounds.`,
      "good"
    );

    summaryText.textContent =
      "Prefix rounds loaded. Press Start Game to begin.";

    updateStats();
    renderPrefix();
    renderBubbles();
    clearMissedWords();
  } catch (error) {
    console.error(error);
    showFeedback(`Error loading prefix rounds: ${error.message}`, "bad");
    summaryText.textContent =
      "Could not load prefixes.json. Make sure it is in the same folder as index.html and script.js.";
  }
}

function chooseRound() {
  const pool = prefixPools[currentDifficulty];

  if (!pool || pool.length === 0) {
    return null;
  }

  const unused = pool.filter(
    item => !usedPrefixes.has(`${currentDifficulty}:${item.prefix}`)
  );

  const source = unused.length ? unused : pool;
  const choice = randomItem(source);

  usedPrefixes.add(`${currentDifficulty}:${choice.prefix}`);
  return choice;
}

function startRound() {
  const pool = prefixPools[currentDifficulty];

  if (!pool || pool.length === 0) {
    showFeedback(
      `No playable prefixes are available for ${currentDifficulty} difficulty.`,
      "bad"
    );
    return;
  }

  const round = chooseRound();

  if (!round) {
    showFeedback("Could not start a round.", "bad");
    return;
  }

  stopTimer();

  roundActive = true;
  currentPrefix = round.prefix;
  currentAnswers = Array.isArray(round.words) ? round.words.slice() : [];
  guessedWords = new Set();
  timeLeft = Number(durationSelect.value);
  score = 0;

  renderPrefix();
  updateStats();
  renderBubbles();
  clearMissedWords();

  summaryText.textContent = `Round in progress. Prefix ${currentPrefix.toUpperCase()} has ${currentAnswers.length} possible answers.`;

  showFeedback(
    `New round started. Find words beginning with ${currentPrefix.toUpperCase()}.`,
    "good"
  );

  setControlsEnabled(true);
  guessInput.value = "";
  guessInput.focus();

  startTimer();
}

function newRound() {
  if (roundActive) {
    endRound("Starting a new round.");
  }
  startRound();
}

function endRound(reason = "Time's up!") {
  if (!roundActive) return;

  roundActive = false;
  stopTimer();
  setControlsEnabled(false);
  revealMissedWords();

  const found = guessedWords.size;
  const total = currentAnswers.length;
  const percent = total ? Math.round((found / total) * 100) : 0;

  summaryText.textContent =
    `You found ${found} of ${total} possible words (${percent}%). Final score: ${score}. ${reason}`;

  showFeedback(reason, "good");
}

function submitGuess() {
  if (!roundActive) return;

  const guess = guessInput.value.trim().toLowerCase();
  guessInput.value = "";
  guessInput.focus();

  if (!guess) {
    showFeedback("Type a word first.", "bad");
    return;
  }

  if (!/^[a-z]+$/.test(guess)) {
    showFeedback("Use letters only.", "bad");
    return;
  }

  if (!guess.startsWith(currentPrefix)) {
    showFeedback(
      `That word does not start with ${currentPrefix.toUpperCase()}.`,
      "bad"
    );
    return;
  }

  if (guessedWords.has(guess)) {
    showFeedback("You already found that one.", "bad");
    return;
  }

  if (!currentAnswers.includes(guess)) {
    showFeedback("Not in this round's answer list.", "bad");
    return;
  }

  guessedWords.add(guess);
  score += guess.length >= 8 ? 2 : 1;

  updateStats();
  renderBubbles();
  showFeedback(`Nice: ${guess}`, "good");

  if (guessedWords.size === currentAnswers.length) {
    endRound("You found every possible word!");
  }
}

function renderPrefix() {
  const display = currentPrefix ? currentPrefix.toUpperCase() : "---";
  prefixDisplay.textContent = display;
  prefixStat.textContent = display;
}

function renderBubbles() {
  bubbleField.innerHTML = "";

  if (!guessedWords.size) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = roundActive
      ? "Your correct guesses will appear here as bubbles."
      : "Start a round to begin finding words.";
    bubbleField.appendChild(empty);
    return;
  }

  const sortedWords = Array.from(guessedWords).sort((a, b) =>
    a.localeCompare(b)
  );

  sortedWords.forEach(word => {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = word;
    bubbleField.appendChild(bubble);
  });
}

function updateStats() {
  timeStat.textContent = String(timeLeft);
  scoreStat.textContent = String(score);
  foundStat.textContent = `${guessedWords.size} / ${currentAnswers.length}`;
}

function startTimer() {
  timerId = setInterval(() => {
    timeLeft -= 1;
    updateStats();

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateStats();
      endRound("Time's up!");
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function setControlsEnabled(enabled) {
  guessInput.disabled = !enabled;
  submitBtn.disabled = !enabled;
  skipBtn.disabled = !enabled;
}

function showFeedback(message, type = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`.trim();
}

function revealMissedWords() {
  missedWordsList.innerHTML = "";

  const missed = currentAnswers.filter(word => !guessedWords.has(word));

  if (!missed.length) {
    const item = document.createElement("div");
    item.className = "empty";
    item.textContent = "You found them all.";
    missedWordsList.appendChild(item);
    return;
  }

  missed.forEach(word => {
    const chip = document.createElement("div");
    chip.className = "word-chip";
    chip.textContent = word;
    missedWordsList.appendChild(chip);
  });
}

function clearMissedWords() {
  missedWordsList.innerHTML = "";

  const item = document.createElement("div");
  item.className = "empty";
  item.textContent = "End a round to reveal words you missed.";
  missedWordsList.appendChild(item);
}

difficultySelect.addEventListener("change", () => {
  currentDifficulty = difficultySelect.value;
  showFeedback(`Difficulty set to ${currentDifficulty}.`, "good");
});

durationSelect.addEventListener("change", () => {
  if (!roundActive) {
    timeLeft = Number(durationSelect.value);
    updateStats();
  }
});

submitBtn.addEventListener("click", submitGuess);

skipBtn.addEventListener("click", () => {
  if (roundActive) {
    endRound("Round skipped.");
  }
});

startBtn.addEventListener("click", startRound);

newRoundBtn.addEventListener("click", newRound);

endBtn.addEventListener("click", () => {
  if (roundActive) {
    endRound("Round ended.");
  }
});

guessInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitGuess();
  }
});

renderPrefix();
updateStats();
renderBubbles();
clearMissedWords();
loadPrefixPools();