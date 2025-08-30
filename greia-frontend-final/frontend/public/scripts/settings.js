const API = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
function authHeaders(){ const t = localStorage.getItem('token')||sessionStorage.getItem('token'); return t?{'Authorization': 'Bearer '+t}:{ }; }
async function api(path, opts={}){ const res = await fetch((API?API:'')+path, {...opts, headers:{'Content-Type':'application/json', ...authHeaders(), ...(opts.headers||{})}}); if(!res.ok){ throw new Error(await res.text()); } return res.json(); }
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('btn-export'); const out = document.getElementById('export-result');
  btn.addEventListener('click', async ()=>{
    btn.disabled = true; out.textContent = 'Preparing your export…';
    try { const r = await api('/api/me/export', { method:'POST', body: JSON.stringify({}) }); out.innerHTML = 'Ready: <a target="_blank" href="'+r.url+'">Download ZIP</a>'; }
    catch(e){ out.textContent = 'Export failed: ' + e.message; }
    btn.disabled = false;
  });
});