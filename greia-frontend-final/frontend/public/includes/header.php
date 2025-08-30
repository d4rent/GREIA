<!-- Navigation Bar -->
<nav class="navbar">
  <div class="navbar-thirds">
    <div class="navbar-third left">
      <ul class="nav-links left-links">
        <li class="dropdown">
          <a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">Property</a>
          <ul class="dropdown-menu">
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">Buy</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/rent.html' : 'rent.html'; ?>">Rent</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/commercial.html' : 'commercial.html'; ?>">Commercial</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">Apartments</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/sell.html' : 'sell.html'; ?>">Sell</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/valuations.html' : 'valuations.html'; ?>">Valuations</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">New Homes</a></li>
          </ul>
        </li>
        <li class="dropdown">
          <a href="#" style="color: rgb(78, 255, 146);" class="referral-dropdown-toggle">Connect</a>
          <ul class="dropdown-menu">
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/agents.html' : 'agents.html'; ?>">Find an Agent</a></li>
            <li class="nested-dropdown" style="position: relative;">
              <a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html' : 'referral-agents.html'; ?>" class="referral-dropdown-toggle" tabindex="0" aria-haspopup="true" aria-expanded="false">Referral Agents ▸</a>
              <ul class="dropdown-menu referral-dropdown" style="display:none; position: absolute; left: 100%; top: 0; background: white; list-style:none; padding:10px; border:1px solid #ccc; min-width: 220px; z-index: 2000;">
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=luxury' : 'referral-agents.html?subtype=luxury'; ?>">Luxury Home Agents</a></li>
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=lettings' : 'referral-agents.html?subtype=lettings'; ?>">Lettings Agents</a></li>
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=newhomes' : 'referral-agents.html?subtype=newhomes'; ?>">New Homes Agents</a></li>
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=commercial' : 'referral-agents.html?subtype=commercial'; ?>">Commercial Agents</a></li>
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=residential' : 'referral-agents.html?subtype=residential'; ?>">Residential Agents</a></li>
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=developer' : 'referral-agents.html?subtype=developer'; ?>">Developer Agents</a></li>
                <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html?subtype=timeshare' : 'referral-agents.html?subtype=timeshare'; ?>">Timeshare Agents</a></li>
              </ul>
            </li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/coaching.html' : 'coaching.html'; ?>">Coaching</a></li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="navbar-third center">
      <div class="logo">
        <a href="<?php echo ($isHomePage ?? false) ? 'index.php' : '../index.php'; ?>">
          <img alt="Logo" src="<?php echo ($isHomePage ?? false) ? 'assets/d4rent logo smaller.png' : '../assets/d4rent logo smaller.png'; ?>" style="height: auto; max-height: 80px;"/>
        </a>
      </div>
    </div>
    <div class="navbar-third right">
      <ul class="nav-links right-links">
        <li>
          <a href="<?php echo ($isHomePage ?? false) ? 'pages/services.html' : 'services.html'; ?>" class="fancy-underline">Our Services</a>
        </li>
        <li>
          <a href="<?php echo ($isHomePage ?? false) ? 'pages/concierge.html' : 'concierge.html'; ?>" class="fancy-underline">Concierge</a>
        </li>
        <li class="dropdown">
          <a href="<?php echo ($isHomePage ?? false) ? 'pages/login.html' : 'login.html'; ?>" id="login-btn">Log In</a>
          <ul class="dropdown-menu">
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/login.html' : 'login.html'; ?>">Sign In</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/register.html' : 'register.html'; ?>">Register</a></li>
            <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/forgot-password.html' : 'forgot-password.html'; ?>">Forgot Password?</a></li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
  <button aria-label="Toggle navigation" class="hamburger-menu">
    <span></span>
    <span></span>
    <span></span>
  </button>
  <!-- Mobile nav menu -->
  <div class="mobile-nav-overlay"></div>
  <div class="mobile-nav">
    <ul>
      <li class="dropdown">
        <a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>" class="dropdown-toggle">Property</a>
        <ul class="dropdown-menu">
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">Buy</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/rent.html' : 'rent.html'; ?>">Rent</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/commercial.html' : 'commercial.html'; ?>">Commercial</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">Apartments</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/sell.html' : 'sell.html'; ?>">Sell</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/valuations.html' : 'valuations.html'; ?>">Valuations</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/buy.html' : 'buy.html'; ?>">New Homes</a></li>
        </ul>
      </li>
      <li class="dropdown">
        <a href="#" class="dropdown-toggle" style="color: rgb(78, 255, 146);">Connect</a>
        <ul class="dropdown-menu">
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/agents.html' : 'agents.html'; ?>">Find an Agent</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/referral-agents.html' : 'referral-agents.html'; ?>">Referral Agents</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/coaching.html' : 'coaching.html'; ?>">Coaching</a></li>
        </ul>
      </li>
      <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/services.html' : 'services.html'; ?>">Our Services</a></li>
      <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/concierge.html' : 'concierge.html'; ?>">Concierge</a></li>
      <li class="dropdown">
        <a href="<?php echo ($isHomePage ?? false) ? 'pages/login.html' : 'login.html'; ?>" class="dropdown-toggle">Log In</a>
        <ul class="dropdown-menu">
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/login.html' : 'login.html'; ?>">Sign In</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/register.html' : 'register.html'; ?>">Register</a></li>
          <li><a href="<?php echo ($isHomePage ?? false) ? 'pages/forgot-password.html' : 'forgot-password.html'; ?>">Forgot Password?</a></li>
        </ul>
      </li>
    </ul>
  </div>
</nav>

<script>
// Mobile Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const dropdownToggles = document.querySelectorAll('.mobile-nav .dropdown-toggle');

    // Toggle mobile menu
    function toggleMobileMenu() {
        hamburgerMenu.classList.toggle('active');
        mobileNav.classList.toggle('open');
        mobileNavOverlay.classList.toggle('show');
        document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    }

    // Close mobile menu
    function closeMobileMenu() {
        hamburgerMenu.classList.remove('active');
        mobileNav.classList.remove('open');
        mobileNavOverlay.classList.remove('show');
        document.body.style.overflow = '';
        
        // Close all dropdowns
        document.querySelectorAll('.mobile-nav .dropdown').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }

    // Hamburger menu click
    hamburgerMenu.addEventListener('click', toggleMobileMenu);

    // Overlay click to close
    mobileNavOverlay.addEventListener('click', closeMobileMenu);

    // Dropdown functionality
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdown = this.parentElement;
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
    window.addEventListener('resize', function() {
        if (window.innerWidth > 700 && mobileNav.classList.contains('open')) {
            closeMobileMenu();
        }
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
});
</script>
