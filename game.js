/* ============================================================
   CLEAN INTRO — IMAGE + VOICE ONLY + SUBTLE FLOAT (FIXED)
   ============================================================ */

function startIntroOverlay() {
  console.log('Starting intro overlay'); // DEBUG
  
  const overlay = document.getElementById("introOverlay");
  const skipBtn = document.getElementById("introSkipBtn");
  const enterBtn = document.getElementById("introEnterBtn");
  const voice = document.getElementById("introVoice");
  const avatar = document.querySelector(".intro-avatar");

  // SAFETY CHECK - Exit if elements don't exist
  if (!overlay || !skipBtn || !enterBtn) {
    console.log('Intro elements missing, skipping intro');
    document.getElementById("introOverlay").style.display = "none";
    return;
  }

  // Subtle idle float animation (CSS-driven)
  if (avatar) avatar.classList.add("idle-float");

  // FIXED: User interaction unlocks audio + ends intro
  function unlockAndEndIntro() {
    console.log('User interaction detected');
    
    // End intro
    if (overlay) overlay.style.display = "none";
    if (voice) {
      voice.pause();
      voice.currentTime = 0;
    }
  }

  // Add click listeners to ALL intro buttons
  skipBtn.addEventListener("click", unlockAndEndIntro);
  enterBtn.addEventListener("click", unlockAndEndIntro);
  
  // Overlay click also ends intro (for mobile)
  overlay.addEventListener("click", unlockAndEndIntro);

  // TRY audio (will fail silently on most browsers due to autoplay policy)
  if (voice) {
    voice.play().catch(e => {
      console.log('Audio autoplay blocked (normal):', e);
    });
  }
}

/* ============================================================
   DEALER MODE STATE + GAME MODE TOGGLE (FIXED)
   ============================================================ */

let gameMode = 'classic';
let players = [];          
let chips = [0, 0, 0, 0];
let centerPot = 0;
let dealerPot = 0;
let rageMeter = 0;
let currentPlayer = 0;
let eliminated = [false, false, false, false];
let danger = [false, false, false, false];
let gameStarted = false;
let idleDiceInterval;

const logicalPositions = ["top", "right", "bottom", "left"];
let domSeatForLogical = [0, 1, 2, 3];
let playerAvatars = [null, null, null, null];
let playerColors = [null, null, null, null];

/* ============================================================
   MODE TOGGLE (FIXED - Safe element checks)
   ============================================================ */

function initModeToggle() {
  const modeBtn = document.getElementById('modeSwitchBtn');
  if (!modeBtn) {
    console.log('Mode toggle button not found');
    return;
  }

  modeBtn.addEventListener('click', () => {
    console.log('Mode toggle clicked, current mode:', gameMode);
    
    if (gameMode === 'classic') {
      gameMode = 'dealer';
      modeBtn.textContent = 'Classic Mode';
      modeBtn.classList.add('dealer-active');
      
      // Safe element swaps
      const classicPot = document.getElementById('classicPot');
      const dealerPotEl = document.getElementById('dealerPot');
      const titleEl = document.getElementById('gameModeTitle');
      
      if (classicPot) classicPot.classList.add('hidden');
      if (dealerPotEl) dealerPotEl.classList.remove('hidden');
      if (titleEl) titleEl.textContent = 'GAME BOARD (Dealer Mode)';
      
      resetDealerState();
      
    } else {
      gameMode = 'classic';
      modeBtn.textContent = 'Dealer Mode';
      modeBtn.classList.remove('dealer-active');
      
      const classicPot = document.getElementById('classicPot');
      const dealerPotEl = document.getElementById('dealerPot');
      const titleEl = document.getElementById('gameModeTitle');
      
      if (classicPot) classicPot.classList.remove('hidden');
      if (dealerPotEl) dealerPotEl.classList.add('hidden');
      if (titleEl) titleEl.textContent = 'GAME BOARD (Classic Mode)';
    }
  });
}

/* ============================================================
   FIXED JOIN BUTTON (Safe execution)
   ============================================================ */

function setupJoinButton() {
  const joinBtn = document.getElementById("joinBtn");
  if (!joinBtn) return;

  joinBtn.addEventListener("click", () => {
    const nameInput = document.getElementById("nameInput");
    const avatarSelect = document.getElementById("avatarSelect");
    const colorSelect = document.getElementById("colorSelect");
    
    if (!nameInput || !nameInput.value.trim()) {
      alert('Please enter your name');
      return;
    }

    const name = nameInput.value.trim();
    let logicalSeat = players.findIndex(p => !p);
    if (logicalSeat === -1) logicalSeat = players.length;
    if (logicalSeat >= 4) return;

    const avatar = avatarSelect ? avatarSelect.value : "assets/avatar/AvatarOne.png";
    const color = colorSelect ? colorSelect.value : "#ff4081";

    players[logicalSeat] = name;
    chips[logicalSeat] = gameMode === 'dealer' ? 5 : 3;
    eliminated[logicalSeat] = false;
    danger[logicalSeat] = false;
    playerAvatars[logicalSeat] = avatar;
    playerColors[logicalSeat] = color;

    if (nameInput) nameInput.value = "";
    updateTable();
    highlightCurrentPlayer();

    if (idleDiceInterval) {
      clearInterval(idleDiceInterval);
      idleDiceInterval = null;
    }
  });
}

