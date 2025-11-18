import { stations } from './utils.js';

const STATION_MAP = {
    'iets': 'IETS', 'iwts': 'IWTS', 'nlts': 'NLTS', 
    'nwntts': 'NWNTTS', 'oitf': 'OITF', 'stts': 'STTS', 'wkts': 'WKTS'
};

const REQUIRED_COLUMNS = ['日期', '交收狀態', '車輛任務', '入磅時間', '物料重量', '廢物類別', '來源'];
const UNIQUE_ID_FIELDS = ['日期', '入磅時間', '車輛任務'];

// Check login
if (!localStorage.getItem('isLoggedIn')) {
    location.href = 'index.html';
}

// Increased limits for larger datasets
const MAX_RECORDS_PER_STATION = 2000000; // 2 Million records max
const STORAGE_KEYS = {
    DATA_PREFIX: 'epd-data-'
};

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
            
            <!-- Upload Area -->
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
                <button class="upload-btn" id="selectFilesBtn">
                    Select CSV Files
                </button>
                
                <div id="fileInfo" class="file-info" style="display: none;">
                    <div class="file-name" id="fileName"></div>
                    <div class="file-details" id="fileDetails"></div>
                    <div class="station-detected" id="stationDetected"></div>
                    <div class="file-size-warning" id="fileSizeWarning" style="color: #ffc107; font-size: 12px; margin-top: 5px;"></div>
                </div>
            </div>
            
            <!-- Processing Steps -->
            <div id="processingSteps" class="processing-steps" style="display: none;">
                <div class="step" id="step1">
                    <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Reading CSV files...
                </div>
                <div class="step" id="step2">
                    <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Loading existing station data...
                </div>
                <div class="step" id="step3">
                    <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Merging and removing duplicates...
                </div>
                <div class="step" id="step4">
                    <svg class="step-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    Saving updated data...
                </div>
            </div>
            
            <div class="button-container">
                <button class="upload-btn" id="processBtn" disabled>Process & Update Data</button>
                <button class="back-btn" onclick="location.href='dashboard.html'">Back to Dashboard</button>
                <button class="clear-btn" id="clearStorageBtn" style="background: #ff4444; margin-left: 10px;">Clear All Data</button>
            </div>
            
            <div id="uploadStatus" class="upload-status" style="display: none;"></div>

            <!-- Updated Storage Info -->
            <div class="storage-management" style="margin-top: 20px; padding: 15px; background: rgba(255,193,7,0.1); border-radius: 6px; font-size: 14px; color: #ffc107;">
                <strong>Storage Information:</strong><br>
                • Maximum 2,000,000 records per station<br>
                • Split large CSV files into smaller chunks (under 10MB each)<br>
                • Oldest records are automatically removed when limit reached<br>
                • Browser storage limit is approximately 5-10MB per domain
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
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const processBtn = document.getElementById('processBtn');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const clearStorageBtn = document.getElementById('clearStorageBtn');

    fileInput.addEventListener('change', handleFileSelect);
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        fileInput.files = e.dataTransfer.files;
        handleFileSelect({ target: fileInput });
    });
    
    uploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.upload-btn')) {
            fileInput.click();
        }
    });
    
    selectFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    processBtn.addEventListener('click', processAllFiles);
    clearStorageBtn.addEventListener('click', clearAllStorage);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    selectedFiles = files;
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileDetails = document.getElementById('fileDetails');
    const stationDetected = document.getElementById('stationDetected');
    const fileSizeWarning = document.getElementById('fileSizeWarning');

    // Check file sizes
    let totalSize = 0;
    let hasLargeFiles = false;
    
    files.forEach(file => {
        totalSize += file.size;
        if (file.size > 10 * 1024 * 1024) { // Increased to 10MB
            hasLargeFiles = true;
        }
    });

    // Group files by station
    const stationFiles = {};
    files.forEach(file => {
        const stationId = detectStationFromFilename(file.name);
        if (stationId) {
            if (!stationFiles[stationId]) stationFiles[stationId] = [];
            stationFiles[stationId].push(file);
        }
    });

    let fileList = '';
    Object.keys(stationFiles).forEach(stationId => {
        fileList += `${stationId.toUpperCase()}: ${stationFiles[stationId].length} file(s)<br>`;
    });

    fileName.textContent = `${files.length} file(s) selected`;
    fileDetails.innerHTML = `Total files: ${files.length}<br>${fileList}`;
    
    // Show size warning if needed
    if (hasLargeFiles) {
        fileSizeWarning.innerHTML = '⚠️ Large files detected. Processing may take longer. Consider splitting files.';
    } else {
        fileSizeWarning.innerHTML = '';
    }
    
    if (Object.keys(stationFiles).length > 0) {
        stationDetected.innerHTML = `Stations detected: ${Object.keys(stationFiles).map(s => s.toUpperCase()).join(', ')}`;
        stationDetected.style.color = '#00ff88';
        document.getElementById('processBtn').disabled = false;
    } else {
        stationDetected.innerHTML = 'No stations detected in filenames';
        stationDetected.style.color = '#ff4444';
        document.getElementById('processBtn').disabled = true;
    }
    
    fileInfo.style.display = 'block';
    hideStatus();
}

