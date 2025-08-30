// Profile Section Routing
document.addEventListener('DOMContentLoaded', function() {
    // Get section elements
    const sections = {
        profile: document.getElementById('section-profile'),
        edit: document.getElementById('section-edit'),
        properties: document.getElementById('section-properties'),
        services: document.getElementById('section-services'),
        ads: document.getElementById('section-ads'),
        saved: document.getElementById('section-saved'),
        analytics: document.getElementById('section-analytics'),
        exposure: document.getElementById('section-exposure'),
        settings: document.getElementById('section-settings')
    };

    // Get navigation links
    const navLinks = document.querySelectorAll('.nav-link');

    // Function to show section
    function showSection(sectionId) {
        // Hide all sections with animation
        Object.values(sections).forEach(section => {
            if (section) {
                section.classList.remove('active');
                section.classList.add('fade-out');
                setTimeout(() => {
                    if (!section.classList.contains('active')) {
                        section.style.display = 'none';
                    }
                }, 300);
            }
        });

        // Show selected section with animation
        const selectedSection = sections[sectionId];
        if (selectedSection) {
            selectedSection.style.display = 'block';
            // Trigger reflow to ensure animation plays
            selectedSection.offsetHeight;
            selectedSection.classList.remove('fade-out');
            selectedSection.classList.add('active', 'fade-in');
            
            // Load section content if needed
            switch(sectionId) {
                case 'properties':
                    loadProperties();
                    break;
                case 'services':
                    loadServices();
                    break;
                case 'ads':
                    loadAds();
                    break;
                case 'saved':
                    loadSaved();
                    break;
                case 'analytics':
                    loadAnalytics();
                    break;
            }
        }

        // Update active nav link
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });

        // Update URL
        history.pushState({ section: sectionId }, '', `#${sectionId}`);
    }

    // Add click handlers to nav links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.section) {
            showSection(e.state.section);
        }
    });

    // Initial section based on URL hash
    const initialSection = window.location.hash.substring(1) || 'properties';
    showSection(initialSection);
});

// Section-specific loading functions
function loadProperties() {
    const grid = document.getElementById('user-properties-grid');
    // Add your property loading logic here
}

function loadServices() {
    const grid = document.getElementById('user-services-grid');
    // Add your services loading logic here
}

function loadAds() {
    const grid = document.getElementById('user-advertisements-grid');
    // Add your ads loading logic here
}

function loadSaved() {
    const propertiesGrid = document.getElementById('saved-properties-grid');
    const agentsGrid = document.getElementById('saved-agents-grid');
    // Add your saved items loading logic here
}

function loadAnalytics() {
    // Add your analytics loading logic here
}

// Form handling functions
function showAddPropertyForm() {
    document.getElementById('add-property-form').style.display = 'block';
}

function hideAddPropertyForm() {
    document.getElementById('add-property-form').style.display = 'none';
}

function showAddServiceForm() {
    document.getElementById('add-service-form').style.display = 'block';
}

function hideAddServiceForm() {
    document.getElementById('add-service-form').style.display = 'none';
}

function showAddAdForm() {
    document.getElementById('add-ad-form').style.display = 'block';
}

function hideAddAdForm() {
    document.getElementById('add-ad-form').style.display = 'none';
}

// Search functions
function searchProperties() {
    const keyword = document.getElementById('property-search-keyword').value;
    const type = document.getElementById('property-search-type').value;
    const minPrice = document.getElementById('property-search-price-min').value;
    const maxPrice = document.getElementById('property-search-price-max').value;
    const featured = document.getElementById('property-search-featured').checked;
    
    // Add your property search logic here
}

function searchServices() {
    const keyword = document.getElementById('service-search-keyword').value;
    const category = document.getElementById('service-search-category').value;
    const minPrice = document.getElementById('service-search-price-min').value;
    const maxPrice = document.getElementById('service-search-price-max').value;
    const featured = document.getElementById('service-search-featured').checked;
    
    // Add your service search logic here
}

// Auto-save form fields
function setupAutoSave(formId, endpoint) {
    const form = document.getElementById(formId);
    if (!form) return;

    const inputs = form.querySelectorAll('input, select, textarea');
    let saveTimeout;

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // Clear existing timeout
            clearTimeout(saveTimeout);
            
            // Show saving indicator
            let indicator = input.parentElement.querySelector('.save-indicator');
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'save-indicator';
                input.parentElement.appendChild(indicator);
            }
            indicator.className = 'save-indicator saving';
            indicator.textContent = 'Saving...';
            
            // Set new timeout for saving
            saveTimeout = setTimeout(async () => {
                try {
                    const formData = new FormData(form);
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
                        },
                        body: formData
                    });
                    
                    if (!response.ok) throw new Error('Save failed');
                    
                    indicator.className = 'save-indicator saved';
                    indicator.textContent = 'Saved';
                    
                    // Remove indicator after delay
                    setTimeout(() => {
                        indicator.remove();
                    }, 2000);
                } catch (error) {
                    indicator.className = 'save-indicator error';
                    indicator.textContent = 'Save failed';
                    console.error('Auto-save error:', error);
                }
            }, 1000);
        });
    });
}

// Setup auto-save for all forms when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Setup auto-save for property form
    setupAutoSave('property-edit-form', '/api/properties/update');
    
    // Setup auto-save for service form
    setupAutoSave('service-edit-form', '/api/services/update');
    
    // Setup auto-save for ad form
    setupAutoSave('ad-edit-form', '/api/advertisements/update');
    
    // Setup auto-save for settings form
    setupAutoSave('settings-form', '/api/auth/settings/update');
});