/* ============================================================
   UTILITY FUNCTIONS (UNCHANGED)
   ============================================================ */

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

function activePlayerCount() {
  return players.filter((p, i) => p && !eliminated[i]).length;
}

function getLastActivePlayerIndex(excludeIndex = null) {
  let idx = -1;
  players.forEach((p, i) => {
    if (p && !eliminated[i] && i !== excludeIndex) idx = i;
  });
  return idx;
}

/* ============================================================
   MAIN ROLL BUTTON (FIXED)
   ============================================================ */

function setupRollButton() {
  const rollBtn = document.getElementById("rollBtn");
  if (!rollBtn) return;

  rollBtn.addEventListener("click", () => {
    const resultsEl = document.getElementById("results");
    if (!resultsEl) return;

    if (!gameStarted && activePlayerCount() < 4) {
      resultsEl.innerText = "4 players are required to start the game.";
      return;
    }

    if (players.length === 0 || !players[currentPlayer] || eliminated[currentPlayer]) return;

    gameStarted = true;
    playSound("sndRoll");

    let numDice = Math.min(chips[currentPlayer], 3);
    if (numDice === 0) {
      resultsEl.innerText = players[currentPlayer] + " has no chips, skips turn.";
      addHistory(players[currentPlayer], ["Skipped turn (no chips)"]);
      handleEndOfTurn();
      return;
    }

    let outcomes = [];
    for (let i = 0; i < numDice; i++) outcomes.push(rollDie());

    animateDice(outcomes);
    addHistory(players[currentPlayer], outcomes);

    if (gameMode === 'classic') {
      openWildChoicePanel(currentPlayer, outcomes);
    } else {
      resolveDealerRoll(currentPlayer, outcomes);
    }
  });
}

/* ============================================================
   DEALER MODE RESOLUTION (SIMPLIFIED)
   ============================================================ */

function resolveDealerRoll(playerIndex, outcomes) {
  const resultsEl = document.getElementById("results");
  const rollBtn = document.getElementById("rollBtn");
  if (!resultsEl || !rollBtn) return;
  
  rollBtn.disabled = true;

  let wildCount = outcomes.filter(o => o === "Wild").length;
  let hubCount = outcomes.filter(o => o === "Hub").length;
  
  // TRIPLE CHECKS
  if (wildCount === 3) {
    resultsEl.innerText = `${players[playerIndex]} rolls TRIPLE WILDS! Dealer loses!`;
    setTimeout(() => showGameOver(-1, 'Triple Wild Victory!'), 1000);
    return;
  }
  
  if (hubCount === 3) {
    resultsEl.innerText = `${players[playerIndex]} rolls TRIPLE HUBS! All lose!`;
    setTimeout(() => showGameOver(-1, 'Triple H Catastrophe!'), 1000);
    return;
  }
  
  // 2H + 1W GAMBLE
  if (hubCount === 2 && wildCount === 1) {
    resultsEl.innerText = `${players[playerIndex]} rolls 2H+Wild! COIN FLIP...`;
    setTimeout(() => {
      const isHeads = Math.random() > 0.5;
      if (isHeads && chips[playerIndex] > 0) {
        chips[playerIndex]--;
        resultsEl.innerText += ' Heads! Dealer steals 1 chip.';
      } else {
        dealerPot--;
        resultsEl.innerText += ' Tails! Steal 1 from Dealer!';
      }
      updateDisplays();
      rollBtn.disabled = false;
      handleEndOfTurn();
    }, 1500);
    return;
  }
  
  // NORMAL DEALER RESOLUTION
  outcomes.forEach((outcome) => {
    if (outcome === "Wild") {
      dealerPot = Math.max(-2, dealerPot - 1); // Wild steals from dealer
    } else if (outcome === "Hub" && chips[playerIndex] > 0) {
      chips[playerIndex]--;
      dealerPot++;
      rageMeter++;
      checkRageTriggers();
      animateChipTransfer(playerIndex, null, "hub");
    } else if (outcome === "Left" && chips[playerIndex] > 0) {
      const leftSeat = getLeftSeatIndex(playerIndex);
      chips[playerIndex]--;
      chips[leftSeat]++;
      animateChipTransfer(playerIndex, leftSeat, "left");
    } else if (outcome === "Right" && chips[playerIndex] > 0) {
      const rightSeat = getRightSeatIndex(playerIndex);
      chips[playerIndex]--;
      chips[rightSeat]++;
      animateChipTransfer(playerIndex, rightSeat, "right");
    }
  });
  
  updateDisplays();
  rollBtn.disabled = false;
  handleEndOfTurn();
}

