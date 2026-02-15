/* ============================================================
   CLEAN INTRO — IMAGE + VOICE ONLY + SUBTLE FLOAT (FIXED)
   ============================================================ */

function startIntroOverlay() {
  const overlay = document.getElementById("introOverlay");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  const avatar = document.querySelector(".intro-avatar");

  console.log("Intro elements found:", { overlay, skipBtn, enterBtn, voice, avatar });

  if (!overlay || !skipBtn || !enterBtn || !voice || !avatar) {
    console.error("Missing intro elements!");
    overlay?.style.display = "none";
    return;
  }

  // Subtle idle float animation (CSS-driven)
  avatar.classList.add("idle-float");

  let audioUnlocked = false;
  let introEnded = false;

  function endIntro() {
    if (introEnded) return;
    introEnded = true;
    
    console.log("Ending intro");
    voice.pause();
    voice.currentTime = 0;
    overlay.style.display = "none";
  }

  function unlockAndPlayAudio() {
    if (audioUnlocked || voice.ended || introEnded) return;
    
    audioUnlocked = true;
    console.log("User gesture detected - playing audio");
    voice.currentTime = 0;
    voice.play().catch(e => {
      console.error("Audio play failed:", e);
    });
  }

  // FIXED BUTTONS - Skip/Enter ALWAYS work immediately
  skipBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    endIntro();
  });
  
  enterBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    endIntro();
  });

  // FIXED OVERLAY CLICK - Click anywhere except buttons to start audio
  overlay.addEventListener("click", (e) => {
    if (e.target.id === "introSkipBtn" || e.target.id === "introEnterBtn") return;
    unlockAndPlayAudio();
  });

  // Initial attempt (will fail on most browsers - that's normal)
  setTimeout(() => {
    voice.play().catch(() => {
      console.log("Autoplay blocked (normal) - click to start audio");
    });
  }, 250);

  // Auto-skip if audio fails completely after 10s
  setTimeout(() => {
    if (!audioUnlocked && !introEnded) {
      console.log("Auto-skipping intro after 10s");
      endIntro();
    }
  }, 10000);
}

/* ============================================================
   YOUR EXISTING GAME CODE (WITH 5-SECOND GAME OVER DELAYS)
   ============================================================ */

let players = [];          // logical seats: 0=TOP,1=RIGHT,2=BOTTOM,3=LEFT
let chips = [0, 0, 0, 0];
let centerPot = 0;
let currentPlayer = 0;
let idleDiceInterval;

let eliminated = [false, false, false, false];
let danger = [false, false, false, false];

const logicalPositions = ["top", "right", "bottom", "left"];
let domSeatForLogical = [0, 1, 2, 3];

let playerAvatars = [null, null, null, null];
let playerColors = [null, null, null, null];

// NEW: track if game has started (first valid roll done)
let gameStarted = false;

function initSeatMapping() {
  const playerDivs = document.querySelectorAll(".player");
  logicalPositions.forEach((pos, logicalIndex) => {
    playerDivs.forEach((div, domIndex) => {
      if (div.classList.contains(pos)) {
        domSeatForLogical[logicalIndex] = domIndex;
      }
    });
  });
}

function playSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.currentTime = 0;
  el.play().catch(() => {});
}

document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  let logicalSeat = players.findIndex(p => !p);
  if (logicalSeat === -1) logicalSeat = players.length;
  if (logicalSeat >= 4) return;

  const avatar = document.getElementById("avatarSelect").value;
  const color = document.getElementById("colorSelect").value;

  players[logicalSeat] = name;
  chips[logicalSeat] = 3;
  eliminated[logicalSeat] = false;
  danger[logicalSeat] = false;
  playerAvatars[logicalSeat] = avatar;
  playerColors[logicalSeat] = color;

  updateTable();
  document.getElementById("nameInput").value = "";
  highlightCurrentPlayer();

  if (idleDiceInterval) {
    clearInterval(idleDiceInterval);
    idleDiceInterval = null;
  }
});

document.getElementById("resetBtn").addEventListener("click", () => {
  resetGame();
});

document.getElementById("playAgainBtn").addEventListener("click", () => {
  resetGame();
  hideGameOver();
});

function getLeftSeatIndex(seat) {
  let idx = seat;
  for (let i = 0; i < 4; i++) {
    idx = (idx + 1) % 4;
    if (players[idx] && !eliminated[idx]) return idx;
  }
  return seat;
}

function getRightSeatIndex(seat) {
  let idx = seat;
  for (let i = 0; i < 4; i++) {
    idx = (idx - 1 + 4) % 4;
    if (players[idx] && !eliminated[idx]) return idx;
  }
  return seat;
}

document.getElementById("rollBtn").addEventListener("click", () => {
  const resultsEl = document.getElementById("results");

  // REQUIRE 4 PLAYERS ONLY BEFORE GAME START
  if (!gameStarted && activePlayerCount() < 4) {
    if (resultsEl) {
      resultsEl.innerText = "4 players are required to start the game.";
    }
    return;
  }

  if (players.length === 0) return;
  if (!players[currentPlayer] || eliminated[currentPlayer]) return;

  // From here, consider the game started
  gameStarted = true;

  playSound("sndRoll");

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    addHistory(players[currentPlayer], ["Skipped turn (no chips)"]);
    
    if (activePlayerCount() === 2 && chips[currentPlayer] === 0) {
      const winnerIndex = getLastActivePlayerIndex(currentPlayer);
      if (winnerIndex !== -1) {
        document.getElementById("results").innerText += " - Last man standing wins!";
        showGameOver(winnerIndex);
        return;
      }
    }
    
    danger[currentPlayer] = true;
    handleEndOfTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) outcomes.push(rollDie());

  animateDice(outcomes);
  addHistory(players[currentPlayer], outcomes);

  openWildChoicePanel(currentPlayer, outcomes);
});

function rollDie() {
  const sides = ["Left", "Right", "Hub", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function animateDice(outcomes) {
  const diceArea = document.getElementById("diceArea");
  diceArea.innerHTML = renderDice(outcomes);

  const diceImgs = diceArea.querySelectorAll(".die");
  diceImgs.forEach((die, i) => {
    die.classList.add("roll");
    setTimeout(() => {
      die.classList.remove("roll");
      die.src = `assets/dice/${outcomes[i]}.png`;
    }, 600);
  });
}

function renderDice(outcomes) {
  return outcomes.map(o =>
    `<img src="assets/dice/${o}.png" alt="${o}" class="die">`
  ).join(" ");
}

function updateTable() {
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById("player" + domIndex);
   
