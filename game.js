let players = [];
let chips = [];
let centerPot = 0;
let currentPlayer = 0;

// Join game
document.getElementById("joinBtn").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();
  if (name && players.length < 4) { // limit to 4 seats for now
    players.push(name);
    chips.push(3);
    updateTable();
    document.getElementById("nameInput").value = "";
    highlightCurrentPlayer(); // show first player once someone joins
  }
});

// Roll dice
document.getElementById("rollBtn").addEventListener("click", () => {
  if (players.length === 0) return;

  let numDice = Math.min(chips[currentPlayer], 3);
  if (numDice === 0) {
    document.getElementById("results").innerText =
      players[currentPlayer] + " has no chips, skips turn.";
    nextTurn();
    return;
  }

  let outcomes = [];
  for (let i = 0; i < numDice; i++) {
    outcomes.push(rollDie());
  }

  document.getElementById("results").innerText =
    players[currentPlayer] + " rolled: " + outcomes.join(", ");

  outcomes.forEach(outcome => {
    if (chips[currentPlayer] > 0) {
      if (outcome === "L") {
        chips[currentPlayer]--;
        chips[(currentPlayer - 1 + players.length) % players.length]++;
      } else if (outcome === "R") {
        chips[currentPlayer]--;
        chips[(currentPlayer + 1) % players.length]++;
      } else if (outcome === "C") {
        chips[currentPlayer]--;
        centerPot++;
      }
      // Dot means keep chip, no action
    }
  });

  updateTable();
  checkWinner();
  nextTurn();
});

function rollDie() {
  const sides = ["L", "R", "C", "Dot"];
  return sides[Math.floor(Math.random() * sides.length)];
}

function updateTable() {
  players.forEach((p, i) => {
    const playerDiv = document.getElementById("player" + i);
    if (playerDiv) {
      playerDiv.innerText = `${p}\nChips: ${chips[i]}`;
    }
  });
  document.getElementById("centerPot").innerText = `Center Pot: ${centerPot}`;
}

function nextTurn() {
  currentPlayer = (currentPlayer + 1) % players.length;
  highlightCurrentPlayer();
}

function checkWinner() {
  let activePlayers = chips.filter(c => c > 0).length;
  if (activePlayers === 1) {
    let winnerIndex = chips.findIndex(c => c > 0);
    document.getElementById("results").innerText =
      players[winnerIndex] + " wins the pot of " + centerPot + "!";
    document.getElementById("rollBtn").disabled = true;
    highlightCurrentPlayer(); // freeze highlight on winner
  }
}

// Highlight current player’s seat
function highlightCurrentPlayer() {
  document.querySelectorAll('.player').forEach((el, i) => {
    el.classList.toggle('active', i === currentPlayer);
  });
}
