const API_BASE_URL = 'https://api.d4rent.ie';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Fetch and display user profile
    fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(res => res.json())
    .then(user => {
    if (user.error || user.message) {
        document.getElementById('username-display').textContent = 'Unknown User';
        document.getElementById('profile-details').textContent = user.error || user.message;
    } else {
        document.getElementById('username-display').textContent = user.full_name;
        document.getElementById('profile-details').innerHTML = `
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Role:</strong> ${user.role}</p>
            <p><strong>Phone Number:</strong> ${user.phone_number || ''}</p>
            <p><strong>Bio:</strong> ${user.bio || ''}</p>
            ${user.profile_picture ? `startsWith('http') || listing.image.startsWith('/uploads/')
        ? listing.image
        : '/uploads/' + listing.image)
    : '/assets/placeholder-property.png'
}" alt="Property Photo">cture}" alt="Profile Photo" style="max-width:200px;">` : ''}
        `;
        // Pre-fill edit form
        if (document.getElementById('edit-full_name')) {
            document.getElementById('edit-full_name').value = user.full_name || '';
            document.getElementById('edit-email').value = user.email || '';
            document.getElementById('edit-phone_number').value = user.phone_number || '';
            document.getElementById('edit-bio').value = user.bio || '';
        }
    }
});

    // Edit Profile Form Submission
    const editForm = document.getElementById('edit-profile-form');
    if (editForm) {
        editForm.onsubmit = function(e) {
            e.preventDefault();
            const formData = new FormData(editForm);
            fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token
                },
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Profile updated!');
                    window.location.reload();
                } else {
                    alert(data.error || 'Update failed');
                }
            });
        };
    }

    // Logout Button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        };
    }
});