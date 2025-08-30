// Property management functions
function showAddPropertyForm() {
  document.getElementById('property-contract-form').style.display = 'block';
  document.getElementById('add-property-form').style.display = 'none';
}

function proceedToPropertyForm() {
  const agree = document.getElementById('property-contract-agree').checked;
  const owner = document.getElementById('property-ownership-confirm').checked;
  if (!agree || !owner) {
    alert('You must agree to the terms and confirm ownership to continue.');
    return;
  }
  document.getElementById('property-contract-form').style.display = 'none';
  document.getElementById('add-property-form').style.display = 'block';
}

function hidePropertyContract() {
  document.getElementById('property-contract-form').style.display = 'none';
}

function hideAddPropertyForm() {
  document.getElementById('add-property-form').style.display = 'none';
}

function editProperty(propertyId) {
  fetchPropertyData(propertyId).then(property => {
    if (property) {
      showEditPropertyForm(property);
    } else {
      alert('Error: Could not load property data');
    }
  });
}

async function fetchPropertyData(propertyId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const property = await response.json();
      return property;
    }
  } catch (error) {
    alert('Error fetching property data');
  }
  return null;
}

async function deleteProperty(propertyId) {
  if (confirm('Are you sure you want to delete this property?')) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (response.ok) {
        alert('Property deleted successfully');
        fetchUserProperties();
      } else {
        alert('Error deleting property');
      }
    } catch (error) {
      alert('Error deleting property');
    }
  }
}
