const API = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
function authHeaders(){ const t = localStorage.getItem('token')||sessionStorage.getItem('token'); return t?{'Authorization': 'Bearer '+t}:{ }; }
async function api(path, opts={}){ const res = await fetch((API?API:'')+path, {...opts, headers:{'Content-Type':'application/json', ...authHeaders(), ...(opts.headers||{})}}); if(!res.ok){throw new Error(await res.text());} return res.json(); }

// Deals Kanban
async function loadDeals(){
  const cols = document.querySelectorAll('.col');
  cols.forEach(c => c.querySelector('.list').innerHTML = '<div class="muted">Loading…</div>');
  const f = getFilters();
  const qs = new URLSearchParams({ stage:f.stage||'', source:f.source||'', date_from:f.from||'', date_to:f.to||'' }).toString();
  const rows = await api('/api/crm/deals' + (qs?'?'+qs:''));
  const byStage = { new:[], qualified:[], proposal:[], won:[], lost:[] };
  rows.forEach(d => { (byStage[d.stage]||byStage.new).push(d); });
  cols.forEach(col => {
    const s = col.dataset.stage;
    const list = col.querySelector('.list');
    list.innerHTML = '';
    (byStage[s]||[]).forEach(d => {
      const div = document.createElement('div');
      div.className = 'deal';
      div.innerHTML = `<div><strong>${d.title}</strong></div>
        <div class="muted">${d.source || 'manual'}</div>
        <div class="amt">€ ${(d.amount_cents/100).toFixed(2)}</div>
        <div style="margin-top:6px;">
          <select data-id="${d.id}" class="stage">
            ${['new','qualified','proposal','won','lost'].map(x=>`<option value="${x}" ${x===d.stage?'selected':''}>${x}</option>`).join('')}
          </select>
          <button data-id="${d.id}" class="del" style="float:right;">Delete</button>
        </div>`;
      list.appendChild(div);
      div.addEventListener('click', () => openDrawerForDeal(d));
    });
  });
  enableDnD();
  // Wire stage changes and delete
  document.querySelectorAll('select.stage').forEach(sel => sel.addEventListener('change', async ()=>{
    const id = sel.dataset.id; const stage = sel.value;
    await api('/api/crm/deals/'+id, { method:'PUT', body: JSON.stringify({ stage }) });
    await loadDeals();
  }));
  document.querySelectorAll('button.del').forEach(btn => btn.addEventListener('click', async ()=>{
    await api('/api/crm/deals/'+btn.dataset.id, { method:'DELETE' }); await loadDeals();
  }));
}

// Contacts
async function loadContacts(){
  const tbody = document.querySelector('#contacts tbody');
  tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
  const rows = await api('/api/crm/contacts');
  tbody.innerHTML = '';
  rows.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.full_name}</td><td>${c.email||''}</td><td>${c.phone||''}</td>
      <td><button data-id="${c.id}" class="del-contact">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.del-contact').forEach(b => b.addEventListener('click', async ()=>{
    await api('/api/crm/contacts/'+b.dataset.id, { method:'DELETE' });
    await loadContacts();
  }));
}

// Tasks
async function loadTasks(){
  const tbody = document.querySelector('#tasks tbody');
  tbody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
  const rows = await api('/api/crm/tasks');
  tbody.innerHTML = '';
  rows.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.title}</td><td>${t.due_at || ''}</td>
      <td><select data-id="${t.id}" class="task-status"><option value="open" ${t.status==='open'?'selected':''}>open</option><option value="done" ${t.status==='done'?'selected':''}>done</option></select></td>
      <td><button data-id="${t.id}" class="del-task">Delete</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.task-status').forEach(sel => sel.addEventListener('change', async ()=>{
    await api('/api/crm/tasks/'+sel.dataset.id, { method:'PUT', body: JSON.stringify({ status: sel.value }) }); await loadTasks();
  }));
  tbody.querySelectorAll('.del-task').forEach(b => b.addEventListener('click', async ()=>{
    await api('/api/crm/tasks/'+b.dataset.id, { method:'DELETE' }); await loadTasks();
  }));
}

// Add handlers
document.addEventListener('DOMContentLoaded', () => {
  loadDeals(); loadContacts(); loadTasks(); loadAnalytics();

  document.getElementById('add-deal').addEventListener('click', async ()=>{
    const title = (document.getElementById('deal-title').value||'').trim();
    const amount = Math.round(Number(document.getElementById('deal-amount').value||0)*100);
    if(!title) return alert('Enter a title');
    await api('/api/crm/deals', { method:'POST', body: JSON.stringify({ title, amount_cents: amount }) });
    document.getElementById('deal-title').value=''; document.getElementById('deal-amount').value='';
    await loadDeals();
  });

  document.getElementById('add-contact').addEventListener('click', async ()=>{
    const name = (document.getElementById('contact-name').value||'').trim();
    const email = (document.getElementById('contact-email').value||'').trim();
    if(!name) return alert('Enter a name');
    await api('/api/crm/contacts', { method:'POST', body: JSON.stringify({ full_name: name, email }) });
    document.getElementById('contact-name').value=''; document.getElementById('contact-email').value='';
    await loadContacts();
  });

  document.getElementById('add-task').addEventListener('click', async ()=>{
    const title = (document.getElementById('task-title').value||'').trim();
    const due = document.getElementById('task-due').value || null;
    if(!title) return alert('Enter a task');
    await api('/api/crm/tasks', { method:'POST', body: JSON.stringify({ title, due_at: due }) });
    document.getElementById('task-title').value=''; document.getElementById('task-due').value='';
    await loadTasks();
  });
});

