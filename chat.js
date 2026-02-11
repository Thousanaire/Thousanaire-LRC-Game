const chatDiv = document.getElementById("chatMessages");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

// Send on button click
sendBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (text !== "") {
    addMessage(getCurrentPlayerName(), text);
    input.value = "";
  }
});

// Send on Enter key
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const text = input.value.trim();
    if (text !== "") {
      addMessage(getCurrentPlayerName(), text);
      input.value = "";
    }
  }
});

function addMessage(user, text) {
  const msg = document.createElement("p");
  msg.textContent = `${user}: ${text}`;
  chatDiv.appendChild(msg);

  // Scroll to bottom so latest message is visible
  chatDiv.scrollTop = chatDiv.scrollHeight;

  // Optional: make chat talk
  let utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

// Helper: get current player name from game.js
function getCurrentPlayerName() {
  if (typeof players !== "undefined" && players.length > 0) {
    return players[currentPlayer];
  }
  return "Guest";
}
