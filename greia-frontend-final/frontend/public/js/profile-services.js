// Service management functions
function showAddServiceForm() {
  document.getElementById('add-service-form').style.display = 'none';
  document.getElementById('edit-service-form').style.display = 'none';
  document.getElementById('service-contract-form').style.display = 'block';
}

function hideServiceContract() {
  document.getElementById('service-contract-form').style.display = 'none';
}

function proceedToServiceForm() {
  const agreeChecked = document.getElementById('service-contract-agree').checked;
  const licenseChecked = document.getElementById('service-license-confirm').checked;
  const insuranceChecked = document.getElementById('service-insurance-confirm').checked;
  if (!agreeChecked || !licenseChecked || !insuranceChecked) {
    alert('Please agree to all terms and confirmations before proceeding.');
    return;
  }
  document.getElementById('service-contract-form').style.display = 'none';
  document.getElementById('add-service-form').style.display = 'block';
}

function hideAddServiceForm() {
  document.getElementById('add-service-form').style.display = 'none';
  document.getElementById('service-upload-form').reset();
  document.getElementById('service-contract-agree').checked = false;
  document.getElementById('service-license-confirm').checked = false;
  document.getElementById('service-insurance-confirm').checked = false;
}

function showEditServiceForm(service) {
  const editForm = document.getElementById('edit-service-form');
  document.getElementById('edit-service-id').value = service.id;
  document.getElementById('edit-service-name').value = service.name || '';
  document.getElementById('edit-service-category').value = service.category || '';
  document.getElementById('edit-service-type').value = service.service_type || '';
  document.getElementById('edit-service-price-structure').value = service.price_structure || '';
  document.getElementById('edit-service-price').value = service.price_range || '';
  document.getElementById('edit-service-availability').value = service.availability || '';
  document.getElementById('edit-service-response-time').value = service.response_time || '';
  document.getElementById('edit-service-description').value = service.description || '';
  document.getElementById('edit-service-areas').value = service.service_areas || '';
  document.getElementById('edit-service-website').value = service.website || '';
  document.getElementById('edit-service-phone').value = service.phone || '';
  document.getElementById('edit-service-email').value = service.email || '';
  document.getElementById('edit-service-certifications').value = service.certifications || '';
  document.getElementById('edit-service-insurance').value = service.insurance || '';
  document.getElementById('edit-service-experience').value = service.experience_years || '';
  editForm.style.display = 'block';
  document.getElementById('add-service-form').style.display = 'none';
  setTimeout(() => { initializeAutoSave(); }, 100);
}

function hideEditServiceForm() {
  document.getElementById('edit-service-form').style.display = 'none';
  document.getElementById('service-edit-form').reset();
}
