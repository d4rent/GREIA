// Get modal elements
const modal = document.getElementById('auth-modal');
const loginBtn = document.getElementById('login-btn');
const closeBtn = document.querySelector('.close-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// Show modal when login button is clicked
if (loginBtn && modal) {
    loginBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        if (loginForm && registerForm) {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        }
    });
}

// Close modal when close button is clicked
if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

// Switch to register form
if (showRegisterLink && loginForm && registerForm) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });
}

// Switch to login form
if (showLoginLink && loginForm && registerForm) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });
}

// Close modal when clicking outside the modal content
if (modal) {
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Stripe payment logic for modal
// Requires a button with id="pay-now-btn" in your modal HTML

document.addEventListener('DOMContentLoaded', function() {
    const payNowBtn = document.getElementById('pay-now-btn');
    if (payNowBtn) {
        payNowBtn.onclick = async function() {
            const res = await fetch(`${API_BASE_URL}/api/payments/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ /* add user info if needed */ })
            });
            const data = await res.json();
            if (data.url) {
                window.location = data.url;
            } else {
                alert(data.error || 'Payment error');
            }
        };
    }
});