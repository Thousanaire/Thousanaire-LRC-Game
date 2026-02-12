let players = [];          // logical seats: 0=TOP,1=RIGHT,2=BOTTOM,3=LEFT
let chips = [0, 0, 0, 0];
let centerPot = 0;
let currentPlayer = 0;
let idleDiceInterval;

let eliminated = [false, false, false, false];      // permanently out
let danger = [false, false, false, false];          // 0 chips, waiting for next turn

// logical seat order (clockwise)
const logicalPositions = ["top", "right", "bottom", "left"];

// domSeatForLogical[i] = DOM index of the player div for logical seat i
let domSeatForLogical = [0, 1, 2, 3];

// Build mapping from logical seats -> DOM seats based on .top/.right/.bottom/.left
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

// Join game: players sit CLOCKWISE by join order
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return;

  // find first empty logical seat (0-3)
  let logicalSeat = players.findIndex(p => !p);
  if (logicalSeat === -1) logicalSeat = players.length;
  if (logicalSeat >= 4) return;

  players[logicalSeat] = name;
  chips[logicalSeat] = 3;
  eliminated[logicalSeat] = false;
  danger[logicalSeat] = false;

  updateTable();
  document.getElementById("nameInput").value = "";
  highlightCurrentPlayer();

  if (idleDiceInterval) {
    clearInterval(idleDiceInterval);
    idleDiceInterval = null;
  }
});

// LEFT = clockwise to next non-eliminated player
function getLeftSeatIndex(seat) {
  let idx = seat;
  for (let i = 0; i < 4; i++) {
    idx = (idx + 1) % 4;
    if (players[idx] && !eliminated[idx]) return idx;
  }
  return seat;
}

// RIGHT = counter‑clockwise to next non-eliminated player
function getRightSeatIndex(seat) {
  let idx = seat;
  for (let i = 0; i < 4; i++) {
    idx = (idx - 1 + 4) % 4;
    if (players[idx] && !eliminated[idx]) return idx;
  }
  return seat;
}

// Roll dice
document.getElementById("rollBtn").addEventListener("click", () => {
  if (players.length === 0) return;
  if (!players[currentPlayer] || eliminated[currentPlayer]) return;

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    addHistory(players[currentPlayer], ["Skipped turn (no chips)"]);
    danger[currentPlayer] = true;
    nextTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) outcomes.push(rollDie());

  animateDice(outcomes);

  let wildCount = 0;

  outcomes.forEach(outcome => {
    if (outcome === "Left" && chips[currentPlayer] > 0) {
      const leftSeat = getLeftSeatIndex(currentPlayer);
      chips[currentPlayer]--;
      if (chips[currentPlayer] === 0) danger[currentPlayer] = true;
      chips[leftSeat]++;
      danger[leftSeat] = false;
      animateChipTransfer(currentPlayer, leftSeat, "left");
    }
    else if (outcome === "Right" && chips[currentPlayer] > 0) {
      const rightSeat = getRightSeatIndex(currentPlayer);
      chips[currentPlayer]--;
      if (chips[currentPlayer] === 0) danger[currentPlayer] = true;
      chips[rightSeat]++;
      danger[rightSeat] = false;
      animateChipTransfer(currentPlayer, rightSeat, "right");
    }
    else if (outcome === "Center" && chips[currentPlayer] > 0) {
      chips[currentPlayer]--;
      if (chips[currentPlayer] === 0) danger[currentPlayer] = true;
      centerPot++;
      animateChipTransfer(currentPlayer, null, "center");
    }
    else if (outcome === "Wild") {
      wildCount++;
    }
  });

  updateTable();
  addHistory(players[currentPlayer], outcomes);

  if (wildCount > 0) {
    handleWildSteals(currentPlayer, wildCount);
  } else {
    checkWinner();
    nextTurn();
  }
});

function rollDie() {
  const sides = ["Left", "Right", "Center", "Dottt", "Wild"];
  return sides[Math.floor(Math.random() * sides.length)];
}

// Animate dice with CSS spin effect
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

// Render dice images
function renderDice(outcomes) {
  return outcomes.map(o =>
    `<img src="assets/dice/${o}.png" alt="${o}" class="die">`
  ).join(" ");
}

// Update board using logical->DOM mapping
function updateTable() {
  for (let logicalSeat = 0; logicalSeat < 4; logicalSeat++) {
    const domIndex = domSeatForLogical[logicalSeat];
    const playerDiv = document.getElementById("player" + domIndex);
    if (!playerDiv) continue;

    const name = players[logicalSeat];
    const chipCount = chips[logicalSeat] ?? 0;

    const nameDiv = playerDiv.querySelector(".name");
    const chipsDiv = playerDiv.querySelector(".chips");

    playerDiv.classList.remove("eliminated");

    if (!name) {
      if (nameDiv) nameDiv.textContent = "";
      if (chipsDiv) chipsDiv.textContent = "";
      continue;
    }

    if (nameDiv) nameDiv.textContent = name;

    if (eliminated[logicalSeat]) {
      playerDiv.classList.add("eliminated");
      if (chipsDiv) chipsDiv.textContent = "Eliminated";
    } else {
      if (chipsDiv) chipsDiv.textContent = `Chips: ${chipCount}`;
    }
  }

  document.getElementById("centerPot").innerText = `Center Pot: ${centerPot}`;
}

