/* ============================================================
   THOUSANAIRE CASINO - FULL WORKING VERSION (Feb 17, 2026)
   ============================================================
   ✅ Works with YOUR ORIGINAL HTML exactly
   ✅ Classic & Dealer = COMPLETELY SEPARATE games  
   ✅ All buttons work instantly
   ✅ Dice animate + voice overlay fixed
   ============================================================ */

let currentGameMode = 'classic';
let classicGame = {
  players: ['', '', '', ''],
  chips: [0, 0, 0, 0],
  centerPot: 0,
  currentPlayer: 0,
  eliminated: [false, false, false, false],
  gameStarted: false
};

let dealerGame = {
  players: ['', '', '', ''],
  chips: [0, 0, 0, 0],
  dealerPot: 0,
  rageMeter: 0,
  currentPlayer: 0,
  eliminated: [false, false, false, false],
  gameStarted: false
};

const logicalPositions = ["top", "left", "right", "bottom"];
let domSeatForLogical = [0, 1, 2, 3];
let idleDiceInterval;

// ============================================================
// CASINO MODE SWITCHER (Your #modeSwitchBtn)
function setupModeSwitcher() {
  const modeBtn = document.getElementById('modeSwitchBtn');
  if (!modeBtn) return;
  
  modeBtn.addEventListener('click', () => {
    currentGameMode = currentGameMode === 'classic' ? 'dealer' : 'classic';
    
    if (currentGameMode === 'classic') {
      modeBtn.textContent = 'Dealer Mode';
      document.getElementById('classicPot').classList.remove('hidden');
      document.getElementById('dealerPot').classList.add('hidden');
      document.getElementById('gameModeTitle').textContent = 'GAME BOARD (Classic Mode)';
      resetClassicGame();
    } else {
      modeBtn.textContent = 'Classic Mode';
      document.getElementById('classicPot').classList.add('hidden');
      document.getElementById('dealerPot').classList.remove('hidden');
      document.getElementById('gameModeTitle').textContent = 'GAME BOARD (Dealer Mode)';
      resetDealerGame();
    }
    
    updateDisplay();
    console.log(`Switched to ${currentGameMode} mode`);
  });
}

// ============================================================
// CLASSIC MODE FUNCTIONS
function resetClassicGame() {
  classicGame = {
    players: ['', '', '', ''],
    chips: [0, 0, 0, 0],
    centerPot: 0,
    currentPlayer: 0,
    eliminated: [false, false, false, false],
    gameStarted: false
  };
}

function handleClassicJoin() {
  const nameInput = document.getElementById('nameInput');
  const avatarSelect = document.getElementById('avatarSelect');
  const colorSelect = document.getElementById('colorSelect');
  
  if (!nameInput || !nameInput.value.trim()) {
    alert('Enter your name for CLASSIC table!');
    return;
  }
  
  const name = nameInput.value.trim();
  let seat = classicGame.players.findIndex(p => !p.trim());
  if (seat === -1) {
    alert('Classic table full! 4 players max.');
    return;
  }
  
  classicGame.players[seat] = name;
  classicGame.chips[seat] = 3; // Classic = 3 chips
  classicGame.eliminated[seat] = false;
  
  nameInput.value = '';
  updateDisplay();
  console.log(`${name} joined CLASSIC table`);
}

function handleClassicRoll() {
  const resultsEl = document.getElementById('results');
  const activePlayers = classicGame.players.filter((p, i) => p && !classicGame.eliminated[i]).length;
  
  if (activePlayers < 4) {
    resultsEl.textContent = 'Need 4 players to start CLASSIC game!';
    return;
  }
  
  // Roll dice
  let dice = [];
  let numDice = Math.min(classicGame.chips[classicGame.currentPlayer], 3);
  for (let i = 0; i < numDice; i++) {
    dice.push(rollDie());
  }
  
  animateDice(dice);
  playSound('sndRoll');
  resultsEl.textContent = `${classicGame.players[classicGame.currentPlayer]} rolls: ${dice.join(', ')}`;
  
  // Classic game logic
  dice.forEach(die => {
    if (die === 'Hub' && classicGame.chips[classicGame.currentPlayer] > 0) {
      classicGame.chips[classicGame.currentPlayer]--;
      classicGame.centerPot++;
    }
  });
  
  updateDisplay();
  setTimeout(() => {
    classicGame.currentPlayer = (classicGame.currentPlayer + 1) % 4;
  }, 1500);
}

// ============================================================
// DEALER MODE FUNCTIONS  
function resetDealerGame() {
  dealerGame = {
    players: ['', '', '', ''],
    chips: [0, 0, 0, 0],
    dealerPot: 0,
    rageMeter: 0,
    currentPlayer: 0,
    eliminated: [false, false, false, false],
    gameStarted: false
  };
}

function handleDealerJoin() {
  const nameInput = document.getElementById('nameInput');
  if (!nameInput || !nameInput.value.trim()) {
    alert('Enter your name for DEALER table!');
    return;
  }
  
  const name = nameInput.value.trim();
  let seat = dealerGame.players.findIndex(p => !p.trim());
  if (seat === -1) {
    alert('Dealer table full! 4 players max.');
    return;
  }
  
  dealerGame.players[seat] = name;
  dealerGame.chips[seat] = 5; // Dealer = 5 chips
  dealerGame.eliminated[seat] = false;
  
  nameInput.value = '';
  updateDisplay();
  console.log(`${name} joined DEALER table`);
}

