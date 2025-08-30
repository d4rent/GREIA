// Header loader utility - Synchronous version for better performance
function loadHeaderSync(isHomePage = false) {
    // Calculate the correct path based on current location
    const currentPath = window.location.pathname;
    let basePath = '';
    
    // Count how many directories deep we are
    const pathParts = currentPath.split('/').filter(part => part !== '');
    const depth = pathParts.length - (currentPath.endsWith('.html') ? 1 : 0);
    
    // Build the base path to get back to the public directory
    if (depth > 0) {
        basePath = '../'.repeat(depth);
    }
    
    const headerFile = isHomePage ? 
        `${basePath}includes/header-home.html` : 
        `${basePath}includes/header.html`;
    
    console.log('Attempting to load header from:', headerFile);
    
    // Use XMLHttpRequest for synchronous loading
    const xhr = new XMLHttpRequest();
    xhr.open('GET', headerFile, false); // false = synchronous
    
    try {
        xhr.send();
        
        if (xhr.status === 200) {
            const html = xhr.responseText;
            
            // Create a temporary container to hold the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Fix all relative paths in the loaded HTML
            fixRelativePaths(tempDiv, basePath);
            
            // Insert the header at the beginning of the body
            while (tempDiv.firstChild) {
                document.body.insertBefore(tempDiv.firstChild, document.body.firstChild);
            }
            
            // Initialize mobile menu functionality after header is loaded
            initializeMobileMenu();
            
            console.log('Header loaded successfully');
            return true;
        } else {
            throw new Error(`HTTP error! status: ${xhr.status}`);
        }
    } catch (error) {
        console.error('Error loading header:', error);
        
        // Try alternative paths if the first attempt fails
        const alternativePaths = [
            'includes/header.html',
            '../includes/header.html',
            '../../includes/header.html'
        ];
        
        for (const altPath of alternativePaths) {
            try {
                const altXhr = new XMLHttpRequest();
                altXhr.open('GET', altPath, false);
                altXhr.send();
                
                if (altXhr.status === 200) {
                    const html = altXhr.responseText;
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;
                    
                    fixRelativePaths(tempDiv, basePath);
                    
                    while (tempDiv.firstChild) {
                        document.body.insertBefore(tempDiv.firstChild, document.body.firstChild);
                    }
                    
                    initializeMobileMenu();
                    
                    console.log('Header loaded from alternative path:', altPath);
                    return true;
                }
            } catch (altError) {
                console.log('Alternative path failed:', altPath);
            }
        }
        
        // If all attempts fail, show fallback header
        const fallbackHeader = `
            <nav class="navbar" style="background: linear-gradient(to right, #35424a, #1f2a31);">
                <div class="navbar-thirds">
                    <div class="navbar-third left"></div>
                    <div class="navbar-third center">
                        <div class="logo">
                            <a href="${basePath}index.html">
                                <img alt="Logo" src="${basePath}assets/d4rent logo smaller.png" style="height: auto; max-height: 80px;"/>
                            </a>
                        </div>
                    </div>
                    <div class="navbar-third right"></div>
                </div>
            </nav>
        `;
        document.body.insertAdjacentHTML('afterbegin', fallbackHeader);
        
        return false;
    }
}

// Function to fix relative paths in the loaded HTML
function fixRelativePaths(container, basePath) {
    // Fix all href attributes
    const links = container.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href.startsWith('../')) {
            // Replace the hardcoded '../' with the calculated base path
            const newHref = href.replace(/^\.\.\//, basePath);
            link.setAttribute('href', newHref);
        }
    });
    
    // Fix all src attributes (images, scripts, etc.)
    const sources = container.querySelectorAll('[src]');
    sources.forEach(source => {
        const src = source.getAttribute('src');
        if (src.startsWith('../')) {
            // Replace the hardcoded '../' with the calculated base path
            const newSrc = src.replace(/^\.\.\//, basePath);
            source.setAttribute('src', newSrc);
        }
    });
}

// Function to initialize mobile menu functionality
function initializeMobileMenu() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    
    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
            if (mobileNavOverlay) {
                mobileNavOverlay.classList.toggle('active');
            }
        });
    }
    
    // Close mobile menu when clicking overlay
    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', function() {
            mobileNav.classList.remove('active');
            mobileNavOverlay.classList.remove('active');
        });
    }
    
    // Mobile dropdown toggles
    const mobileDropdownToggles = document.querySelectorAll('.mobile-nav .dropdown > a');
    mobileDropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const parentDropdown = this.parentElement;
            const dropdownMenu = parentDropdown.querySelector('.dropdown-menu');
            
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('active');
                parentDropdown.classList.toggle('active');
            }
        });
    });
    
    // Desktop dropdown functionality
    const dropdowns = document.querySelectorAll('.navbar .dropdown');
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('mouseenter', function() {
            const menu = this.querySelector('.dropdown-menu');
            if (menu) menu.style.display = 'block';
        });
        
        dropdown.addEventListener('mouseleave', function() {
            const menu = this.querySelector('.dropdown-menu');
            if (menu) menu.style.display = 'none';
        });
    });
    
    // Referral dropdown functionality
    const referralToggles = document.querySelectorAll('.referral-dropdown-toggle');
    referralToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const referralDropdown = this.parentElement.querySelector('.referral-dropdown');
            if (referralDropdown) {
                const isVisible = referralDropdown.style.display === 'block';
                referralDropdown.style.display = isVisible ? 'none' : 'block';
            }
        });
    });
}

// Auto-load header when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the home page
    const isHomePage = window.location.pathname === '/' || 
                      window.location.pathname.endsWith('/index.html') || 
                      window.location.pathname.includes('index.html') ||
                      (document.querySelector('title') && document.querySelector('title').textContent.includes('D4Rent') && !document.querySelector('title').textContent.includes(' - '));
    
    console.log('Loading header, isHomePage:', isHomePage);
    loadHeaderSync(isHomePage);
});