function detectStationFromFilename(filename) {
    const lowerFilename = filename.toLowerCase();
    for (const [stationId, stationKey] of Object.entries(STATION_MAP)) {
        if (lowerFilename.includes(stationKey.toLowerCase()) || lowerFilename.includes(stationId)) {
            return stationId;
        }
    }
    return null;
}

async function processAllFiles() {
    const processBtn = document.getElementById('processBtn');
    const steps = document.getElementById('processingSteps');
    
    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';
    steps.style.display = 'block';
    
    // Reset steps
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`step${i}`).className = 'step';
    }

    try {
        updateStep(1, 'active');
        
        // Group files by station
        const stationFiles = {};
        selectedFiles.forEach(file => {
            const stationId = detectStationFromFilename(file.name);
            if (stationId) {
                if (!stationFiles[stationId]) stationFiles[stationId] = [];
                stationFiles[stationId].push(file);
            }
        });

        let totalResults = { newRecords: 0, duplicates: 0, stations: [] };

        // Process each station
        for (const [stationId, files] of Object.entries(stationFiles)) {
            updateStep(2, 'active');
            
            // Load existing data for this station
            const existingData = await loadStationData(stationId);
            let allRecords = existingData || [];
            const uniqueKeys = new Set();
            
            // Build unique keys from existing data
            allRecords.forEach(record => {
                uniqueKeys.add(getRecordKey(record));
            });

            updateStep(3, 'active');
            
            // Process each CSV file for this station
            let stationNewRecords = 0;
            let stationDuplicates = 0;
            
            for (const file of files) {
                const csvText = await readFileAsText(file);
                const newRecords = convertCSVToJSON(csvText, stationId);
                
                newRecords.forEach(record => {
                    const key = getRecordKey(record);
                    if (!uniqueKeys.has(key)) {
                        allRecords.push(record);
                        uniqueKeys.add(key);
                        stationNewRecords++;
                    } else {
                        stationDuplicates++;
                    }
                });
            }

            updateStep(4, 'active');
            
            // Apply record limit and save data
            const finalRecords = applyRecordLimit(allRecords);
            await saveStationData(stationId, finalRecords);
            
            totalResults.newRecords += stationNewRecords;
            totalResults.duplicates += stationDuplicates;
            totalResults.stations.push({
                station: stationId.toUpperCase(),
                newRecords: stationNewRecords,
                duplicates: stationDuplicates,
                total: finalRecords.length,
                recordsRemoved: allRecords.length - finalRecords.length
            });
        }

        // Show results
        let resultText = `<strong>Processing Complete!</strong><br>`;
        totalResults.stations.forEach(station => {
            resultText += `${station.station}: +${station.newRecords.toLocaleString()} new, ${station.duplicates.toLocaleString()} duplicates, ${station.total.toLocaleString()} total`;
            if (station.recordsRemoved > 0) {
                resultText += ` (${station.recordsRemoved.toLocaleString()} old records removed)`;
            }
            resultText += `<br>`;
        });
        
        showStatus(resultText, 'success');
        
        processBtn.textContent = 'Process Complete';
        
        // Clear selection after 3 seconds
        setTimeout(() => {
            selectedFiles = [];
            document.getElementById('fileInput').value = '';
            document.getElementById('fileInfo').style.display = 'none';
            steps.style.display = 'none';
            processBtn.disabled = false;
            processBtn.textContent = 'Process & Update Data';
        }, 3000);

    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        processBtn.disabled = false;
        processBtn.textContent = 'Process & Update Data';
        steps.style.display = 'none';
    }
}

function updateStep(stepNumber, status) {
    const step = document.getElementById(`step${stepNumber}`);
    step.className = `step ${status}`;
    
    const icon = step.querySelector('.step-icon');
    if (status === 'completed') {
        icon.innerHTML = `<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none"/>`;
    } else if (status === 'active') {
        icon.innerHTML = `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>`;
    }
}

// Apply record limit by removing oldest records
function applyRecordLimit(records) {
    if (records.length <= MAX_RECORDS_PER_STATION) {
        return records;
    }
    
    console.log(`Applying record limit: ${records.length} records, keeping newest ${MAX_RECORDS_PER_STATION.toLocaleString()}`);
    
    // Sort by date (newest first) and keep only the limit
    const sortedRecords = records.sort((a, b) => {
        const dateA = new Date(a.日期 || '2000-01-01');
        const dateB = new Date(b.日期 || '2000-01-01');
        return dateB - dateA; // newest first
    });
    
    const limitedRecords = sortedRecords.slice(0, MAX_RECORDS_PER_STATION);
    console.log(`Record limit applied: ${records.length} -> ${limitedRecords.length} records`);
    
    return limitedRecords;
}

