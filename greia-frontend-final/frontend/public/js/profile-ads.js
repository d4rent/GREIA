// Advertisement management functions
function showAddAdForm() {
  document.getElementById('ad-contract-form').style.display = 'block';
  document.getElementById('add-ad-form').style.display = 'none';
  document.getElementById('edit-ad-form').style.display = 'none';
}

function hideAdContract() {
  document.getElementById('ad-contract-form').style.display = 'none';
}

function proceedToAdForm() {
  const agreeChecked = document.getElementById('ad-contract-agree').checked;
  const legalChecked = document.getElementById('ad-legal-confirm').checked;
  if (!agreeChecked || !legalChecked) {
    alert('Please agree to all terms and confirmations before proceeding.');
    return;
  }
  document.getElementById('ad-contract-form').style.display = 'none';
  document.getElementById('add-ad-form').style.display = 'block';
}

function hideAddAdForm() {
  document.getElementById('add-ad-form').style.display = 'none';
  document.getElementById('ad-upload-form').reset();
  document.getElementById('ad-contract-agree').checked = false;
  document.getElementById('ad-legal-confirm').checked = false;
}

function showEditAdForm() {
  document.getElementById('edit-ad-form').style.display = 'block';
  document.getElementById('add-ad-form').style.display = 'none';
  setTimeout(() => { initializeAutoSave(); }, 100);
}

function hideEditAdForm() {
  document.getElementById('edit-ad-form').style.display = 'none';
  document.getElementById('ad-edit-form').reset();
}
