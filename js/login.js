// js/login.js – FINAL VERSION (Auto-load stations + secure login)
import { renderLogin, showError, showSuccess, hideMessages } from './utils.js';

// YOUR PUBLISHED GOOGLE SHEET CSV URL (already correct!)
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQkDI5VX4g0j9YGPbJt8Uyp-_UzMjS62RlIJ8lEMJFAml4tcsM62gkZhezTuLKlfo-OMcOyB8BtdsSs/pub?gid=1307121122&single=true&output=csv';

// Render your beautiful login page
document.getElementById('app').innerHTML = renderLogin();

// === 1. LOAD STATIONS FROM GOOGLE SHEET (Column A = "Station") ===
async function loadStations() {
  const select = document.getElementById('stationId');
  select.innerHTML = '<option value="">Loading stations...</option>';

  try {
    const res = await fetch(GOOGLE_SHEET_CSV_URL + '&t=' + Date.now());
    if (!res.ok) throw new Error('Cannot fetch sheet');
    const csv = await res.text();
    const lines = csv.split('\n').slice(1); // skip header

    const stations = new Set();
    lines.forEach(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols[0] && cols[0] !== 'Station') {
        stations.add(cols[0].toUpperCase());
      }
    });

    select.innerHTML = '<option value="">請選擇轉運站 / Select Station</option>';
    [...stations].sort().forEach(station => {
      const opt = document.createElement('option');
      opt.value = station.toLowerCase();
      opt.textContent = station;
      select.appendChild(opt);
    });

    if (stations.size === 0) {
      select.innerHTML = '<option disabled>No stations found</option>';
    }
  } catch (err) {
    select.innerHTML = '<option disabled>Failed to load stations</option>';
    console.error(err);
  }
}

// === 2. SECURE LOGIN ===
document.getElementById('loginForm').onsubmit = async (e) => {
  e.preventDefault();
  hideMessages();

  const stationId = document.getElementById('stationId').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  if (!stationId) return showError('Please select a station');
  if (!password) return showError('Please enter password');

  const hashHex = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  try {
    const res = await fetch(GOOGLE_SHEET_CSV_URL + '&t=' + Date.now());
    const csv = await res.text();
    const lines = csv.split('\n').slice(1);
    const today = new Date().toISOString().split('T')[0];

    let valid = false;
    let stationName = '';

    for (const line of lines) {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 4) continue;
      const [station, storedHash, allowedStation, expiry] = cols;

      const match = (allowedStation.toLowerCase() === 'all' || allowedStation.toLowerCase() === stationId) &&
                    storedHash.toLowerCase() === hashHex &&
                    today <= expiry;

      if (match) {
        valid = true;
        stationName = document.getElementById('stationId').selectedOptions[0].text;
        break;
      }
    }

    if (valid) {
      showSuccess('Login successful! Redirecting...');
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('stationId', stationId);
      localStorage.setItem('stationName', stationName);
      localStorage.setItem('loginTime', new Date().toISOString());
      setTimeout(() => location.href = 'dashboard.html', 1200);
    } else {
      showError('Invalid station or password');
      document.getElementById('password').value = '';
    }
  } catch (err) {
    showError('Login service down');
    console.error(err);
  }
};

// Clear errors on input
document.getElementById('stationId').addEventListener('change', hideMessages);
document.getElementById('password').addEventListener('input', hideMessages);

// Load stations on page load
document.addEventListener('DOMContentLoaded', loadStations);

// Keep your beautiful focus animation
document.querySelectorAll('.input-field, .select-field').forEach(el => {
  el.addEventListener('focus', () => el.parentElement.style.transform = 'scale(1.02)');
  el.addEventListener('blur', () => el.parentElement.style.transform = 'scale(1)');
});