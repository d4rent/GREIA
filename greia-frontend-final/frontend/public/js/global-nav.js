/**
 * Global Navigation JavaScript
 * Handles navigation functionality across all pages
 */

class GlobalNavigation {
  constructor() {
    this.init();
  }

  init() {
    this.setupMobileMenu();
    this.setupDropdowns();
    this.setupGlobalSearch();
    this.setupScrollEffects();
    this.updateActiveNavItem();
  }

  // Mobile Menu Functionality
  setupMobileMenu() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const dropdownToggles = document.querySelectorAll('.mobile-nav .dropdown-toggle');

    if (!hamburgerMenu || !mobileNav || !mobileNavOverlay) return;

    // Toggle mobile menu
    const toggleMobileMenu = () => {
      hamburgerMenu.classList.toggle('active');
      mobileNav.classList.toggle('open');
      mobileNavOverlay.classList.toggle('show');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    };

    // Close mobile menu
    const closeMobileMenu = () => {
      hamburgerMenu.classList.remove('active');
      mobileNav.classList.remove('open');
      mobileNavOverlay.classList.remove('show');
      document.body.style.overflow = '';
      
      // Close all dropdowns
      document.querySelectorAll('.mobile-nav .dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
      });
    };

    // Event listeners
    hamburgerMenu.addEventListener('click', toggleMobileMenu);
    mobileNavOverlay.addEventListener('click', closeMobileMenu);

    // Dropdown functionality
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const dropdown = toggle.parentElement;
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.mobile-nav .dropdown').forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('open');
          }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('open', !isOpen);
      });
    });

    // Close menu when clicking on non-dropdown links
    document.querySelectorAll('.mobile-nav a:not(.dropdown-toggle)').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Close menu on window resize if open
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && mobileNav.classList.contains('open')) {
        closeMobileMenu();
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        closeMobileMenu();
      }
    });
  }

  // Desktop Dropdown Functionality
  setupDropdowns() {
    const dropdowns = document.querySelectorAll('.navbar .dropdown, .navbar .nested-dropdown');
    
    dropdowns.forEach(dropdown => {
      let timeoutId;

      const showDropdown = () => {
        clearTimeout(timeoutId);
        const menu = dropdown.querySelector(':scope > .dropdown-menu');
        if (menu) {
          menu.style.opacity = '1';
          menu.style.visibility = 'visible';
          menu.style.transform = 'translateY(0)';
        }
      };

      const hideDropdown = () => {
        timeoutId = setTimeout(() => {
          const menu = dropdown.querySelector(':scope > .dropdown-menu');
          if (menu) {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
            menu.style.transform = 'translateY(-10px)';
          }
        }, 200);
      };

      dropdown.addEventListener('mouseenter', showDropdown);
      dropdown.addEventListener('mouseleave', hideDropdown);

      // Keyboard accessibility
      const link = dropdown.querySelector(':scope > a');
      if (link) {
        link.addEventListener('focus', showDropdown);
        link.addEventListener('blur', hideDropdown);
        link.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            showDropdown();
            const firstMenuItem = dropdown.querySelector('.dropdown-menu a');
            if (firstMenuItem) firstMenuItem.focus();
          }
        });
      }

      // Handle dropdown menu item navigation
      const menuItems = dropdown.querySelectorAll('.dropdown-menu a');
      menuItems.forEach((item, index) => {
        item.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextItem = menuItems[index + 1];
            if (nextItem) nextItem.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevItem = menuItems[index - 1];
            if (prevItem) {
              prevItem.focus();
            } else {
              link.focus();
            }
          } else if (e.key === 'Escape') {
            hideDropdown();
            link.focus();
          }
        });
      });
    });
  }

  // Global Search Functionality
  setupGlobalSearch() {
    const searchForms = document.querySelectorAll('.global-search-form, .search-form');
    
    searchForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGlobalSearch(form);
      });
    });

    // Auto-complete functionality
    const searchInputs = document.querySelectorAll('.global-search-input, .search-input');
    searchInputs.forEach(input => {
      this.setupSearchAutocomplete(input);
    });
  }

  handleGlobalSearch(form) {
    const formData = new FormData(form);
    const query = formData.get('query') || formData.get('search');
    const activeTab = document.querySelector('.tab-btn.active');
    const searchType = activeTab ? activeTab.dataset.tab : 'buy';

    if (!query || query.trim() === '') {
      this.showSearchMessage('Please enter a search term', 'error');
      return;
    }

    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.innerHTML = '<span class="loading"></span> Searching...';
    submitButton.disabled = true;

    // Determine redirect URL based on search type
    let redirectUrl = '';
    switch (searchType) {
      case 'rent':
        redirectUrl = `/pages/rent.html?q=${encodeURIComponent(query)}`;
        break;
      case 'commercial':
        redirectUrl = `/pages/commercial.html?q=${encodeURIComponent(query)}`;
        break;
      case 'services':
        redirectUrl = `/pages/services.html?q=${encodeURIComponent(query)}`;
        break;
      case 'concierge':
        redirectUrl = `/pages/concierge.html?q=${encodeURIComponent(query)}`;
        break;
      default:
        redirectUrl = `/pages/buy.html?q=${encodeURIComponent(query)}`;
    }

    // Store search in localStorage for persistence
    localStorage.setItem('lastSearch', JSON.stringify({
      query: query,
      type: searchType,
      timestamp: Date.now()
    }));

    // Redirect to search results
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 500);
  }

  setupSearchAutocomplete(input) {
    let timeoutId;
    
    input.addEventListener('input', (e) => {
      clearTimeout(timeoutId);
      const query = e.target.value.trim();
      
      if (query.length < 2) return;
      
      timeoutId = setTimeout(() => {
        this.fetchSearchSuggestions(query, input);
      }, 300);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target)) {
        this.hideSuggestions(input);
      }
    });
  }

  async fetchSearchSuggestions(query, input) {
    try {
      const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const suggestions = await response.json();
        this.displaySuggestions(suggestions, input);
      }
    } catch (error) {
      console.log('Search suggestions not available');
    }
  }

  displaySuggestions(suggestions, input) {
    // Remove existing suggestions
    this.hideSuggestions(input);
    
    if (!suggestions || suggestions.length === 0) return;

    const suggestionContainer = document.createElement('div');
    suggestionContainer.className = 'search-suggestions';
    suggestionContainer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid var(--border-light);
      border-top: none;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 4px 8px var(--shadow-light);
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
    `;

    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.style.cssText = `
        padding: 10px 15px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-light);
        transition: background 0.2s ease;
      `;
      item.textContent = suggestion.text || suggestion;
      
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--bg-secondary)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        input.value = suggestion.text || suggestion;
        this.hideSuggestions(input);
        input.focus();
      });
      
      suggestionContainer.appendChild(item);
    });

    // Position relative to input
    const container = input.closest('.search-bar-container, .global-search-container') || input.parentElement;
    container.style.position = 'relative';
    container.appendChild(suggestionContainer);
  }

  hideSuggestions(input) {
    const container = input.closest('.search-bar-container, .global-search-container') || input.parentElement;
    const suggestions = container.querySelector('.search-suggestions');
    if (suggestions) {
      suggestions.remove();
    }
  }

  // Scroll Effects
  setupScrollEffects() {
    let lastScrollTop = 0;
    const navbar = document.querySelector('.navbar');
    
    if (!navbar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Add/remove scrolled class for styling
      if (scrollTop > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
      
      // Hide/show navbar on scroll (optional)
      if (scrollTop > lastScrollTop && scrollTop > 100) {
        navbar.classList.add('nav-hidden');
      } else {
        navbar.classList.remove('nav-hidden');
      }
      
      lastScrollTop = scrollTop;
    });
  }

  // Update Active Navigation Item
  updateActiveNavItem() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav a');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      
      const linkPath = new URL(link.href).pathname;
      if (linkPath === currentPath || 
          (currentPath.includes('/pages/') && linkPath.includes(currentPath.split('/').pop()))) {
        link.classList.add('active');
      }
    });
  }

  // Search Tab Functionality
  setupSearchTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked tab
        button.classList.add('active');
        
        // Update search placeholder if needed
        const searchInput = document.querySelector('.search-input, .global-search-input');
        if (searchInput) {
          const placeholders = {
            buy: 'Search properties to buy...',
            rent: 'Search rental properties...',
            commercial: 'Search commercial properties...',
            services: 'Search our services...',
            concierge: 'How can we help you today?'
          };
          
          searchInput.placeholder = placeholders[button.dataset.tab] || 'Enter search term...';
        }
      });
    });
  }

  // Utility Methods
  showSearchMessage(message, type = 'info') {
    // Create or update message element
    let messageElement = document.querySelector('.search-message');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'search-message';
      messageElement.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        padding: 15px 25px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.style.background = type === 'error' ? '#e74c3c' : '#2ecc71';
    messageElement.style.opacity = '1';
    
    setTimeout(() => {
      messageElement.style.opacity = '0';
      setTimeout(() => {
        if (messageElement.parentElement) {
          messageElement.remove();
        }
      }, 300);
    }, 3000);
  }

  // Get current search from URL
  getCurrentSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      query: urlParams.get('q') || '',
      type: urlParams.get('type') || 'buy',
      page: parseInt(urlParams.get('page')) || 1
    };
  }

  // Update URL with search parameters
  updateURL(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
      if (params[key]) {
        url.searchParams.set(key, params[key]);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.pushState({}, '', url);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const globalNav = new GlobalNavigation();
  
  // Make it globally accessible
  window.GlobalNavigation = globalNav;
  
  // Setup search tabs if they exist
  globalNav.setupSearchTabs();
  
  // Auto-populate search from URL parameters
  const currentSearch = globalNav.getCurrentSearch();
  if (currentSearch.query) {
    const searchInputs = document.querySelectorAll('.search-input, .global-search-input');
    searchInputs.forEach(input => {
      input.value = currentSearch.query;
    });
    
    // Set active tab
    const tabButton = document.querySelector(`[data-tab="${currentSearch.type}"]`);
    if (tabButton) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      tabButton.classList.add('active');
    }
  }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalNavigation;
}
