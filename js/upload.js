// upload.js – CORRECTED VERSION
import { stations } from './utils.js';

const STATION_MAP = {
    'iets': 'IETS', 'iwts': 'IWTS', 'nlts': 'NLTS',
    'nwntts': 'NWNTTS', 'oitf': 'OITF', 'stts': 'STTS', 'wkts': 'WKTS'
};

const MAX_RECORDS_PER_STATION = 2000000;

// Login check
if (!localStorage.getItem('isLoggedIn')) {
    location.href = 'index.html';
}

// =============================
// INDEXEDDB – UNLIMITED STORAGE
// =============================
const DB_NAME = 'EPD_Dashboard_2025';
const STORE_NAME = 'yearly_data';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveYearly(stationId, year, records) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(records, `${stationId}_${year}`);
    await tx.done;
}

async function loadYearly(stationId, year) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(`${stationId}_${year}`);
    return new Promise(resolve => {
        req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
    });
}

// =============================
// YEARLY FILE LOGIC
// =============================
const getCurrentYear = () => new Date().getFullYear();
const getYearlyFilename = (id) => `${id}${getCurrentYear()}.json`;

// =============================
// LOAD DATA – 100% SAFE (NEVER NULL)
// =============================
async function loadStationData(stationId) {
    const year = getCurrentYear();
    let data = await loadYearly(stationId, year);

    // CRITICAL FIX: Always return an array
    if (data === null || data === undefined || !Array.isArray(data)) {
        console.log(`Starting fresh: No ${stationId}${year}.json found`);
        return [];
    }

    // Auto-migrate old single file (only if current year is empty)
    if (data.length === 0) {
        try {
            const res = await fetch(`data/${stationId}.json?t=${Date.now()}`);
            if (res.ok) {
                const oldData = await res.json();
                console.log(`Migrating old ${stationId}.json → ${getYearlyFilename(stationId)}`);
                await saveStationData(stationId, oldData);
                return oldData;
            }
        } catch (e) {
            console.log(`No legacy file for ${stationId}`);
        }
    }

    return data;
}

// =============================
// SAVE DATA - FIXED JSON FORMAT
// =============================
// In upload.js - Replace the saveStationData function
async function saveStationData(stationId, records) {
    const year = getCurrentYear();
    
    // Format records with proper structure
    const formatted = records.map(r => {
        const newRecord = {};
        
        // Define the exact columns we want in the final output
        const FINAL_COLUMNS = ['StationId', '日期', '交收狀態', '車輛任務', '入磅時間', '物料重量', '廢物類別', '來源'];
        
        // Add columns in the desired order
        FINAL_COLUMNS.forEach(column => {
            if (column === 'StationId') {
                newRecord[column] = STATION_MAP[stationId];
            } else {
                newRecord[column] = r[column] || ''; // Use empty string if no value
            }
        });
        
        return newRecord;
    }).filter(record => record.日期); // Remove records without date

    // Use DataManager to save
    await DataManager.saveStationData(stationId, formatted, year);

    console.log(`Saved ${formatted.length.toLocaleString()} records → ${DataManager.getYearlyFilename(stationId, year)}`);
    
    // Debug: show first record
    if (formatted.length > 0) {
        console.log('First record structure:', JSON.stringify(formatted[0], null, 2));
    }
}