// FIXED TURN ROTATION with elimination logic
function nextTurn() {
  if (players.length === 0) return;

  let attempts = 0;
  let next = currentPlayer;

  while (attempts < 10) {
    next = (next + 1) % 4;
    attempts++;

    if (!players[next]) continue;

    if (eliminated[next]) continue;

    if (chips[next] === 0) {
      if (danger[next]) {
        eliminated[next] = true;
        updateTable();
        continue;
      } else {
        danger[next] = true;
        continue;
      }
    }

    break;
  }

  currentPlayer = next;
  highlightCurrentPlayer();
}

function checkWinner() {
  let activePlayers = players.filter((p, i) => p && !eliminated[i]).length;
  if (activePlayers === 1) {
    let winnerIndex = players.findIndex((p, i) => p && !eliminated[i]);
    if (winnerIndex !== -1) {
      document.getElementById("results").innerText =
        players[winnerIndex] + " wins the pot of " + centerPot + "!";
      addHistory(players[winnerIndex], ["Winner!"]);
      document.getElementById("rollBtn").disabled = true;
      highlightCurrentPlayer();
    }
  }
}

function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach(el => el.classList.remove('active'));

  if (players.length === 0) {
    document.getElementById("currentTurn").textContent = "Current turn: -";
    return;
  }

  if (eliminated[currentPlayer] || !players[currentPlayer]) {
    document.getElementById("currentTurn").textContent = "Current turn: -";
    return;
  }

  const domIndex = domSeatForLogical[currentPlayer];
  const activeDiv = document.getElementById("player" + domIndex);
  if (activeDiv) activeDiv.classList.add('active');

  document.getElementById("currentTurn").textContent =
    "Current turn: " + (players[currentPlayer] || "-");
}

/*
===========================================
⭐ FLEXIBLE WILD STEAL LOGIC (Side Panel)
===========================================
*/
function handleWildSteals(rollerIndex, wildCount) {
  const wildContent = document.getElementById("wildContent");
  const rollBtn = document.getElementById("rollBtn");

  let stealsRemaining = wildCount;

  rollBtn.disabled = true;

  function renderWildPanel() {
    wildContent.innerHTML = `<h3>${players[rollerIndex]} has ${stealsRemaining} steal(s)</h3>`;

    const opponents = players
      .map((p, i) => ({ name: p, index: i }))
      .filter(o =>
        o.index !== rollerIndex &&
        pExists(o.index) &&
        chips[o.index] > 0 &&
        !eliminated[o.index]
      );

    if (opponents.length === 0) {
      wildContent.innerHTML += `<p>No opponents have chips to steal.</p>`;
      rollBtn.disabled = false;
      checkWinner();
      nextTurn();
      return;
    }

    opponents.forEach(opponent => {
      const btn = document.createElement("button");
      btn.textContent = `Steal from ${opponent.name}`;
      btn.onclick = () => {
        if (chips[opponent.index] > 0) {
          chips[opponent.index]--;
          if (chips[opponent.index] === 0) {
            danger[opponent.index] = true;
          }
          chips[rollerIndex]++;
          danger[rollerIndex] = false;
          stealsRemaining--;

          animateChipTransfer(opponent.index, rollerIndex, "wild");
        }

        updateTable();

        if (stealsRemaining <= 0) {
          wildContent.innerHTML = "";
          rollBtn.disabled = false;
          checkWinner();
          nextTurn();
        } else {
          renderWildPanel();
        }
      };
      wildContent.appendChild(btn);
    });
  }

  renderWildPanel();
}

function pExists(i) {
  return typeof players[i] !== "undefined" && players[i] !== null;
}

// Add roll history
function addHistory(player, outcomes) {
  const historyDiv = document.getElementById("rollHistory");
  const entry = document.createElement("div");
  entry.classList.add("history-entry");
  entry.textContent = `${player} rolled: (${outcomes.join(", ")})`;
  historyDiv.prepend(entry);
}

// Flying chip animation helpers
function getSeatCenter(logicalSeat) {
  const domIndex = domSeatForLogical[logicalSeat];
  const el = document.getElementById("player" + domIndex);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function getCenterPotCenter() {
  const el = document.getElementById("centerPot");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function animateChipTransfer(fromSeat, toSeat, type) {
  let fromPos = null;
  let toPos = null;

  if (fromSeat !== null && fromSeat !== undefined) {
    fromPos = getSeatCenter(fromSeat);
  }

  if (type === "center") {
    toPos = getCenterPotCenter();
  } else if (toSeat !== null && toSeat !== undefined) {
    toPos = getSeatCenter(toSeat);
  }

  if (!fromPos || !toPos) return;

  const chip = document.createElement("div");
  chip.className = "chip-fly";
  chip.style.left = fromPos.x + "px";
  chip.style.top = fromPos.y + "px";
  chip.style.transform = "scale(1)";

  document.body.appendChild(chip);

  requestAnimationFrame(() => {
    chip.style.left = toPos.x + "px";
    chip.style.top = toPos.y + "px";
    chip.style.transform = "scale(1.1)";
  });

  setTimeout(() => {
    chip.style.opacity = "0";
    chip.style.transform = "scale(0.7)";
    setTimeout(() => {
      if (chip.parentNode) chip.parentNode.removeChild(chip);
    }, 200);
  }, 350);
}

// Show random dice faces at startup and refresh every 2s until game starts
function showRandomDice() {
  const diceArea = document.getElementById("diceArea");
  let randomFaces = [];
  for (let i = 0; i < 3; i++) randomFaces.push(rollDie());
  diceArea.innerHTML = renderDice(randomFaces);

  const diceImgs = diceArea.querySelectorAll(".die");
  diceImgs.forEach(die => {
    die.classList.add("roll");
    setTimeout(() => die.classList.remove("roll"), 600);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSeatMapping();
  showRandomDice();
  idleDiceInterval = setInterval(showRandomDice, 2000);
});
