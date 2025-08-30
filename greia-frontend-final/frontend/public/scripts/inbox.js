/**
 * Simple Inbox UI:
 * - Lists conversations
 * - Loads messages
 * - Sends messages
 * - Creates a contract -> uploads PDF -> sends to participants
 */
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

let currentConversation = null;
let myUserId = null;

async function loadMe() {
  try {
    const me = await api('/api/users/me'); // adjust if your API differs
    myUserId = me.id || me.user_id || null;
  } catch (e) {
    console.warn('Could not fetch /users/me; user id unknown');
  }
}

async function loadConversations() {
  const list = document.getElementById('conversations');
  list.innerHTML = '<div class="list-item">Loading…</div>';
  const rows = await api('/api/conversations');
  list.innerHTML = '';
  let unreadTotal = 0;
  rows.forEach(r => {
    unreadTotal += (r.unread_count || 0);
    const div = document.createElement('div');
    div.className = 'list-item';
    div.dataset.id = r.id;
    div.innerHTML = `<div><strong>${r.subject || 'Conversation #' + r.id}</strong></div>
      <div class="muted">${r.last_message ? r.last_message.substring(0,80) : '—'}</div>`;
    div.addEventListener('click', () => openConversation(r.id, div));
    list.appendChild(div);
  });
  document.getElementById('unread-badge').textContent = unreadTotal ? unreadTotal + ' unread' : '';
}

async function openConversation(id, node=null) {
  currentConversation = id;
  document.querySelectorAll('.list-item').forEach(n => n.classList.remove('active'));
  if (node) node.classList.add('active');
  const data = await api('/api/conversations/' + id);
  document.getElementById('thread-title').textContent = data.conversation.subject || ('Conversation #' + id);

  const box = document.getElementById('messages');
  // load contracts list for this thread
  loadContractsForConversation();
  box.innerHTML = '';
  (data.messages || []).forEach(m => {
    const div = document.createElement('div');
    div.className = 'message' + (myUserId && m.sender_user_id === myUserId ? ' me' : '');
    div.textContent = m.body;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;

  // mark as read
  try { await api('/api/conversations/' + id + '/read', { method: 'PATCH' }); } catch(e){}

  // wire composer
  document.getElementById('send-btn').onclick = sendMessage;
  document.getElementById('msg-text').onkeydown = e => { if (e.key==='Enter') sendMessage(); };

  // wire contract button
  document.getElementById('btn-new-contract').onclick = () => {
    document.getElementById('contract-file').click();
  };
}

async function sendMessage() {
  const input = document.getElementById('msg-text');
  const txt = input.value.trim();
  if (!txt || !currentConversation) return;
  await api('/api/messages', { method: 'POST', body: JSON.stringify({ conversation_id: currentConversation, body: txt }) });
  input.value = '';
  // refresh thread quickly
  openConversation(currentConversation);
}

// Contract flow:
// 1) POST /api/contracts {title,type} -> returns {id, upload_url, s3_key}
// 2) Upload the selected file (PDF) to upload_url via PUT
// 3) POST /api/contracts/:id/send {conversation_id, signer_ids}

async function createAndSendContract(file) {
  if (!currentConversation || !file) return;
  const title = file.name.replace(/\.pdf$/i, '') || 'Contract';
  const c = await api('/api/contracts', { method: 'POST', body: JSON.stringify({ title, type: 'custom' }) });

  // Upload file to S3 presigned URL
  const putRes = await fetch(c.upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': 'application/pdf' } });
  if (!putRes.ok) throw new Error('Upload failed');

  // Fetch participants to default signers
  // We don't have a direct endpoint; reusing /conversations/:id data
  const data = await api('/api/conversations/' + currentConversation);
  const signer_ids = (data.participants || []).map(p => p.user_id);

  await api('/api/contracts/' + c.id + '/send', { method: 'POST', body: JSON.stringify({ conversation_id: currentConversation, signer_ids }) });
  alert('Contract sent!');
  await loadContractsForConversation();
  await refreshBadges();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadMe();
  await loadConversations();

  const contractInput = document.getElementById('contract-file');
  contractInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await createAndSendContract(file);
    } catch (err) {
      alert('Contract failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  });
});


// --- Contracts list + viewer ---
async function loadContractsForConversation() {
  if (!currentConversation) return;
  try {
    const rows = await api('/api/contracts?conversation_id=' + currentConversation);
    const box = document.getElementById('contracts');
    if (!rows.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="muted" style="margin-bottom:6px;">Contracts in this thread</div>';
    rows.forEach(item => {
      const c = item.contract;
      const signed = (item.signers || []).filter(s => s.signed_at).length;
      const total = (item.signers || []).length;
      const div = document.createElement('div');
      div.style.margin = '6px 0';
      div.innerHTML = \`<button data-id="\${c.id}" class="view-contract" style="padding:6px 10px;border-radius:8px;border:1px solid #ddd;">View</button>
        <span style="margin-left:8px;font-weight:600;">\${c.title}</span>
        <span class="muted" style="margin-left:6px;">(\${c.status}, \${signed}/\${total} signed)</span>\`;
      box.appendChild(div);
    });
    document.querySelectorAll('.view-contract').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await openContractViewer(id);
      });
    });
  } catch (e) {
    console.warn('Contracts list error', e.message);
  }
}

async function openContractViewer(id) {
  const modal = document.getElementById('contract-modal');
  const title = document.getElementById('contract-modal-title');
  const frame = document.getElementById('contract-frame');
  const btnClose = document.getElementById('contract-modal-close');
  const btnSign = document.getElementById('contract-modal-sign');

  const data = await api('/api/contracts/' + id);
  title.textContent = data.contract.title || 'Contract';
  // Fetch presigned view URL
  const u = await api('/api/contracts/' + id + '/download_url');
  frame.src = u.url;

  modal.style.display = 'flex';

  btnClose.onclick = () => { modal.style.display = 'none'; frame.src = 'about:blank'; };
  btnSign.onclick = async () => {
    try {
      await api('/api/contracts/' + id + '/sign', { method: 'POST' });
      alert('Signed!');
      modal.style.display = 'none';
      await loadContractsForConversation();
      await refreshBadges();
    } catch (e) {
      alert('Sign failed: ' + e.message);
    }
  };
}

// --- Badges across nav (messages unread, contracts pending, referrals) ---
async function refreshBadges() {
  try {
    // messages unread is on this page only: compute total from conversations list
    const rows = await api('/api/conversations');
    const unreadTotal = rows.reduce((a,r) => a + (r.unread_count || 0), 0);
    const mBadge = document.getElementById('badge-messages');
    if (mBadge) { mBadge.textContent = unreadTotal; mBadge.style.display = unreadTotal ? 'inline-block' : 'none'; }

    // contracts pending
    const c = await api('/api/contracts/pending/count');
    const cBadge = document.getElementById('badge-contracts') || document.getElementById('badge-contracts-global');
    // We didn't add a contracts link in nav, so attach to Inbox badge if no separate badge
    const target = cBadge || mBadge;
    if (target) {
      const val = c.pending || 0;
      target.textContent = (Number(target.textContent||0) + val);
      target.style.display = (Number(target.textContent) ? 'inline-block' : 'none');
    }

    // referrals counts
    const r = await api('/api/referrals/counts');
    const rBadge = document.getElementById('badge-referrals');
    const refTotal = (r.offered_to_me || 0) + (r.accepted_active || 0);
    if (rBadge) { rBadge.textContent = refTotal; rBadge.style.display = refTotal ? 'inline-block' : 'none'; }
  } catch (e) {
    console.warn('Badge refresh failed', e.message);
  }
}
