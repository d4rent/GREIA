
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("agent-list");

  try {
    const response = await fetch("/api/agents");
    const agents = await response.json();

    agents.forEach(agent => {
      if (agent.role !== "real-estate") return;

      const card = document.createElement("div");
      card.className = "user-card";

      const isReferral = agent.type === "referral agent";
      const star = isReferral ? "⭐ " : "";

      card.innerHTML = `
        <div class="user-photo-wrap">
          <img src="${agent.photo || '/assets/blank-profile-picture-973460_960_720.webp'}" class="user-photo" />
        </div>
        <h3>${star}${agent.name}</h3>
        <p>${agent.email || ''}</p>
        <a href="/pages/profile-public.html?id=${agent.id}" class="view-profile">View Profile</a>
<button class="save-agent-btn" data-id="${agent.id}" style="margin-top:10px;padding:6px 14px;border:none;border-radius:5px;background:#28a745;color:white;cursor:pointer;">
  Save
</button>

      `;

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = "<p>Failed to load agents.</p>";
  }
});
