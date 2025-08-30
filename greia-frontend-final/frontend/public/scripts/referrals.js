const API_BASE = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
function authHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
async function api(path, opts={}) {
  const res = await fetch((API_BASE ? API_BASE : '') + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers||{}) }
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${t}`);
  }
  return res.json();
}

async function loadReferrals() {
  const tbody = document.querySelector('#ref-table tbody');
  tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';
  try {
    const rows = await api('/api/referrals');
    tbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.from_email || r.from_agent_user_id}</td>
        <td>${r.to_email || r.to_agent_user_id}</td>
        <td>${r.referral_fee_pct}</td>
        <td>${r.status}</td>
        <td>
          ${r.status === 'offered' ? '<button class="btn secondary" data-act="accept" data-id="'+r.id+'">Accept</button> <button class="btn" data-act="decline" data-id="'+r.id+'">Decline</button>' : ''}
          ${r.status === 'accepted' ? '<button class="btn primary" data-act="complete" data-id="'+r.id+'">Mark Completed</button>' : ''}
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        try {
          await api('/api/referrals/' + id + '/' + act, { method: 'POST' });
          await loadReferrals();
        } catch (e) {
          alert('Action failed: ' + e.message);
        }
      });
    });
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="6">Error loading referrals</td></tr>';
  }
}

async function offerReferral() {
  const toId = Number(document.getElementById('to-id').value);
  const fee = Number(document.getElementById('fee').value);
  const ctxText = document.getElementById('ctx').value.trim();
  let context = null;
  if (ctxText) {
    try { context = JSON.parse(ctxText); } catch (e) { return alert('Invalid JSON in context'); }
  }
  if (!toId) return alert('Enter a valid To Agent User ID');

  try {
    await api('/api/referrals', { method: 'POST', body: JSON.stringify({ to_agent_user_id: toId, referral_fee_pct: fee, property_context: context }) });
    document.getElementById('to-id').value = '';
    document.getElementById('fee').value = 25;
    document.getElementById('ctx').value = '';
    await loadReferrals();
    alert('Referral sent');
  } catch (e) {
    alert('Failed to send referral: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadReferrals();
  document.getElementById('offer-btn').addEventListener('click', offerReferral);
});
