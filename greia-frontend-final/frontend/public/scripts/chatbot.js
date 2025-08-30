
document.addEventListener("DOMContentLoaded", function () {
  const icon = document.getElementById("chat-icon");
  const container = document.getElementById("chat-container");
  if (icon && container) {
    icon.addEventListener("click", function () {
      const open = container.style.display === "block";
      container.style.display = open ? "none" : "block";
    });
  }
});


document.addEventListener("DOMContentLoaded", function () {
  const sendBtn = document.getElementById("chat-send");
  const input = document.getElementById("chat-input");
  const output = document.getElementById("chat-output");

  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    const userMsgElem = document.createElement("div");
    userMsgElem.textContent = "You: " + message;
    output.appendChild(userMsgElem);

    try {
      const res = await fetch("/api/chatbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await res.json();
      const botMsgElem = document.createElement("div");
      botMsgElem.textContent = "Bot: " + data.reply;
      output.appendChild(botMsgElem);
    } catch (err) {
      const errorElem = document.createElement("div");
      errorElem.textContent = "Error contacting chatbot.";
      output.appendChild(errorElem);
    }

    input.value = "";
  }

  if (sendBtn && input && output) {
    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") sendMessage();
    });
  }
});
