// Auth utilities for handling Google OAuth and traditional authentication
(function() {
  'use strict';

  // Auth state management
  window.AuthUtils = {
    // Get current token
    getToken: function() {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    },

    // Set token
    setToken: function(token, persistent = true) {
      if (persistent) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token'); // Clear session storage
      } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token'); // Clear local storage
      }
      
      // Dispatch custom event for auth state change
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { authenticated: true, token: token }
      }));
    },

    // Remove token (logout)
    removeToken: function() {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      // Dispatch custom event for auth state change
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { authenticated: false, token: null }
      }));
    },

    // Check if user is authenticated
    isAuthenticated: function() {
      const token = this.getToken();
      return !!token;
    },

    // Get user info from token (basic JWT parsing - for display purposes only)
    getUserInfo: function() {
      const token = this.getToken();
      if (!token) return null;

      try {
        // Basic JWT decode (not for security verification)
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        return decoded;
      } catch (e) {
        console.warn('Could not decode token:', e);
        return null;
      }
    },

    // Initiate Google OAuth
    initiateGoogleAuth: function(mode = 'login') {
      if (typeof API_BASE_URL === 'undefined') {
        console.error('API_BASE_URL not defined');
        alert('Configuration error. Please try again.');
        return;
      }

      // Redirect to backend Google OAuth endpoint (not S3/static)
      const authUrl = `${API_BASE_URL}/api/auth/google?mode=${mode}`;
      window.location.href = authUrl;
    },

    // Handle OAuth callback
    handleOAuthCallback: function() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      
      if (error) {
        console.error('OAuth error:', error);
        return { success: false, error: error };
      }
      
      if (token) {
        this.setToken(token);
        // Clean URL
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        return { success: true, token: token };
      }
      
      return { success: false, error: 'No token received' };
    },

    // Update navigation based on auth state
    updateNavigation: function() {
      const isLoggedIn = this.isAuthenticated();
      
      // Desktop navigation
      const authMenu = document.getElementById('auth-menu');
      const loginBtn = document.getElementById('login-btn');
      const loginDropdown = document.getElementById('login-dropdown');
      
      // Mobile navigation
      const mobileAuthMenu = document.getElementById('mobile-auth-menu');
      const mobileLoginBtn = document.getElementById('mobile-login-btn');
      const mobileLoginDropdown = document.getElementById('mobile-login-dropdown');

      if (isLoggedIn) {
        // Update desktop nav
        if (authMenu && loginBtn) {
          authMenu.classList.remove('dropdown');
          loginBtn.textContent = 'myGREIA';
          loginBtn.href = '/pages/profile.html';
          if (loginDropdown) {
            loginDropdown.style.display = 'none';
          }
        }
        
        // Update mobile nav
        if (mobileAuthMenu && mobileLoginBtn) {
          mobileAuthMenu.classList.remove('dropdown');
          mobileLoginBtn.textContent = 'myGREIA';
          mobileLoginBtn.href = '/pages/profile.html';
          if (mobileLoginDropdown) {
            mobileLoginDropdown.style.display = 'none';
          }
        }
      } else {
        // Update desktop nav
        if (authMenu && loginBtn) {
          authMenu.classList.add('dropdown');
          loginBtn.textContent = 'Log In';
          loginBtn.href = '/pages/login.html';
          if (loginDropdown) {
            loginDropdown.style.display = '';
          }
        }
        
        // Update mobile nav
        if (mobileAuthMenu && mobileLoginBtn) {
          mobileAuthMenu.classList.add('dropdown');
          mobileLoginBtn.textContent = 'Log In';
          mobileLoginBtn.href = '/pages/login.html';
          if (mobileLoginDropdown) {
            mobileLoginDropdown.style.display = '';
          }
        }
      }
    },

    // Initialize auth utilities
    init: function() {
      // Update navigation on page load
      document.addEventListener('DOMContentLoaded', () => {
        this.updateNavigation();
      });

      // Listen for auth state changes
      window.addEventListener('authStateChanged', () => {
        this.updateNavigation();
      });

      // Listen for storage changes (when user logs in/out on another tab)
      window.addEventListener('storage', (e) => {
        if (e.key === 'token') {
          this.updateNavigation();
        }
      });
    }
  };

  // Initialize auth utilities
  window.AuthUtils.init();

  // Legacy compatibility - keep existing functions working
  window.isUserLoggedIn = function() {
    return window.AuthUtils.isAuthenticated();
  };

})();