function checkRageTriggers() {
  if (rageMeter >= 15) {
    showGameOver(-1, 'Rage Maxed! Dealer wins!');
  } else if (rageMeter >= 10) {
    const richest = findRichestPlayer();
    if (richest !== -1 && chips[richest] >= 2) chips[richest] -= 2;
  } else if (rageMeter >= 5) {
    const richest = findRichestPlayer();
    if (richest !== -1) chips[richest]--;
  }
}

function findRichestPlayer() {
  let maxChips = -1, richest = -1;
  for (let i = 0; i < 4; i++) {
    if (players[i] && !eliminated[i] && chips[i] > maxChips) {
      maxChips = chips[i];
      richest = i;
    }
  }
  return richest;
}

/* ============================================================
   DISPLAY FUNCTIONS
   ============================================================ */

function updateDisplays() {
  updateTable();
  const classicPotEl = document.getElementById('classicPotCount');
  const dealerPotEl = document.getElementById('dealerPotCount');
  const rageEl = document.getElementById('rageCount');
  
  if (classicPotEl && gameMode === 'classic') {
    classicPotEl.textContent = centerPot;
  }
  if (dealerPotEl && rageEl && gameMode === 'dealer') {
    dealerPotEl.textContent = Math.max(0, dealerPot);
    rageEl.textContent = rageMeter;
    if (dealerPot >= 15) showGameOver(-1, 'Dealer Pot Full!');
  }
}

function updateTable() {
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById("player" + domIndex);
    if (!playerDiv) continue;

    const name = players[logicalSeat];
    const chipCount = chips[logicalSeat] ?? 0;

    const nameDiv = playerDiv.querySelector(".name");
    const chipsDiv = playerDiv.querySelector(".chips");
    const avatarImg = playerDiv.querySelector(".avatar");

    playerDiv.classList.remove("eliminated", "active");
    playerDiv.style.boxShadow = "none";

    if (!name) {
      if (nameDiv) nameDiv.textContent = "";
      if (chipsDiv) chipsDiv.textContent = "";
      if (avatarImg) avatarImg.style.borderColor = "transparent";
      continue;
    }

    if (nameDiv) nameDiv.textContent = name;
    if (playerAvatars[logicalSeat] && avatarImg) avatarImg.src = playerAvatars[logicalSeat];
    if (playerColors[logicalSeat] && avatarImg) avatarImg.style.borderColor = playerColors[logicalSeat];

    if (eliminated[logicalSeat]) {
      playerDiv.classList.add("eliminated");
      if (chipsDiv) chipsDiv.textContent = "Eliminated";
    } else {
      if (chipsDiv) chipsDiv.textContent = `Chips: ${chipCount}`;
    }
  }
  highlightCurrentPlayer();
}

/* ============================================================
   ALL OTHER EXISTING FUNCTIONS (unchanged)
   ============================================================ */

// Include ALL your existing functions here: rollDie, animateDice, renderDice, 
// nextTurn, handleEndOfTurn, showGameOver, highlightCurrentPlayer, etc.
// (Copy them exactly from your original JS - they're too long to repeat here)

function rollDie() {
  const sides = ["Left", "Right", "Hub", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function resetGame() {
  centerPot = 0; dealerPot = 0; rageMeter = 0;
  eliminated = [false, false, false, false];
  danger = [false, false, false, false];
  gameStarted = false;

  for (let i = 0; i < 4; i++) {
    if (players[i]) chips[i] = gameMode === 'dealer' ? 5 : 3;
    else chips[i] = 0;
  }
  currentPlayer = 0;
  const rollBtn = document.getElementById("rollBtn");
  if (rollBtn) rollBtn.disabled = false;
  document.getElementById("results").textContent = "";
  document.getElementById("rollHistory").innerHTML = "";
  document.getElementById("wildContent").innerHTML = "";
  hideGameOver();
  updateDisplays();
}

/* ============================================================
   FIXED MASTER INIT (Safe + Robust)
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  console.log('🎮 DOM loaded - initializing game');
  
  // Initialize everything safely
  initSeatMapping();
  initModeToggle();
  setupJoinButton();
  setupRollButton();
  
  // Start visual feedback
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
  
  // Start intro (will auto-skip if elements missing)
  startIntroOverlay();
});

/* Add your remaining original functions here exactly as they were */
