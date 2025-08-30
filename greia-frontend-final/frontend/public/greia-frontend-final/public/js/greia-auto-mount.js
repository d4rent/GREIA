// Minimal auto-mount to inject shared header include onto the page
(function(){
  async function mountHeader(){
    try{
      const res = await fetch('/public/includes/header.html', {cache:'no-cache'});
      if(!res.ok) return;
      const html = await res.text();
      const container = document.createElement('div');
      container.innerHTML = html;
      const header = container.firstElementChild;
      if(!header) return;
      document.body.prepend(header);
    }catch(e){ console.warn('header auto-mount failed', e); }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', mountHeader);
  }else{
    mountHeader();
  }
})();