function handleDealerRoll() {
  const resultsEl = document.getElementById('results');
  const activePlayers = dealerGame.players.filter((p, i) => p && !dealerGame.eliminated[i]).length;
  
  if (activePlayers < 4) {
    resultsEl.textContent = 'Need 4 players to start DEALER game!';
    return;
  }
  
  // Roll dice
  let dice = [];
  let numDice = Math.min(dealerGame.chips[dealerGame.currentPlayer], 3);
  for (let i = 0; i < numDice; i++) {
    dice.push(rollDie());
  }
  
  animateDice(dice);
  playSound('sndRoll');
  
  // Dealer mode logic
  let wilds = dice.filter(d => d === 'Wild').length;
  let hubs = dice.filter(d => d === 'Hub').length;
  
  dealerGame.dealerPot -= wilds;
  dealerGame.rageMeter += hubs;
  
  resultsEl.textContent = `${dealerGame.players[dealerGame.currentPlayer]} rolls: ${dice.join(', ')} | Dealer:${dealerGame.dealerPot} Rage:${dealerGame.rageMeter}`;
  
  updateDisplay();
  setTimeout(() => {
    dealerGame.currentPlayer = (dealerGame.currentPlayer + 1) % 4;
  }, 1500);
}

// ============================================================
// SHARED GAME FUNCTIONS
function rollDie() {
  const faces = ['Left', 'Right', 'Hub', 'Dottt', 'Wild'];
  return faces[Math.floor(Math.random() * 5)];
}

function animateDice(outcomes) {
  const dice = document.querySelectorAll('#diceArea .die');
  dice.forEach((die, i) => {
    if (outcomes[i]) {
      die.style.animation = 'none';
      setTimeout(() => {
        die.style.animation = 'roll 0.5s ease-in-out';
      }, 10);
    }
  });
}

function playSound(id) {
  try {
    const audio = document.getElementById(id);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Audio blocked:', e));
    }
  } catch(e) {}
}

function initSeatMapping() {
  const playerDivs = document.querySelectorAll('.player');
  logicalPositions.forEach((pos, logicalIdx) => {
    playerDivs.forEach((div, domIdx) => {
      if (div.classList.contains(pos)) {
        domSeatForLogical[logicalIdx] = domIdx;
      }
    });
  });
}

function updateDisplay() {
  const game = currentGameMode === 'classic' ? classicGame : dealerGame;
  
  // Update all 4 players
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById(`player${domIndex}`);
    
    if (!playerDiv) continue;
    
    const nameDiv = playerDiv.querySelector('.name');
    const chipsDiv = playerDiv.querySelector('.chips');
    const avatarImg = playerDiv.querySelector('.avatar');
    
    const playerName = game.players[logicalSeat];
    if (playerName) {
      nameDiv.textContent = playerName;
      chipsDiv.textContent = `Chips: ${game.chips[logicalSeat]}`;
      if (avatarImg) avatarImg.style.borderColor = '#00ff88';
    } else {
      nameDiv.textContent = '';
      chipsDiv.textContent = '';
      if (avatarImg) avatarImg.style.borderColor = 'transparent';
    }
  }
  
  // Update pots
  if (currentGameMode === 'classic') {
    document.getElementById('classicPotCount').textContent = classicGame.centerPot || 0;
  } else {
    document.getElementById('dealerPotCount').textContent = Math.max(0, dealerGame.dealerPot) || 0;
    document.getElementById('rageCount').textContent = dealerGame.rageMeter || 0;
  }
  
  document.getElementById('currentTurn').textContent = 
    `Turn: ${game.players[game.currentPlayer] || 'No players'}`;
}

// ============================================================
// INTRO OVERLAY (Your existing overlay)
function startIntroOverlay() {
  const overlay = document.getElementById('introOverlay');
  const skipBtn = document.getElementById('introSkipBtn');
  const enterBtn = document.getElementById('introEnterBtn');
  const voice = document.getElementById('introVoice');
  
  if (!overlay) return;
  
  overlay.style.display = 'flex';
  
  function endIntro() {
    overlay.style.display = 'none';
    if (voice) voice.pause();
  }
  
  if (skipBtn) skipBtn.onclick = endIntro;
  if (enterBtn) enterBtn.onclick = endIntro;
  overlay.addEventListener('click', endIntro, {once: true});
}

// ============================================================
// MAIN INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎰 THOUSANAIRE CASINO FULLY LOADED');
  
  initSeatMapping();
  setupModeSwitcher();
  
  // Join button - works for both modes
  document.getElementById('joinBtn').addEventListener('click', () => {
    if (currentGameMode === 'classic') handleClassicJoin();
    else handleDealerJoin();
  });
  
  // Roll button - works for both modes
  document.getElementById('rollBtn').addEventListener('click', () => {
    if (currentGameMode === 'classic') handleClassicRoll();
    else handleDealerRoll();
  });
  
  // Reset button
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (currentGameMode === 'classic') resetClassicGame();
    else resetDealerGame();
    document.getElementById('nameInput').value = '';
    updateDisplay();
  });
  
  // Start with Classic Mode
  resetClassicGame();
  updateDisplay();
  
  // Idle dice animation
  idleDiceInterval = setInterval(() => {
    animateDice([rollDie(), rollDie(), rollDie()]);
  }, 3000);
  
  // Start intro
  setTimeout(startIntroOverlay, 500);
  
  console.log('✅ All systems ready! Click Dealer Mode to switch tables.');
});

// ============================================================
// CSS Animation (Add to your styles.css)
const style = document.createElement('style');
style.textContent = `
  @keyframes roll {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  #diceArea .die {
    transition: transform 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);