// =============================
// CSV TO JSON CONVERSION - FIXED
// =============================
function convertCSVToJSON(csv) {
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    // Detect separator - check if it's tab-separated
    const firstLine = lines[0];
    const hasTabs = firstLine.includes('\t');
    const hasCommas = firstLine.includes(',');
    
    const separator = hasTabs ? '\t' : ',';
    const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    
    console.log('Detected separator:', separator === '\t' ? 'TAB' : 'COMMA');
    console.log('Headers:', headers);
    
    // Define the exact columns we want to keep - ALWAYS INCLUDE THESE
    const REQUIRED_COLUMNS = ['日期', '交收狀態', '車輛任務', '入磅時間', '物料重量', '廢物類別', '來源'];
    
    return lines.slice(1).map((line, index) => {
        try {
            const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
            
            // Validate that we have the right number of columns
            if (values.length !== headers.length) {
                console.warn(`Line ${index + 2}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
                return null;
            }
            
            const obj = {};
            let hasRequiredData = false;
            
            // Create object with ALL required columns, even if empty
            REQUIRED_COLUMNS.forEach(column => {
                const headerIndex = headers.indexOf(column);
                if (headerIndex !== -1) {
                    // Column exists in CSV headers
                    obj[column] = values[headerIndex] || ''; // Use empty string if no value
                    if (column === '日期' && values[headerIndex]) {
                        hasRequiredData = true; // Consider it valid if we have at least a date
                    }
                } else {
                    // Column doesn't exist in CSV, add as empty
                    obj[column] = '';
                }
            });
            
            // Only return if we have at least a date (required field)
            return hasRequiredData ? obj : null;
        } catch (error) {
            console.error(`Error parsing line ${index + 2}:`, error);
            return null;
        }
    }).filter(record => record !== null); // Remove null records
}

// =============================
// RENDER UPLOAD PAGE
// =============================
function renderUploadPage() {
    return `
        <div class="upload-container">
            <div class="logo">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#00ff88" fill-opacity="0.1" stroke="#00ff88" stroke-width="2"/>
                    <path d="M35 40L45 55L65 35" stroke="#00ff88" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <h1 class="upload-title">Upload Station Data</h1>
            <div class="upload-subtitle">Upload CSV files - system automatically updates station data</div>
            
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </div>
                <div class="upload-text">Drop CSV files here or click to browse</div>
                <div class="upload-hint">For large files, split into multiple smaller CSV files</div>
                <input type="file" id="fileInput" class="file-input" accept=".csv" multiple>
                <button class="upload-btn" id="selectFilesBtn">Select CSV Files</button>
                
                <div id="fileInfo" class="file-info" style="display: none;">
                    <div class="file-name" id="fileName"></div>
                    <div class="file-details" id="fileDetails"></div>
                    <div class="station-detected" id="stationDetected"></div>
                    <div class="file-size-warning" id="fileSizeWarning"></div>
                </div>
            </div>
            
            <div id="processingSteps" class="processing-steps" style="display: none;">
                <div class="step" id="step1"><svg class="step-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Reading CSV files...</div>
                <div class="step" id="step2"><svg class="step-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Loading existing data...</div>
                <div class="step" id="step3"><svg class="step-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Merging & deduplicating...</div>
                <div class="step" id="step4"><svg class="step-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg> Saving data...</div>
            </div>
            
            <div class="button-container">
                <button class="upload-btn" id="processBtn" disabled>Process & Update Data</button>
                <button class="back-btn" onclick="location.href='dashboard.html'">Back to Dashboard</button>
                <button class="clear-btn" id="clearStorageBtn">Clear All Data</button>
            </div>
            
            <div id="uploadStatus" class="upload-status" style="display: none;"></div>

            <div class="storage-management">
                <strong>2025+ Yearly System Active</strong><br>
                • Data saved as: stts2025.json, wkts2025.json, etc.<br>
                • Unlimited storage (IndexedDB)<br>
                • Automatic yearly split in 2026<br>
                • Works even with zero data
            </div>
        </div>
    `;
}

let selectedFiles = [];

function initializeUploadPage() {
    document.getElementById('app').innerHTML = renderUploadPage();
    setupEventListeners();
}

function setupEventListeners() {
    const area = document.getElementById('uploadArea');
    const input = document.getElementById('fileInput');
    const btn = document.getElementById('processBtn');
    const selectBtn = document.getElementById('selectFilesBtn');
    const clearBtn = document.getElementById('clearStorageBtn');

    input.addEventListener('change', handleFileSelect);
    area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
    area.addEventListener('drop', e => { e.preventDefault(); area.classList.remove('drag-over'); input.files = e.dataTransfer.files; handleFileSelect({target: input}); });
    area.addEventListener('click', e => { if (!e.target.closest('button')) input.click(); });
    selectBtn.addEventListener('click', e => { e.stopPropagation(); input.click(); });
    btn.addEventListener('click', processAllFiles);
    clearBtn.addEventListener('click', () => confirm('Clear ALL data?') && indexedDB.deleteDatabase(DB_NAME) && location.reload());
}

function handleFileSelect(e) {
    selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    const groups = {};
    selectedFiles.forEach(f => {
        const id = detectStationFromFilename(f.name);
        if (id) (groups[id] ||= []).push(f);
    });

    document.getElementById('fileName').textContent = `${selectedFiles.length} file(s) selected`;
    document.getElementById('fileDetails').innerHTML = Object.keys(groups).map(s => `${s.toUpperCase()}: ${groups[s].length} file(s)`).join('<br>');
    document.getElementById('stationDetected').innerHTML = `Detected: ${Object.keys(groups).map(s => s.toUpperCase()).join(', ')}`;
    document.getElementById('stationDetected').style.color = '#00ff88';
    document.getElementById('processBtn').disabled = false;
    document.getElementById('fileInfo').style.display = 'block';
}

function detectStationFromFilename(name) {
    const lower = name.toLowerCase();
    for (const [id, code] of Object.entries(STATION_MAP)) {
        if (lower.includes(id) || lower.includes(code.toLowerCase())) return id;
    }
    return null;
}

async function processAllFiles() {
    const btn = document.getElementById('processBtn');
    btn.disabled = true; btn.textContent = 'Processing...';
    document.getElementById('processingSteps').style.display = 'block';

    try {
        const groups = {};
        selectedFiles.forEach(f => {
            const id = detectStationFromFilename(f.name);
            if (id) (groups[id] ||= []).push(f);
        });

        for (const [stationId, files] of Object.entries(groups)) {
            updateStep(2, 'active');
            let allRecords = await loadStationData(stationId);
            if (!Array.isArray(allRecords)) allRecords = [];

            const seen = new Set(allRecords.map(r => `${r.日期}|${r.入磅時間}|${r.車輛任務}`));

            updateStep(3, 'active');
            for (const file of files) {
                const text = await readFileAsText(file);
                const newRecs = convertCSVToJSON(text);
                newRecs.forEach(r => {
                    const key = `${r.日期}|${r.入磅時間}|${r.車輛任務}`;
                    if (!seen.has(key)) {
                        allRecords.push(r);
                        seen.add(key);
                    }
                });
            }

            updateStep(4, 'active');
            allRecords = applyRecordLimit(allRecords);
            await saveStationData(stationId, allRecords);
        }

        showStatus('<strong>Upload Complete!</strong> Yearly file created successfully.', 'success');
        btn.textContent = 'Complete';
        setTimeout(() => location.reload(), 3000);
    } catch (err) {
        console.error(err);
        showStatus(`Error: ${err.message}`, 'error');
        btn.disabled = false; btn.textContent = 'Process & Update Data';
    }
}

function updateStep(n, status) {
    const el = document.getElementById(`step${n}`);
    el.className = `step ${status}`;
    const icon = el.querySelector('.step-icon');
    if (status === 'completed') icon.innerHTML = `<path d="M20 6L9 17l-5-5" stroke="#00ff88" stroke-width="3"/>`;
}

function applyRecordLimit(recs) {
    if (recs.length <= MAX_RECORDS_PER_STATION) return recs;
    return recs.sort((a, b) => new Date(b.日期) - new Date(a.日期)).slice(0, MAX_RECORDS_PER_STATION);
}

function downloadJSON(content, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], {type: 'application/json'}));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}

function readFileAsText(f) {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.onerror = rej;
        reader.readAsText(f, 'UTF-8');
    });
}

function showStatus(msg, type) {
    const el = document.getElementById('uploadStatus');
    el.innerHTML = msg;
    el.className = `upload-status status-${type}`;
    el.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initializeUploadPage);