// Saved filters in localStorage
function getFilters(){
  const f = JSON.parse(localStorage.getItem('crm_filters')||'{}');
  return {
    stage: document.getElementById('filters-stage').value || f.stage || '',
    source: document.getElementById('filters-source').value || f.source || '',
    from: document.getElementById('filters-from').value || f.from || '',
    to: document.getElementById('filters-to').value || f.to || ''
  };
}
function saveFilters(){
  const f = {
    stage: document.getElementById('filters-stage').value || '',
    source: document.getElementById('filters-source').value || '',
    from: document.getElementById('filters-from').value || '',
    to: document.getElementById('filters-to').value || ''
  };
  localStorage.setItem('crm_filters', JSON.stringify(f));
  alert('Filters saved');
}

// Drag & Drop handlers
function enableDnD(){
  document.querySelectorAll('.deal').forEach(el => {
    el.setAttribute('draggable','true');
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', el.querySelector('button.del').dataset.id);
    });
  });
  document.querySelectorAll('.col .list').forEach(list => {
    list.addEventListener('dragover', e => { e.preventDefault(); list.style.background='#f1f5ff'; });
    list.addEventListener('dragleave', () => { list.style.background=''; });
    list.addEventListener('drop', async e => {
      e.preventDefault(); list.style.background='';
      const id = e.dataTransfer.getData('text/plain');
      const stage = list.closest('.col').dataset.stage;
      await api('/api/crm/deals/'+id, { method:'PUT', body: JSON.stringify({ stage }) });
      await loadDeals();
    });
  });
}

async function loadAnalytics(){
  try {
    const a = await api('/api/crm/analytics/summary');
    // Quick inline analytics rendering at top of board
    let bar = document.getElementById('crm-analytics');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'crm-analytics';
      bar.style.margin = '12px 0';
      bar.style.padding = '10px';
      bar.style.border = '1px solid #eee';
      bar.style.borderRadius = '10px';
      document.querySelector('.shell').insertBefore(bar, document.getElementById('board'));
    }
    const sources = (a.sources||[]).map(s => `${s.source}: ${s.count} (won ${s.won})`).join(' • ');
    const stages = Object.entries(a.stage_hours_avg||{}).map(([k,v])=>`${k}: ${v.toFixed(1)}h`).join(' • ');
    bar.innerHTML = \`<strong>Analytics</strong> — Win rate: \${(a.win_rate*100).toFixed(1)}% • Total: \${a.total_deals} • Stage avg: \${stages || 'n/a'} • Sources: \${sources || 'n/a'}\`;
  } catch(e){ console.warn('Analytics failed', e.message); }
}

function openDrawerForDeal(d){
  const drawer = document.getElementById('drawer');
  const body = document.getElementById('drawer-body');
  const title = document.getElementById('drawer-title');
  title.textContent = d.title;
  body.innerHTML = \`
    <div style="display:flex;gap:8px;align-items:center;">
      <div><strong>Stage:</strong> \${d.stage}</div>
      <div><strong>Amount:</strong> € \${(d.amount_cents/100).toFixed(2)}</div>
    </div>
    <div style="margin-top:10px;"><strong>Link contact</strong>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <input id="link-contact-id" type="number" placeholder="Contact ID" />
        <button id="btn-link-contact">Link</button>
      </div>
    </div>
    <div style="margin-top:10px;"><strong>Notes</strong>
      <div style="display:flex;gap:6px;margin-top:6px;">
        <input id="note-text" placeholder="Add a note"/><button id="btn-add-note">Add</button>
      </div>
      <div id="notes-list" class="muted" style="margin-top:6px;">Loading…</div>
    </div>
  \`;
  drawer.style.display = 'flex';

  document.getElementById('drawer-close').onclick = () => { drawer.style.display='none'; };

  document.getElementById('btn-link-contact').onclick = async () => {
    const cid = Number(document.getElementById('link-contact-id').value);
    if (!cid) return alert('Enter Contact ID');
    await api('/api/crm/deals/'+d.id, { method:'PUT', body: JSON.stringify({ contact_id: cid }) });
    alert('Linked'); drawer.style.display='none'; await loadDeals();
  };

  async function loadNotes(){
    const rows = await api('/api/crm/notes'); // crude: filter client-side
    const list = rows.filter(n => n.related_type==='deal' && n.related_id===d.id);
    const wrap = document.getElementById('notes-list');
    wrap.innerHTML = list.length ? list.map(n=>'- '+n.body).join('<br/>') : 'No notes yet.';
  }
  document.getElementById('btn-add-note').onclick = async ()=>{
    const text = document.getElementById('note-text').value.trim();
    if(!text) return;
    await api('/api/crm/notes', { method:'POST', body: JSON.stringify({ body:text, related_type:'deal', related_id:d.id }) });
    document.getElementById('note-text').value='';
    await loadNotes();
  };
  loadNotes();
}

document.getElementById('btn-save-filters').addEventListener('click', saveFilters);
document.getElementById('btn-apply-filters').addEventListener('click', ()=>{ saveFilters(); loadDeals(); loadAnalytics(); });
document.getElementById('btn-reminders').addEventListener('click', async ()=>{
  try {
    const r = await api('/api/crm/tasks/send-reminders', { method:'POST' });
    alert('Reminder email sent for '+r.tasks+' tasks');
  } catch(e){ alert('Failed: '+e.message); }
});