function getRecordKey(record) {
    return `${record.日期}|${record.入磅時間}|${record.車輛任務}`;
}

// Simple data management functions
async function loadStationData(stationId) {
    try {
        const data = localStorage.getItem(`${STORAGE_KEYS.DATA_PREFIX}${stationId}`);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.warn(`Could not load data for ${stationId}:`, error);
        return [];
    }
}

async function saveStationData(stationId, records) {
    try {
        // Format records to match the desired output structure
        const formattedRecords = records.map(record => {
            // Create a new object with StationId first, then other fields
            const formattedRecord = {
                "StationId": STATION_MAP[stationId]
            };
            
            // Add all other fields in the order they appear
            if (record.日期) formattedRecord["日期"] = record.日期;
            if (record.交收狀態) formattedRecord["交收狀態"] = record.交收狀態;
            if (record.車輛任務) formattedRecord["車輛任務"] = record.車輛任務;
            if (record.入磅時間) formattedRecord["入磅時間"] = record.入磅時間;
            if (record.物料重量) formattedRecord["物料重量"] = record.物料重量;
            if (record.廢物類別 !== undefined) formattedRecord["廢物類別"] = record.廢物類別;
            if (record.來源) formattedRecord["來源"] = record.來源;
            
            return formattedRecord;
        });
        
        // Save minified version to localStorage for efficiency
        const minifiedData = JSON.stringify(formattedRecords);
        
        // Increased size check for larger datasets
        if (minifiedData.length > 50 * 1024 * 1024) { // Increased to 50MB
            throw new Error('Data too large. Please split your files into smaller chunks.');
        }
        
        localStorage.setItem(`${STORAGE_KEYS.DATA_PREFIX}${stationId}`, minifiedData);
        
        // Create properly formatted JSON with proper indentation
        const formattedData = JSON.stringify(formattedRecords, null, 2);
        downloadJSON(formattedData, `${stationId}-${new Date().toISOString().split('T')[0]}.json`);
        
        console.log(`Saved ${records.length.toLocaleString()} records for ${stationId}`);
        return true;
        
    } catch (error) {
        if (error.message.includes('exceeded the quota')) {
            throw new Error('Browser storage full. Please clear some data or use smaller files. Maximum storage is typically 5-10MB per domain.');
        }
        throw error;
    }
}

function clearAllStorage() {
    if (confirm('Are you sure you want to clear ALL station data? This cannot be undone.')) {
        const stations = Object.keys(STATION_MAP);
        let clearedCount = 0;
        
        stations.forEach(stationId => {
            const dataKey = `${STORAGE_KEYS.DATA_PREFIX}${stationId}`;
            if (localStorage.getItem(dataKey)) {
                localStorage.removeItem(dataKey);
                clearedCount++;
            }
        });
        
        showStatus(`Cleared data for ${clearedCount} stations`, 'success');
        setTimeout(() => {
            location.reload();
        }, 2000);
    }
}

function downloadJSON(content, filename) {
    // Ensure content is properly formatted JSON string
    let formattedContent;
    try {
        // If content is already a string, use it as is
        if (typeof content === 'string') {
            formattedContent = content;
        } else {
            // If content is an object, stringify with formatting
            formattedContent = JSON.stringify(content, null, 2);
        }
    } catch (error) {
        // Fallback: stringify without formatting
        formattedContent = JSON.stringify(content);
    }
    
    const blob = new Blob([formattedContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// File reading and CSV conversion
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file, 'UTF-8');
    });
}

function convertCSVToJSON(csvText, stationId) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const jsonArray = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const record = {};
            
            headers.forEach((header, index) => {
                const cleanHeader = header.trim();
                const value = values[index] ? values[index].trim() : '';
                if (REQUIRED_COLUMNS.includes(cleanHeader)) {
                    record[cleanHeader] = value;
                }
            });
            
            jsonArray.push(record);
        }
    }

    console.log(`Converted ${jsonArray.length} records from CSV for station ${stationId}`);
    return jsonArray;
}

function parseCSVLine(line) {
    if (line.includes('\t')) {
        return line.split('\t').map(value => value.trim().replace(/^"|"$/g, ''));
    } else {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values.map(value => value.trim().replace(/^"|"$/g, ''));
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = message;
    statusDiv.className = `upload-status status-${type}`;
    statusDiv.style.display = 'block';
}

function hideStatus() {
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', initializeUploadPage);