/**
 * Global Search System
 * Handles search functionality across all pages with consistent behavior
 */

class GlobalSearch {
  constructor() {
    this.searchEndpoint = '/api/search';
    this.suggestionsEndpoint = '/api/search-suggestions';
    this.init();
  }

  init() {
    this.setupSearchForms();
    this.setupSearchTabs();
    this.setupAutocomplete();
    this.setupSearchHistory();
    this.loadPreviousSearch();
  }

  // Setup all search forms on the page
  setupSearchForms() {
    const searchForms = document.querySelectorAll('.search-form, .global-search-form');
    
    searchForms.forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearch(form);
      });

      // Enter key handling
      const input = form.querySelector('input[name="query"], input[name="search"]');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this.handleSearch(form);
          }
        });
      }
    });
  }

  // Setup search tabs (Buy, Rent, Commercial, etc.)
  setupSearchTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.setActiveTab(button);
        this.updateSearchPlaceholder(button.dataset.tab);
      });
    });
  }

  setActiveTab(activeButton) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked tab
    activeButton.classList.add('active');
  }

  updateSearchPlaceholder(tabType) {
    const placeholders = {
      buy: 'Search properties to buy - location, price, type...',
      rent: 'Search rental properties - area, budget, bedrooms...',
      commercial: 'Search commercial properties - office, retail, industrial...',
      services: 'Search our services - valuations, management, legal...',
      concierge: 'What can our concierge help you with today?'
    };

    const searchInputs = document.querySelectorAll('.search-input, .global-search-input');
    searchInputs.forEach(input => {
      input.placeholder = placeholders[tabType] || 'Enter search term...';
    });
  }

  // Handle search submission
  async handleSearch(form) {
    const formData = new FormData(form);
    const query = (formData.get('query') || formData.get('search') || '').trim();
    
    if (!query) {
      this.showMessage('Please enter a search term', 'error');
      return;
    }

    const activeTab = document.querySelector('.tab-btn.active');
    const searchType = activeTab ? activeTab.dataset.tab : 'buy';
    
    // Show loading state
    this.setLoadingState(form, true);
    
    try {
      // Save search to history
      this.saveSearchHistory(query, searchType);
      
      // Perform search based on current page or redirect
      if (this.isSearchResultsPage()) {
        await this.performInPageSearch(query, searchType);
      } else {
        this.redirectToSearchResults(query, searchType);
      }
      
    } catch (error) {
      console.error('Search error:', error);
      this.showMessage('Search failed. Please try again.', 'error');
    } finally {
      this.setLoadingState(form, false);
    }
  }

  // Check if we're on a search results page
  isSearchResultsPage() {
    const searchPages = ['/pages/buy.html', '/pages/rent.html', '/pages/commercial.html', '/pages/services.html'];
    return searchPages.some(page => window.location.pathname.includes(page));
  }

  // Perform search on current page (for search result pages)
  async performInPageSearch(query, searchType) {
    try {
      const response = await fetch(`${this.searchEndpoint}?q=${encodeURIComponent(query)}&type=${searchType}&page=1`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const results = await response.json();
      
      // Update URL without page reload
      this.updateURL({ q: query, type: searchType, page: 1 });
      
      // Display results
      this.displaySearchResults(results, query, searchType);
      
      // Update page title
      document.title = `${query} - ${this.getPageTitle(searchType)} | D4Rent`;
      
    } catch (error) {
      console.error('Search error:', error);
      this.showMessage('Search failed. Please try again.', 'error');
    }
  }

  // Redirect to appropriate search results page
  redirectToSearchResults(query, searchType) {
    const redirectUrls = {
      buy: `/pages/buy.html?q=${encodeURIComponent(query)}`,
      rent: `/pages/rent.html?q=${encodeURIComponent(query)}`,
      commercial: `/pages/commercial.html?q=${encodeURIComponent(query)}`,
      services: `/pages/services.html?q=${encodeURIComponent(query)}`,
      concierge: `/pages/concierge.html?q=${encodeURIComponent(query)}`
    };
    
    const url = redirectUrls[searchType] || redirectUrls.buy;
    window.location.href = url;
  }

  // Display search results on page
  displaySearchResults(results, query, searchType) {
    const resultsContainer = document.querySelector('#search-results, .search-results, .properties-grid');
    
    if (!resultsContainer) {
      console.warn('No results container found');
      return;
    }

    // Update search stats
    this.updateSearchStats(results.total || results.length || 0, query);
    
    // Clear existing results
    resultsContainer.innerHTML = '';
    
    if (!results.properties && !results.services && !results.length) {
      this.displayNoResults(resultsContainer, query);
      return;
    }

    // Display results based on type
    const items = results.properties || results.services || results;
    
    if (searchType === 'services') {
      this.displayServiceResults(resultsContainer, items);
    } else {
      this.displayPropertyResults(resultsContainer, items);
    }

    // Setup pagination if needed
    if (results.totalPages > 1) {
      this.setupPagination(results.currentPage, results.totalPages, query, searchType);
    }
  }

  displayPropertyResults(container, properties) {
    properties.forEach(property => {
      const propertyCard = this.createPropertyCard(property);
      container.appendChild(propertyCard);
    });
  }

  displayServiceResults(container, services) {
    services.forEach(service => {
      const serviceCard = this.createServiceCard(service);
      container.appendChild(serviceCard);
    });
  }

  createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
      <div class="property-image">
        <img src="${property.image || '/assets/default-property.jpg'}" alt="${property.title || 'Property'}" loading="lazy">
        <div class="property-status">${property.status || 'Available'}</div>
      </div>
      <div class="property-details">
        <h3 class="property-title">${property.title || 'Property Title'}</h3>
        <p class="property-address">${property.address || 'Address not available'}</p>
        <div class="property-price">${property.price ? '€' + property.price.toLocaleString() : 'Price on request'}</div>
        <div class="property-features">
          ${property.beds ? `<span>${property.beds} bed${property.beds > 1 ? 's' : ''}</span>` : ''}
          ${property.baths ? `<span>${property.baths} bath${property.baths > 1 ? 's' : ''}</span>` : ''}
          ${property.property_size ? `<span>${property.property_size}</span>` : ''}
        </div>
        <div class="property-type">${property.property_type || 'Property'}</div>
        <div class="property-actions">
          <button class="btn btn-primary" onclick="window.location.href='/pages/property-details.html?id=${property.id}'">View Details</button>
          <button class="btn btn-outline" onclick="GlobalSearch.addToFavorites(${property.id})">♡ Save</button>
        </div>
      </div>
    `;
    return card;
  }

  createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-icon">${service.icon || '🏠'}</div>
      <h3 class="service-title">${service.title || 'Service'}</h3>
      <p class="service-description">${service.description || 'Service description not available'}</p>
      <div class="service-actions">
        <button class="btn btn-primary" onclick="window.location.href='${service.link || '#'}'">Learn More</button>
        <button class="btn btn-outline" onclick="window.location.href='/pages/contact.html?service=${service.id}'">Get Quote</button>
      </div>
    `;
    return card;
  }

  displayNoResults(container, query) {
    container.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <h3>No results found for "${query}"</h3>
        <p>Try adjusting your search criteria or browse our featured properties.</p>
        <div class="search-suggestions">
          <button class="btn btn-secondary" onclick="GlobalSearch.clearSearch()">Clear Search</button>
          <button class="btn btn-primary" onclick="window.location.href='/pages/buy.html'">Browse All Properties</button>
        </div>
      </div>
    `;
  }

  // Autocomplete functionality
  setupAutocomplete() {
    const searchInputs = document.querySelectorAll('.search-input, .global-search-input');
    
    searchInputs.forEach(input => {
      let timeoutId;
      
      input.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          this.hideSuggestions(input);
          return;
        }
        
        timeoutId = setTimeout(() => {
          this.fetchSuggestions(query, input);
        }, 300);
      });

      // Hide suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!input.closest('.search-container, .search-bar-container').contains(e.target)) {
          this.hideSuggestions(input);
        }
      });

      // Keyboard navigation for suggestions
      input.addEventListener('keydown', (e) => {
        this.handleSuggestionNavigation(e, input);
      });
    });
  }

  async fetchSuggestions(query, input) {
    try {
      const response = await fetch(`${this.suggestionsEndpoint}?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const suggestions = await response.json();
        this.displaySuggestions(suggestions, input);
      }
    } catch (error) {
      console.log('Suggestions not available');
    }
  }

  displaySuggestions(suggestions, input) {
    this.hideSuggestions(input);
    
    if (!suggestions || suggestions.length === 0) return;

    const container = input.closest('.search-container, .search-bar-container, .global-search-container') || input.parentElement;
    
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'search-suggestions-list';
    suggestionsList.innerHTML = suggestions.map((suggestion, index) => `
      <div class="suggestion-item" data-index="${index}" data-value="${suggestion.text || suggestion}">
        <span class="suggestion-text">${suggestion.text || suggestion}</span>
        ${suggestion.type ? `<span class="suggestion-type">${suggestion.type}</span>` : ''}
      </div>
    `).join('');

    // Add click handlers
    suggestionsList.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (item) {
        input.value = item.dataset.value;
        this.hideSuggestions(input);
        input.focus();
      }
    });

    container.appendChild(suggestionsList);
  }

  hideSuggestions(input) {
    const container = input.closest('.search-container, .search-bar-container, .global-search-container') || input.parentElement;
    const suggestions = container.querySelector('.search-suggestions-list');
    if (suggestions) {
      suggestions.remove();
    }
  }

  handleSuggestionNavigation(e, input) {
    const suggestions = input.closest('.search-container, .search-bar-container, .global-search-container')
      ?.querySelector('.search-suggestions-list');
    
    if (!suggestions) return;

    const items = suggestions.querySelectorAll('.suggestion-item');
    const currentActive = suggestions.querySelector('.suggestion-item.active');
    let activeIndex = currentActive ? parseInt(currentActive.dataset.index) : -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, items.length - 1);
        this.highlightSuggestion(items, activeIndex);
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, -1);
        this.highlightSuggestion(items, activeIndex);
        break;
      
      case 'Enter':
        if (currentActive) {
          e.preventDefault();
          input.value = currentActive.dataset.value;
          this.hideSuggestions(input);
        }
        break;
      
      case 'Escape':
        this.hideSuggestions(input);
        break;
    }
  }

  highlightSuggestion(items, activeIndex) {
    items.forEach((item, index) => {
      item.classList.toggle('active', index === activeIndex);
    });
  }

  // Search history functionality
  setupSearchHistory() {
    // Add search history dropdown to search inputs
    const searchInputs = document.querySelectorAll('.search-input, .global-search-input');
    
    searchInputs.forEach(input => {
      input.addEventListener('focus', () => {
        if (input.value.trim() === '') {
          this.showSearchHistory(input);
        }
      });
    });
  }

  saveSearchHistory(query, type) {
    let history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    
    // Remove duplicate
    history = history.filter(item => item.query !== query || item.type !== type);
    
    // Add to beginning
    history.unshift({
      query,
      type,
      timestamp: Date.now()
    });
    
    // Keep only last 10 searches
    history = history.slice(0, 10);
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }

  showSearchHistory(input) {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    
    if (history.length === 0) return;

    const recentSearches = history.slice(0, 5).map(item => ({
      text: item.query,
      type: 'Recent',
      isHistory: true
    }));

    this.displaySuggestions(recentSearches, input);
  }

  // Utility methods
  setLoadingState(form, isLoading) {
    const button = form.querySelector('button[type="submit"]');
    const input = form.querySelector('input');
    
    if (isLoading) {
      button.disabled = true;
      button.innerHTML = '<span class="loading"></span> Searching...';
      input.disabled = true;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText || 'Search';
      input.disabled = false;
    }
  }

  updateSearchStats(total, query) {
    const statsElement = document.querySelector('.search-stats');
    if (statsElement) {
      statsElement.textContent = `Found ${total.toLocaleString()} result${total !== 1 ? 's' : ''} for "${query}"`;
    }
  }

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

  loadPreviousSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const type = urlParams.get('type') || 'buy';
    
    if (query) {
      // Populate search inputs
      document.querySelectorAll('.search-input, .global-search-input').forEach(input => {
        input.value = query;
      });
      
      // Set active tab
      const tabButton = document.querySelector(`[data-tab="${type}"]`);
      if (tabButton) {
        this.setActiveTab(tabButton);
      }
      
      // If on search results page, perform search
      if (this.isSearchResultsPage()) {
        this.performInPageSearch(query, type);
      }
    }
  }

  getPageTitle(searchType) {
    const titles = {
      buy: 'Properties for Sale',
      rent: 'Properties for Rent',
      commercial: 'Commercial Properties',
      services: 'Our Services',
      concierge: 'Concierge Services'
    };
    return titles[searchType] || 'Search Results';
  }

  showMessage(message, type = 'info') {
    // Create or update message element
    let messageElement = document.querySelector('.search-message');
    if (!messageElement) {
      messageElement = document.createElement('div');
      messageElement.className = 'search-message';
      document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.className = `search-message ${type}`;
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

  // Public methods for external use
  static clearSearch() {
    const searchInputs = document.querySelectorAll('.search-input, .global-search-input');
    searchInputs.forEach(input => {
      input.value = '';
    });
    
    // Reset to default tab
    const defaultTab = document.querySelector('[data-tab="buy"]');
    if (defaultTab) {
      window.GlobalSearch.setActiveTab(defaultTab);
    }
    
    // Clear URL parameters
    window.GlobalSearch.updateURL({ q: '', type: '', page: '' });
  }

  static addToFavorites(propertyId) {
    // Add to favorites functionality
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    if (!favorites.includes(propertyId)) {
      favorites.push(propertyId);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      window.GlobalSearch.showMessage('Property added to favorites!', 'success');
    } else {
      window.GlobalSearch.showMessage('Property already in favorites', 'info');
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.GlobalSearch = new GlobalSearch();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobalSearch;
}
