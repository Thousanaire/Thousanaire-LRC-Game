/* ============================================================
   THOUSANAIRE CASINO - SEPARATE MODES (Feb 17, 2026)
   ============================================================
   CLASSIC & DEALER = COMPLETELY SEPARATE GAMES
   No shared state - like different casino tables
   ============================================================ */

let currentGameMode = 'classic';  // Which game table we're on
let classicGame = {};             // Classic table state ONLY  
let dealerGame = {};              // Dealer table state ONLY

const logicalPositions = ["top", "left", "right", "bottom"];
let domSeatForLogical = [0, 1, 2, 3];

/* ============================================================
   CASINO FLOOR - MODE SELECTOR (Replaces modeSwitchBtn)
   ============================================================ */
function setupModeSelector() {
  const modeBtn = document.getElementById('modeSwitchBtn');
  if (!modeBtn) return;
  
  modeBtn.addEventListener('click', () => {
    // Switch between completely separate games
    if (currentGameMode === 'classic') {
      currentGameMode = 'dealer';
      modeBtn.textContent = 'Classic Mode';
      modeBtn.classList.add('dealer-active');
      
      // Hide Classic UI, show Dealer UI
      document.getElementById('classicPot').classList.add('hidden');
      document.getElementById('dealerPot').classList.remove('hidden');
      document.getElementById('gameModeTitle').textContent = 'DEALER MODE CASINO';
      
      // Start fresh Dealer game
      resetDealerGame();
      
    } else {
      currentGameMode = 'classic';
      modeBtn.textContent = 'Dealer Mode';
      modeBtn.classList.remove('dealer-active');
      
      // Hide Dealer UI, show Classic UI
      document.getElementById('classicPot').classList.remove('hidden');
      document.getElementById('dealerPot').classList.add('hidden');
      document.getElementById('gameModeTitle').textContent = 'CLASSIC MODE CASINO';
      
      // Start fresh Classic game
      resetClassicGame();
    }
    
    // Clear players for new game
    document.getElementById('nameInput').value = '';
    updateDisplays();
  });
}

/* ============================================================
   CLASSIC MODE GAME (3 chips, Hub Pot, Last Man Standing)
   ============================================================ */
function resetClassicGame() {
  classicGame = {
    players: ['', '', '', ''],
    chips: [0, 0, 0, 0],
    centerPot: 0,
    currentPlayer: 0,
    eliminated: [false, false, false, false],
    danger: [false, false, false, false],
    gameStarted: false
  };
}

function handleClassicJoin() {
  if (currentGameMode !== 'classic') return;
  
  const nameInput = document.getElementById('nameInput');
  const avatarSelect = document.getElementById('avatarSelect');
  const colorSelect = document.getElementById('colorSelect');
  
  if (!nameInput.value.trim()) {
    alert('Enter name for CLASSIC MODE');
    return;
  }

  const name = nameInput.value.trim();
  const avatar = avatarSelect.value;
  const color = colorSelect.value;
  
  // Find empty seat
  let seat = classicGame.players.findIndex(p => !p);
  if (seat === -1) {
    alert('Classic table full!');
    return;
  }

  classicGame.players[seat] = name;
  classicGame.chips[seat] = 3;  // Classic = 3 chips each
  classicGame.eliminated[seat] = false;
  
  nameInput.value = '';
  updateClassicDisplay();
}

function handleClassicRoll() {
  if (currentGameMode !== 'classic') return;
  
  const activeCount = classicGame.players.filter((p, i) => p && !classicGame.eliminated[i]).length;
  if (activeCount < 4) {
    document.getElementById('results').textContent = 'Need 4 players for Classic!';
    return;
  }

  // Roll dice
  let outcomes = [];
  let numDice = Math.min(classicGame.chips[classicGame.currentPlayer], 3);
  for (let i = 0; i < numDice; i++) {
    outcomes.push(rollDie());
  }
  
  animateDice(outcomes);
  playSound('sndRoll');
  
  document.getElementById('results').textContent = 
    `${classicGame.players[classicGame.currentPlayer]} rolls: ${outcomes.join(', ')}`;
  
  // Simple classic logic
  outcomes.forEach(outcome => {
    if (outcome === 'Hub' && classicGame.chips[classicGame.currentPlayer] > 0) {
      classicGame.chips[classicGame.currentPlayer]--;
      classicGame.centerPot++;
    }
    // Add Left/Right/Wild logic here
  });
  
  updateClassicDisplay();
  setTimeout(() => nextClassicTurn(), 1500);
}

function nextClassicTurn() {
  classicGame.currentPlayer = (classicGame.currentPlayer + 1) % 4;
  updateClassicDisplay();
}

function updateClassicDisplay() {
  // Update players
  for (let seat = 0; seat < 4; seat++) {
    const domIndex = domSeatForLogical[seat];
    const playerDiv = document.getElementById(`player${domIndex}`);
    
    const nameDiv = playerDiv.querySelector('.name');
    const chipsDiv = playerDiv.querySelector('.chips');
    const avatarImg = playerDiv.querySelector('.avatar');
    
    if (classicGame.players[seat]) {
      nameDiv.textContent = classicGame.players[seat];
      chipsDiv.textContent = `Chips: ${classicGame.chips[seat]}`;
      avatarImg.style.borderColor = '#00ff00'; // Active player color
    } else {
      nameDiv.textContent = '';
      chipsDiv.textContent = '';
      avatarImg.style.borderColor = 'transparent';
    }
  }
  
  document.getElementById('classicPotCount').textContent = classicGame.centerPot;
  document.getElementById('currentTurn').textContent = 
    `Classic Turn: ${classicGame.players[classicGame.currentPlayer] || '-'}`;
}

