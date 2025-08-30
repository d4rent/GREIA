// Global Search Functionality
class GlobalSearch {
    constructor() {
        this.currentTab = 'buy';
        this.apiBaseUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000' 
            : 'https://your-backend-url.com'; // Replace with your actual backend URL
        
        this.init();
    }

    init() {
        // Initialize tab switching
        this.setupTabSwitching();
        
        // Initialize search form
        this.setupSearchForm();
        
        // Set default tab
        this.setActiveTab('buy');
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = button.getAttribute('data-tab');
                this.setActiveTab(tab);
            });
        });
    }

    setActiveTab(tab) {
        this.currentTab = tab;
        
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
        
        // Update placeholder text
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const placeholders = {
                'buy': 'Search properties to buy...',
                'rent': 'Search rental properties...',
                'commercial': 'Search commercial properties...',
                'services': 'Search our services...',
                'concierge': 'Search concierge services...'
            };
            searchInput.placeholder = placeholders[tab] || 'Enter an address, city, or Eircode';
        }
    }

    setupSearchForm() {
        const searchForm = document.getElementById('searchForm');
        const searchInput = document.getElementById('searchInput');
        
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }

        if (searchInput) {
            // Add autocomplete functionality
            searchInput.addEventListener('input', (e) => {
                this.handleAutocomplete(e.target.value);
            });
        }
    }

    async handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput?.value?.trim();
        
        if (!query) {
            alert('Please enter a search term');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            const results = await this.performSearch(query, this.currentTab);
            this.redirectToResults(query, this.currentTab, results);
        } catch (error) {
            console.error('Search error:', error);
            alert('Search failed. Please try again.');
        } finally {
            this.setLoadingState(false);
        }
    }

    async performSearch(query, tab) {
        const searchParams = new URLSearchParams({
            q: query,
            type: tab,
            limit: 20
        });

        let endpoint = '';
        switch (tab) {
            case 'buy':
            case 'rent':
            case 'commercial':
                endpoint = '/api/properties/search';
                searchParams.append('status', tab);
                break;
            case 'services':
                endpoint = '/api/services/search';
                break;
            case 'concierge':
                endpoint = '/api/concierge/search';
                break;
            default:
                endpoint = '/api/properties/search';
        }

        const response = await fetch(`${this.apiBaseUrl}${endpoint}?${searchParams}`);
        
        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        return await response.json();
    }

    redirectToResults(query, tab, results) {
        // Store search results in sessionStorage for the results page
        sessionStorage.setItem('searchResults', JSON.stringify({
            query,
            tab,
            results,
            timestamp: Date.now()
        }));

        // Redirect based on search type
        const redirectUrls = {
            'buy': 'pages/buy.html',
            'rent': 'pages/rent.html',
            'commercial': 'pages/commercial.html',
            'services': 'pages/services.html',
            'concierge': 'pages/concierge.html'
        };

        const url = redirectUrls[tab] || 'pages/search-results.html';
        const searchParams = new URLSearchParams({
            q: query,
            type: tab
        });

        window.location.href = `${url}?${searchParams}`;
    }

    async handleAutocomplete(query) {
        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/search/autocomplete?q=${encodeURIComponent(query)}&type=${this.currentTab}`);
            
            if (response.ok) {
                const suggestions = await response.json();
                this.showAutocomplete(suggestions);
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
            this.hideAutocomplete();
        }
    }

    showAutocomplete(suggestions) {
        let autocompleteContainer = document.getElementById('autocomplete-container');
        
        if (!autocompleteContainer) {
            autocompleteContainer = document.createElement('div');
            autocompleteContainer.id = 'autocomplete-container';
            autocompleteContainer.className = 'autocomplete-dropdown';
            
            const searchContainer = document.querySelector('.search-bar-container');
            if (searchContainer) {
                searchContainer.appendChild(autocompleteContainer);
            }
        }

        if (suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }

        autocompleteContainer.innerHTML = suggestions.map(suggestion => `
            <div class="autocomplete-item" data-value="${suggestion.value}">
                <div class="suggestion-text">${suggestion.display}</div>
                <div class="suggestion-type">${suggestion.type}</div>
            </div>
        `).join('');

        autocompleteContainer.style.display = 'block';

        // Add click handlers for autocomplete items
        autocompleteContainer.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const value = item.getAttribute('data-value');
                document.getElementById('searchInput').value = value;
                this.hideAutocomplete();
                this.handleSearch();
            });
        });
    }

    hideAutocomplete() {
        const autocompleteContainer = document.getElementById('autocomplete-container');
        if (autocompleteContainer) {
            autocompleteContainer.style.display = 'none';
        }
    }

    setLoadingState(loading) {
        const searchButton = document.querySelector('.search-button');
        const searchInput = document.getElementById('searchInput');
        
        if (searchButton) {
            searchButton.textContent = loading ? 'Searching...' : 'Search';
            searchButton.disabled = loading;
        }
        
        if (searchInput) {
            searchInput.disabled = loading;
        }
    }
}

// Initialize global search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('searchForm')) {
        new GlobalSearch();
    }
});

// Export for use in other files
window.GlobalSearch = GlobalSearch;
