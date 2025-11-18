import { renderLogin, showError, showSuccess, hideMessages } from './utils.js';

// Render login page
document.getElementById('app').innerHTML = renderLogin();

// Handle form submission
document.getElementById('loginForm').onsubmit = (e) => {
  e.preventDefault();
  hideMessages();
  
  const stationId = document.getElementById('stationId').value;
  const password = document.getElementById('password').value;
  
  // Validate station selection
  if (!stationId) {
    showError('Please select a station');
    return;
  }
  
  // Validate password
  if (password === 'epd123') {
    showSuccess('Login successful! Redirecting...');
    
    // Store login state and station info
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('stationId', stationId);
    localStorage.setItem('stationName', document.getElementById('stationId').selectedOptions[0].text);
    localStorage.setItem('loginTime', new Date().toISOString());
    
    // Redirect after short delay
    setTimeout(() => {
      location.href = 'dashboard.html';
    }, 1000);
    
  } else {
    showError('Wrong password. Try: epd123');
    document.getElementById('password').focus();
  }
};

// Add input event listeners to clear errors on type
document.getElementById('stationId').addEventListener('change', hideMessages);
document.getElementById('password').addEventListener('input', hideMessages);

// Add some interactive effects
document.addEventListener('DOMContentLoaded', () => {
  const inputs = document.querySelectorAll('.input-field, .select-field');
  
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.style.transform = 'scale(1)';
    });
  });
});