// Station data
export const stations = [
  { id: 'IETS', name: 'IETS - Island East Transfer Station' },
  { id: 'IWTS', name: 'IWTS - Island West Transfer Station' },
  { id: 'NLTS', name: 'NLTS - North Lantau Transfer Station' },
  { id: 'NWNTTS', name: 'NWNTTS - North West New Territories Transfer Station' },
  { id: 'OITF', name: 'OITF - Outlying Islands Transfer Facilities' },
  { id: 'STTS', name: 'STTS - Shatin Transfer Station' },
  { id: 'WKTS', name: 'WKTS - West Kowloon Transfer Station' }
];

// Login form renderer
export function renderLogin() {
  const stationOptions = stations.map(station => 
    `<option value="${station.id}">${station.name}</option>`
  ).join('');

  return `
    <div class="login-container">
      <div class="logo">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="#00ff88" fill-opacity="0.1" stroke="#00ff88" stroke-width="2"/>
          <path d="M35 40L45 55L65 35" stroke="#00ff88" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="50" cy="50" r="30" fill="none" stroke="#00ff88" stroke-width="1" stroke-dasharray="5 5"/>
        </svg>
      </div>
      
      <h1>EPD Dashboard</h1>
      <div class="subtitle">Environmental Protection Department Monitoring System</div>
      
      <form id="loginForm">
        <div class="form-group">
          <label for="stationId">Select Station</label>
          <select id="stationId" class="select-field" required>
            <option value="">Choose your station...</option>
            ${stationOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" class="input-field" placeholder="Enter password" required>
          <div id="errorMessage" class="error-message"></div>
          <div id="successMessage" class="success-message"></div>
        </div>
        
        <button type="submit" class="btn-primary">Login to Dashboard</button>
      </form>
      
      <div class="login-footer">
        Default password: epd123
      </div>
    </div>
  `;
}

// Utility functions
export function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  const successEl = document.getElementById('successMessage');
  
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
  if (successEl) {
    successEl.style.display = 'none';
  }
}

export function showSuccess(message) {
  const errorEl = document.getElementById('errorMessage');
  const successEl = document.getElementById('successMessage');
  
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'block';
  }
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

export function hideMessages() {
  const errorEl = document.getElementById('errorMessage');
  const successEl = document.getElementById('successMessage');
  
  if (errorEl) errorEl.style.display = 'none';
  if (successEl) successEl.style.display = 'none';
}