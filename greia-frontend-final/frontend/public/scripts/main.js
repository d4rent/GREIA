// Only declare API_BASE_URL if not already defined
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'https://api.d4rent.ie';
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Property search functionality ---
    const searchForm = document.getElementById('search-form');
    const propertyList = document.getElementById('property-list');

    if (searchForm && propertyList) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const searchTerm = document.getElementById('search-input').value;
            const properties = await fetchProperties(searchTerm);
            displayProperties(properties);
        });

        async function fetchProperties(searchTerm) {
            const response = await fetch(`${API_BASE_URL}/api/properties?search=${searchTerm}`);
            return response.json();
        }

        function displayProperties(properties) {
            propertyList.innerHTML = '';
            properties.forEach(property => {
                const propertyCard = document.createElement('div');
                propertyCard.className = 'property-card';
                propertyCard.innerHTML = `
                    <img src="${
       property.image
        ? (property.image.startsWith('http') || property.image.startsWith('/uploads/')
            ? property.image
            : '/uploads/' + property.image)
        : '/assets/sold buy.png'
}" alt="${property.title}">
                    <h3>${property.title}</h3>
                    <p>${property.price}</p>
                    <a href="/pages/propertytemplate.html?id=${property.id}">View Details</a>
                `;
                propertyList.appendChild(propertyCard);
            });
        }
    }

    // --- Registration Form Logic ---
    function getSelectedRole() {
        const checked = document.querySelector('input[name="role"]:checked');
        return checked ? checked.value : '';
    }

    const psraField = document.getElementById('register-psra');
    const psraLabel = document.querySelector('label[for="register-psra"]');
    const roleRadios = document.querySelectorAll('input[name="role"]');

    function updatePSRAVisibility() {
        const value = getSelectedRole();
        if (
            value === 'Real Estate Agent' ||
            value === 'GREIA Agent'
        ) {
            psraField && psraField.classList.remove('hidden');
            psraLabel && psraLabel.classList.remove('hidden');
            if (psraField) psraField.required = true;
        } else {
            psraField && psraField.classList.add('hidden');
            psraLabel && psraLabel.classList.add('hidden');
            if (psraField) {
                psraField.required = false;
                psraField.value = '';
            }
        }
    }

    if (roleRadios.length && psraField && psraLabel) {
        roleRadios.forEach(radio => {
            radio.addEventListener('change', updatePSRAVisibility);
        });
        updatePSRAVisibility(); // Run on page load
    }

    // GREIA Agent types show/hide logic
    const greiaRadio = document.getElementById('greia-agent-radio');
    const greiaTypes = document.getElementById('greia-agent-types');

    function updateGreiaTypesVisibility() {
        if (greiaRadio && greiaRadio.checked) {
            greiaTypes && greiaTypes.classList.remove('hidden');
        } else if (greiaTypes) {
            greiaTypes.classList.add('hidden');
            greiaTypes.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    }

    if (greiaRadio && greiaTypes && roleRadios.length) {
        roleRadios.forEach(radio => {
            radio.addEventListener('change', updateGreiaTypesVisibility);
        });
        updateGreiaTypesVisibility(); // Run on page load
    }

    // Registration form handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const full_name = formData.get('full_name');
            const email = formData.get('email');
            const password = formData.get('password');
            const role = getSelectedRole();
            const psra_number = formData.get('psra_number');
            const greia_types = formData.getAll('greia_types'); // array

            const body = { full_name, email, password, role };
            if (
                role === 'Real Estate Agent' ||
                role === 'GREIA Agent'
            ) {
                body.psra_number = psra_number;
            }
            if (role === 'GREIA Agent') {
                body.greia_types = greia_types; // send as array
            }

            fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            .then(res => res.json())
            .then(data => {
                if (data.message && data.message.toLowerCase().includes('success')) {
                    window.location.href = '/pages/profile.html';
                } else {
                    alert(data.error || data.message || 'Registration failed');
                }
            });
        });
    }

    // --- Slideshow functionality ---
    let slideIndex = 0;
    function showSlides() {
        const slides = document.querySelectorAll(".slide");
        slides.forEach((slide) => (slide.style.display = "none")); // Hide all slides

        slideIndex++;
        if (slideIndex > slides.length) {
            slideIndex = 1; // Reset to the first slide
        }

        if (slides.length) {
            slides[slideIndex - 1].style.display = "block"; // Show the current slide
            setTimeout(showSlides, 5000); // Change slide every 5 seconds
        }
    }
    if (document.querySelectorAll(".slide").length) {
        showSlides();
    }

    // --- Dropdown toggle functionality ---
    window.toggleDropdown = function(step) {
        const dropdown = document.getElementById(`dropdown-${step}`);
        if (!dropdown) return;
        const isVisible = dropdown.style.display === "block";

        // Hide all dropdowns
        const allDropdowns = document.querySelectorAll(".dropdown-section");
        allDropdowns.forEach((section) => (section.style.display = "none"));

        // Toggle the clicked dropdown
        if (!isVisible) {
            dropdown.style.display = "block";
        }
    };

    // --- Map initialization ---
    let map, geocoder, marker;

    window.initMap = function() {
        const mapOptions = {
            center: { lat: 53.334028, lng: -6.253549 }, // Default center (Dublin 4)
            zoom: 14,
        };

        const mapElement = document.getElementById("map");
        if (!mapElement) return;

        map = new google.maps.Map(mapElement, mapOptions);
        geocoder = new google.maps.Geocoder(); // Initialize the geocoder

        // Geocode the address for The Waterloo
        const address = "The Waterloo, Baggot Street Upper, Dublin, Ireland";
        geocodeAddress(address);
    };

    function geocodeAddress(address) {
        if (!geocoder) return;
        geocoder.geocode({ address: address }, function (results, status) {
            if (status === "OK") {
                // Center the map on the geocoded location
                map.setCenter(results[0].geometry.location);

                // Add a marker for the location
                marker = new google.maps.Marker({
                    map: map,
                    position: results[0].geometry.location,
                    title: "D4RENT.IE",
                });

                // Optional: Zoom in on the location
                map.setZoom(16);
            } else {
                console.error("Geocode was not successful for the following reason: " + status);
                alert("Failed to load the map. Please try again later.");
            }
        });
    }
});