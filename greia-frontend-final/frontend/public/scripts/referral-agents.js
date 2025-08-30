
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("referral-agents-list");

  const urlParams = new URLSearchParams(window.location.search);
  const filterSubtype = urlParams.get("subtype");

  try {
    const response = await fetch("/api/agents");
    const agents = await response.json();

    const referralAgents = agents.filter(agent =>
      agent.type === "referral agent" &&
      (agent.role === "real-estate" || agent.specialty === "real-estate") &&
      (!filterSubtype || agent.subtype === filterSubtype)
    );

    
    if (referralAgents.length === 0) {
      container.innerHTML = "<p>No agents found for this category.</p>";
      return;
    }

    referralAgents.forEach(agent => {
      const card = document.createElement("div");
      card.className = "user-card";

      card.innerHTML = `
        <div class="user-photo-wrap">
          <img src="${agent.photo || '/assets/blank-profile-picture-973460_960_720.webp'}" class="user-photo" />
        </div>
        <h3>⭐ ${agent.name}</h3>
        <p>${agent.email || ''}</p>
        <a href="/pages/profile-public.html?id=${agent.id}" class="view-profile">View Profile</a>
<button class="save-agent-btn" data-id="${agent.id}" style="margin-top:10px;padding:6px 14px;border:none;border-radius:5px;background:#28a745;color:white;cursor:pointer;">
  Save
</button>

      `;

      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = "<p>Failed to load referral agents.</p>";
  }
});
