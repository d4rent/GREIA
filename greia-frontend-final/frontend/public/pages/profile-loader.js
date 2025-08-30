
// profile-loader.js
const sectionMap = {
  'nav-properties': 'profile-properties.html',
  'nav-ads': 'profile-ads.html',
  'nav-services': 'profile-services.html',
  'nav-saved': 'profile-saved.html',
  'nav-settings': 'profile-settings.html'
};

function setActiveNav(navId) {
  document.querySelectorAll('.sidebar-nav button').forEach(btn => {
    btn.classList.remove('active');
  });
  const btn = document.getElementById(navId);
  if (btn) btn.classList.add('active');
}

async function loadProfileSection(url) {
  const container = document.getElementById('profile-section-container');
  if (container) {
    try {
      const res = await fetch(url);
      container.innerHTML = await res.text();
    } catch (err) {
      container.innerHTML = '<div style="color:#c00;padding:24px;">Failed to load section.</div>';
    }
  }
}

function handleNavClick(e) {
  const navId = e.target.id;
  if (sectionMap[navId]) {
    setActiveNav(navId);
    loadProfileSection(sectionMap[navId]);
  } else if (navId === 'nav-logout') {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      window.location.href = '/pages/login.html';
    }
  } else if (navId === 'nav-admin-dashboard') {
    window.location.href = '/pages/admin-dashboard.html';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Attach click listeners to sidebar nav buttons
  document.querySelectorAll('.sidebar-nav button').forEach(btn => {
    btn.addEventListener('click', handleNavClick);
  });
  // Load default section
  setActiveNav('nav-properties');
  loadProfileSection('profile-properties.html');
});
