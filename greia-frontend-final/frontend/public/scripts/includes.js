// Minimal HTML include helper
(function(){
  async function include(el){
    const src = el.getAttribute('data-include');
    if(!src) return;
    try{
      const res = await fetch(src, {cache:'no-cache'});
      if(!res.ok) throw new Error(res.status+' '+res.statusText);
      const html = await res.text();
      el.outerHTML = html;
    }catch(e){ console.error('include failed', src, e); }
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('[data-include]').forEach(include);
  });
})();