/* ============================================================
   DEALER MODE GAME (5 chips, Dealer Pot, Rage Meter)
   ============================================================ */
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
  if (currentGameMode !== 'dealer') return;
  
  const nameInput = document.getElementById('nameInput');
  if (!nameInput.value.trim()) {
    alert('Enter name for DEALER MODE');
    return;
  }

  const name = nameInput.value.trim();
  let seat = dealerGame.players.findIndex(p => !p);
  if (seat === -1) {
    alert('Dealer table full!');
    return;
  }

  dealerGame.players[seat] = name;
  dealerGame.chips[seat] = 5;  // Dealer = 5 chips each
  dealerGame.eliminated[seat] = false;
  
  nameInput.value = '';
  updateDealerDisplay();
}

function handleDealerRoll() {
  if (currentGameMode !== 'dealer') return;
  
  const activeCount = dealerGame.players.filter((p, i) => p && !dealerGame.eliminated[i]).length;
  if (activeCount < 4) {
    document.getElementById('results').textContent = 'Need 4 players for Dealer!';
    return;
  }

  let outcomes = [];
  let numDice = Math.min(dealerGame.chips[dealerGame.currentPlayer], 3);
  for (let i = 0; i < numDice; i++) {
    outcomes.push(rollDie());
  }
  
  animateDice(outcomes);
  playSound('sndRoll');
  
  // Dealer mode special rules
  let wildCount = outcomes.filter(o => o === 'Wild').length;
  let hubCount = outcomes.filter(o => o === 'Hub').length;
  
  dealerGame.dealerPot -= wildCount;  // Wilds hurt dealer
  dealerGame.rageMeter += hubCount;   // Hubs feed rage
  
  document.getElementById('results').textContent = 
    `${dealerGame.players[dealerGame.currentPlayer]} rolls: ${outcomes.join(', ')} | Dealer:${dealerGame.dealerPot} Rage:${dealerGame.rageMeter}`;
  
  updateDealerDisplay();
  setTimeout(() => nextDealerTurn(), 1500);
}

function nextDealerTurn() {
  dealerGame.currentPlayer = (dealerGame.currentPlayer + 1) % 4;
  updateDealerDisplay();
}

function updateDealerDisplay() {
  for (let seat = 0; seat < 4; seat++) {
    const domIndex = domSeatForLogical[seat];
    const playerDiv = document.getElementById(`player${domIndex}`);
    
    const nameDiv = playerDiv.querySelector('.name');
    const chipsDiv = playerDiv.querySelector('.chips');
    
    if (dealerGame.players[seat]) {
      nameDiv.textContent = dealerGame.players[seat];
      chipsDiv.textContent = `Chips: ${dealerGame.chips[seat]}`;
    } else {
      nameDiv.textContent = '';
      chipsDiv.textContent = '';
    }
  }
  
  document.getElementById('dealerPotCount').textContent = Math.max(0, dealerGame.dealerPot);
  document.getElementById('rageCount').textContent = dealerGame.rageMeter;
  document.getElementById('currentTurn').textContent = 
    `Dealer Turn: ${dealerGame.players[dealerGame.currentPlayer] || '-'}`;
}

/* ============================================================
   SHARED UTILITIES (Dice, Sounds, Intro)
   ============================================================ */
function rollDie() {
  return ['Left', 'Right', 'Hub', 'Dottt', 'Wild'][Math.floor(Math.random() * 5)];
}

function animateDice(outcomes) {
  const dice = document.querySelectorAll('#diceArea .die');
  dice.forEach((die, i) => {
    if (outcomes[i]) {
      die.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        die.style.transform = 'rotate(0deg)';
        // Update die image based on outcome
        die.src = `assets/dice/die${Math.floor(Math.random()*6)+1}.png`;
      }, 500);
    }
  });
}

function playSound(id) {
  try {
    const audio = document.getElementById(id);
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch(e) {}
}

function initSeatMapping() {
  // Map CSS classes to player positions
  const playerDivs = document.querySelectorAll('.player');
  logicalPositions.forEach((pos, logicalIdx) => {
    playerDivs.forEach((div, domIdx) => {
      if (div.classList.contains(pos)) {
        domSeatForLogical[logicalIdx] = domIdx;
      }
    });
  });
}

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
  
  skipBtn.onclick = endIntro;
  enterBtn.onclick = endIntro;
  overlay.addEventListener('click', endIntro, {once: true});
}

/* ============================================================
   EVENT HANDLERS (Single buttons, dual logic)
   ============================================================ */
function setupButtons() {
  // JOIN button - checks current mode
  document.getElementById('joinBtn').onclick = () => {
    if (currentGameMode === 'classic') handleClassicJoin();
    else handleDealerJoin();
  };
  
  // ROLL button - checks current mode  
  document.getElementById('rollBtn').onclick = () => {
    if (currentGameMode === 'classic') handleClassicRoll();
    else handleDealerRoll();
  };
  
  // RESET button
  document.getElementById('resetBtn').onclick = () => {
    if (currentGameMode === 'classic') resetClassicGame();
    else resetDealerGame();
    updateDisplays();
  };
}

function updateDisplays() {
  if (currentGameMode === 'classic') updateClassicDisplay();
  else updateDealerDisplay();
}

/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎰 THOUSANAIRE CASINO - Dual Tables Ready!');
  
  initSeatMapping();
  setupModeSelector();
  setupButtons();
  
  // Start with Classic Mode
  resetClassicGame();
  
  // Idle dice animation
  setInterval(() => {
    if (document.getElementById('diceArea')) {
      animateDice([rollDie(), rollDie()]);
    }
  }, 3000);
  
  startIntroOverlay();
});
