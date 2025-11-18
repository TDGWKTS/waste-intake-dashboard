// dashboard.js - Main dashboard coordinator
import { stations } from './utils.js';

// === DASHBOARD STATE (Shared across modules) ===
export let currentData = [];
export let filteredData = [];
export let currentFilters = {
    dateRange: { start: null, end: null },
    timeRange: { start: '00:00', end: '23:59' },
    deliveryStatus: [],
    vehicleTasks: [],
    wasteTypes: []
};

// Track if filters have been applied
export let filtersApplied = false;

// === DATA STORAGE ===
const DATA_KEY = 'epd-data-';

export function getKey(station) { 
    return DATA_KEY + station.toLowerCase(); 
}

// === UTILITY FUNCTIONS ===
export function getPastDate(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

export function formatTimeInput(input) {
    let value = input.replace(/\D/g, '');
    
    if (value.length === 4) {
        const hours = value.substring(0, 2);
        const minutes = value.substring(2, 4);
        
        const hoursNum = parseInt(hours);
        const minutesNum = parseInt(minutes);
        
        if (hoursNum >= 0 && hoursNum <= 23 && minutesNum >= 0 && minutesNum <= 59) {
            return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
    }
    
    return input;
}

// === EXTRACT SLICER OPTIONS FROM DATA ===
export function extractSlicerOptionsFromData(data) {
    console.log('Extracting slicer options from data with', data.length, 'records');
    
    const deliveryStatus = [...new Set(data.map(record => record['交收狀態']).filter(Boolean))];
    const vehicleTasks = [...new Set(data.map(record => record['車輛任務']).filter(Boolean))];
    const wasteType = [...new Set(data.map(record => record['廢物類別']).filter(Boolean))];
    
    const slicerOptions = {
        deliveryStatus: deliveryStatus,
        vehicleTasks: vehicleTasks,
        wasteType: wasteType
    };
    
    console.log('Extracted slicer options:', slicerOptions);
    return slicerOptions;
}

// === LOAD SLICER OPTIONS FROM STATION JSON ===
export async function loadSlicerOptions(stationId) {
    try {
        const stationFile = stationId.toLowerCase();
        console.log(`📂 Loading data for station: ${stationFile}`);
        
        const response = await fetch(`./data/${stationFile}.json`);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${stationFile}.json: ${response.status}`);
        }
        
        const stationData = await response.json();
        console.log(`✅ Loaded ${stationData.length} records for ${stationFile}`);
        
        const slicerOptions = extractSlicerOptionsFromData(stationData);
        console.log(`🎯 Extracted slicer options:`, {
            deliveryStatus: slicerOptions.deliveryStatus?.length || 0,
            vehicleTasks: slicerOptions.vehicleTasks?.length || 0,
            wasteType: slicerOptions.wasteType?.length || 0
        });
        
        return slicerOptions;
        
    } catch (error) {
        console.error(`❌ Error loading data for ${stationId}:`, error);
        return {
            deliveryStatus: [],
            vehicleTasks: [],
            wasteType: []
        };
    }
}

// === RENDER DASHBOARD ===
export function renderDashboard() {
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    console.log('Rendering dashboard for station:', selectedStationId);
    
    const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
    const stationName = selectedStation ? selectedStation.name : 'West Kowloon Transfer Station';
    const namePart = stationName.split(' - ')[0];
    
    const stationList = stations.map(station => {
        const isActive = station.id.toLowerCase() === selectedStationId.toLowerCase();
        return `
            <div class="station-item ${isActive ? 'active' : ''}" data-station="${station.id.toLowerCase()}">
                <div class="station-checkbox ${isActive ? 'checked' : ''}"></div>
                <div class="station-name-text">${station.id}</div>
            </div>
        `;
    }).join('');

    return `
        <div class="dashboard-layout">
            <!-- SIDEBAR -->
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="station-name">EPD</div>
                    <div class="station-subtitle">Dashboard</div>
                </div>
                
                <div class="stations-section">
                    <div class="section-title">Stations</div>
                    <div class="station-item all-stations" id="allStations">
                        <div class="station-checkbox all-stations"></div>
                        <div class="station-name-text">All Stations</div>
                    </div>
                    ${stationList}
                </div>

                <div class="sidebar-actions">
                    <div class="action-item" id="monthlyStats">
                        <div class="action-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div class="action-text">Monthly Stats</div>
                    </div>
                    <div class="action-item" id="uploadCsv">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10 9 9 9 8 9"/>
                        </svg>
                        <div class="action-text">Upload Data</div>
                    </div>
                    <div class="action-item" id="logout">
                        <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        <div class="action-text">Log Out</div>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENT -->
            <div class="main-content">
                <!-- HEADER -->
                <div class="main-header" id="mainHeader">
                    <div class="station-title-container">
                        <div class="station-main-title">${namePart}</div>
                    </div>
                    
                    <div class="slicers-grid" id="slicersGrid">
                        <!-- Date Range -->
                        <div class="slicer-group">
                            <label class="slicer-label">Pick a date</label>
                            <div class="date-range-inputs">
                                <input type="date" class="slicer-input" id="startDate" value="${getPastDate(7)}">
                                <span class="date-separator">to</span>
                                <input type="date" class="slicer-input" id="endDate" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        
                        <!-- Start Time -->
                        <div class="slicer-group">
                            <label class="slicer-label">Start Time</label>
                            <input type="text" class="slicer-input time-input" id="startTime" value="00:00" maxlength="5" placeholder="0000">
                        </div>
                        
                        <!-- End Time -->
                        <div class="slicer-group">
                            <label class="slicer-label">End Time</label>
                            <input type="text" class="slicer-input time-input" id="endTime" value="23:59" maxlength="5" placeholder="2359">
                        </div>
                        
                        <!-- Delivery Status -->
                        <div class="slicer-group">
                            <label class="slicer-label">Delivery Status</label>
                            <div class="slicer-dropdown">
                                <select class="slicer-select" id="deliveryStatusSelect">
                                    <option value="">Delivery Status (0)</option>
                                </select>
                                <div class="dropdown-content" id="deliveryStatusDropdown"></div>
                            </div>
                        </div>
                        
                        <!-- Vehicle Tasks -->
                        <div class="slicer-group">
                            <label class="slicer-label">Vehicle Tasks</label>
                            <div class="slicer-dropdown">
                                <select class="slicer-select" id="vehicleTasksSelect">
                                    <option value="">Vehicle Tasks (0)</option>
                                </select>
                                <div class="dropdown-content" id="vehicleTasksDropdown"></div>
                            </div>
                        </div>
                        
                        <!-- Waste Type -->
                        <div class="slicer-group">
                            <label class="slicer-label">Waste Type</label>
                            <div class="slicer-dropdown">
                                <select class="slicer-select" id="wasteTypeSelect">
                                    <option value="">Waste Type (0)</option>
                                </select>
                                <div class="dropdown-content" id="wasteTypeDropdown"></div>
                            </div>
                        </div>
                        
                        <button class="apply-btn" id="applyFilters">Apply</button>
                    </div>
                </div>

                <!-- CONTENT AREA -->
                <div class="content-area">
                    <!-- Stats Cards -->
                    <div class="stats-grid hidden" id="statsGrid">
                        <div class="stat-card">
                            <div class="stat-value" id="totalLoads">0</div>
                            <div class="stat-label">Total Loads</div>
                            <div class="stat-subtitle">Completed: G01, C31, P99</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="totalWeight">0 t</div>
                            <div class="stat-label">Total Weight</div>
                            <div class="stat-subtitle">Completed: G01, C31, P99</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="amLoads">0</div>
                            <div class="stat-label">AM</div>
                            <div class="stat-subtitle">Completed: G01 only</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="contractorLoads">0</div>
                            <div class="stat-label">Contractor</div>
                            <div class="stat-subtitle">Completed: C31 only</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="privateLoads">0</div>
                            <div class="stat-label">Private</div>
                            <div class="stat-subtitle">Completed: P99 only</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="greaseTrapLoads">0</div>
                            <div class="stat-label">Grease Trap Waste</div>
                            <div class="stat-subtitle">Completed: P97 only</div>
                        </div>
                    </div>

                    <!-- Charts Section -->
                    <div class="charts-section hidden" id="chartsSection">
                        <div class="section-header">
                            <h3>Performance Analytics</h3>
                            <div class="date-range-info" id="dateRangeInfo"></div>
                        </div>
                        
                        <!-- Main Operations Charts (C31/G01/P99) -->
                        <div class="charts-subsection">
                            <h4 class="subsection-title">Municipal Solid Waste</h4>
                            <div class="charts-grid">
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h5 id="averageLoadsTitle">Average Loads vs Time Period</h5>
                                    </div>
                                    <canvas id="averageLoadsChart"></canvas>
                                </div>
                                
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h5 id="averageTonnageTitle">Average Tonnage vs Time Period</h5>
                                    </div>
                                    <canvas id="averageTonnageChart"></canvas>
                                </div>
                            </div>
                        </div>
                        
                        <!-- P97 Operations Charts -->
                        <div class="charts-subsection">
                            <h4 class="subsection-title">Grease Trap Waste</h4>
                            <div class="charts-grid">
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h5 id="averageLoadsP97Title">Average P97 Loads vs Time Period</h5>
                                    </div>
                                    <canvas id="averageLoadsP97Chart"></canvas>
                                </div>
                                
                                <div class="chart-container">
                                    <div class="chart-header">
                                        <h5 id="averageTonnageP97Title">Average P97 Tonnage vs Time Period</h5>
                                    </div>
                                    <canvas id="averageTonnageP97Chart"></canvas>
                                </div>
                            </div>
                        </div>
                        <!-- Source District Chart -->
                        <div class="charts-subsection">
                            <h4 class="subsection-title">Source District Analysis</h4>
                            <div class="charts-grid">
                                <div class="chart-container full-width">
                                    <div class="chart-header">
                                        <h5 id="sourceDistrictTitle">Loads by Source District</h5>
                                    </div>
                                    <canvas id="sourceDistrictChart"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Data Table -->
                    <div class="data-table-container hidden" id="dataTableContainer">
                        <div class="table-controls">
                            <div class="table-title">Records</div>
                            <div class="table-actions">
                                <div class="record-count">
                                    Showing <span id="showingCount">0</span> of <span id="totalCount">0</span> records
                                </div>
                                <button class="action-btn" id="viewAllBtn" title="View all records">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    </svg>
                                    View All
                                </button>
                                <button class="action-btn" id="downloadCsvBtn" title="Download as CSV">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                    </svg>
                                    Download CSV
                                </button>
                            </div>
                        </div>
                        
                        <div class="table-wrapper">
                            <div class="loading-overlay" id="tableLoading" style="display: none;">
                                Loading records...
                            </div>
                            <table class="data-table" id="dataTable">
                                <thead>
                                    <tr>
                                        <!-- Headers will be populated dynamically by charts.js -->
                                    </tr>
                                </thead>
                                <tbody></tbody>
                            </table>
                        </div>
                        
                        <div class="pagination-controls" id="paginationControls" style="display: none;">
                            <div class="pagination-info">
                                Page <span id="currentPage">1</span> of <span id="totalPages">1</span>
                            </div>
                            <div class="pagination-buttons">
                                <button class="pagination-btn" id="prevPageBtn" disabled>Previous</button>
                                <button class="pagination-btn" id="nextPageBtn" disabled>Next</button>
                            </div>
                        </div>
                    </div>

                    <div class="welcome-section visible" id="welcomeSection">
                        <div class="welcome-title">Ready to explore?</div>
                        <div class="welcome-subtitle">
                            Now viewing <strong>${selectedStationId.toUpperCase()}</strong> data.<br>
                            Select your desired filters and click "Apply" to load the data.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// === UI VISIBILITY CONTROL FUNCTIONS ===
function showWelcomeSection() {
    const welcomeSection = document.getElementById('welcomeSection');
    const statsGrid = document.getElementById('statsGrid');
    const dataTableContainer = document.getElementById('dataTableContainer');
    const chartsSection = document.getElementById('chartsSection');
    
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    
    if (welcomeSection) {
        welcomeSection.innerHTML = `
            <div class="welcome-title">Ready to explore?</div>
            <div class="welcome-subtitle">
                Now viewing <strong>${selectedStationId.toUpperCase()}</strong> data.<br>
                Select your desired filters and click "Apply" to load the data.
            </div>
        `;
        welcomeSection.classList.remove('hidden');
        welcomeSection.classList.add('visible');
    }
    
    // Hide all other sections
    if (statsGrid) {
        statsGrid.classList.remove('visible');
        statsGrid.classList.add('hidden');
    }
    if (dataTableContainer) {
        dataTableContainer.classList.remove('visible');
        dataTableContainer.classList.add('hidden');
    }
    if (chartsSection) {
        chartsSection.classList.remove('visible');
        chartsSection.classList.add('hidden');
    }
    
    // Reset filters applied state
    filtersApplied = false;
    
    console.log('✅ Welcome section shown, other sections hidden');
}

function showDashboardComponents() {
    const welcomeSection = document.getElementById('welcomeSection');
    const statsGrid = document.getElementById('statsGrid');
    const dataTableContainer = document.getElementById('dataTableContainer');
    const chartsSection = document.getElementById('chartsSection');
    
    // Hide welcome section
    if (welcomeSection) {
        welcomeSection.classList.remove('visible');
        welcomeSection.classList.add('hidden');
    }
    
    // Show all dashboard components
    if (statsGrid) {
        statsGrid.classList.remove('hidden');
        statsGrid.classList.add('visible');
    }
    if (dataTableContainer) {
        dataTableContainer.classList.remove('hidden');
        dataTableContainer.classList.add('visible');
    }
    if (chartsSection) {
        chartsSection.classList.remove('hidden');
        chartsSection.classList.add('visible');
    }
    
    console.log('✅ Dashboard components shown, welcome section hidden');
}

// === INITIALIZE DASHBOARD ===
export async function initializeDashboard() {
    console.log('Dashboard initializing...');
    
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = '../index.html';
        return;
    }
    
    const stationId = localStorage.getItem('stationId') || 'wkts';
    console.log('Initializing dashboard for station:', stationId);
    
    document.getElementById('app').innerHTML = renderDashboard();
    
    // ✅ ADD THIS: Load data FIRST before setting up listeners
    await loadDashboardData();
    
    // Setup all event listeners
    await setupAllEventListeners();
    
    // Ensure welcome section is shown initially
    showWelcomeSection();
    
    console.log('✅ Dashboard initialized successfully WITH DATA LOADED - showing welcome section only');
}

// === SETUP ALL EVENT LISTENERS ===
async function setupAllEventListeners() {
    console.log('🔧 Setting up all event listeners...');
    
    // Setup sidebar event listeners
    try {
        const { setupSidebarEventListeners } = await import('./sidebar.js');
        setupSidebarEventListeners();
        console.log('✅ Sidebar event listeners setup');
    } catch (error) {
        console.error('❌ Error setting up sidebar listeners:', error);
        setupFallbackSidebarListeners();
    }
    
    // Setup slicer event listeners
    try {
        const { setupSlicerEventListeners, initializeSlicers } = await import('./slicer.js');
        setupSlicerEventListeners();
        
        // Initialize slicers with current station data
        const stationId = localStorage.getItem('stationId') || 'wkts';
        const slicerOptions = await loadSlicerOptions(stationId);
        initializeSlicers(slicerOptions);
        
        console.log('✅ Slicer event listeners setup');
    } catch (error) {
        console.error('❌ Error setting up slicer listeners:', error);
    }
    
    // Setup table event listeners from charts.js
    try {
        const { setupTableEventListeners } = await import('./charts.js');
        setupTableEventListeners();
        console.log('✅ Table event listeners setup');
    } catch (error) {
        console.error('❌ Error setting up table listeners:', error);
    }
    
    // Setup Apply Filters button
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', handleApplyFilters);
        console.log('✅ Apply Filters button listener added');
    }
    
    console.log('✅ All event listeners setup complete');
}

// === FALLBACK SIDEBAR LISTENERS ===
function setupFallbackSidebarListeners() {
    console.log('🔄 Setting up fallback sidebar listeners...');
    
    // Station selection
    document.querySelectorAll('[data-station]').forEach(el => {
        if (el.dataset.station) {
            el.addEventListener('click', () => {
                console.log('Station clicked:', el.dataset.station);
                selectStation(el.dataset.station);
            });
        }
    });
    
    // All Stations button
    const allStationsBtn = document.getElementById('allStations');
    if (allStationsBtn) {
        allStationsBtn.addEventListener('click', () => {
            alert('All stations selection - Comparison feature coming soon!');
        });
    }
    
    // Action buttons
    const uploadCsvBtn = document.getElementById('uploadCsv');
    const logoutBtn = document.getElementById('logout');
    const monthlyStatsBtn = document.getElementById('monthlyStats');
    
    if (uploadCsvBtn) {
        uploadCsvBtn.addEventListener('click', () => {
            window.location.href = 'upload.html';
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    if (monthlyStatsBtn) {
        monthlyStatsBtn.addEventListener('click', () => {
            window.location.href = 'monthly-stats.html';
        });
    }
    
    console.log('✅ Fallback sidebar listeners setup');
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('stationId');
    localStorage.removeItem('stationName');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

// === LOAD AND INITIALIZE SLICERS ===
async function loadAndInitializeSlicers(stationId, initializeSlicers) {
    try {
        console.log(`🔄 Loading slicer options for station: ${stationId}`);
        const slicerOptions = await loadSlicerOptions(stationId);
        initializeSlicers(slicerOptions);
        console.log(`✅ Slicers updated for station: ${stationId}`);
    } catch (error) {
        console.error(`❌ Error initializing slicers for ${stationId}:`, error);
        const fallbackOptions = extractSlicerOptionsFromData(currentData);
        initializeSlicers(fallbackOptions);
    }
}

// === ENFORCE STATION CHECKBOX STATE ===
export function enforceStationCheckboxState() {
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    
    document.querySelectorAll('.station-item').forEach(item => {
        item.classList.remove('active');
        const checkbox = item.querySelector('.station-checkbox');
        if (checkbox) checkbox.classList.remove('checked');
    });
    
    const stationIdLower = selectedStationId.toLowerCase();
    const activeStation = document.querySelector(`[data-station="${stationIdLower}"]`);
    if (activeStation) {
        activeStation.classList.add('active');
        const checkbox = activeStation.querySelector('.station-checkbox');
        if (checkbox) checkbox.classList.add('checked');
    }
}

// === LOAD DASHBOARD DATA ===
export async function loadDashboardData() {
    try {
        const selectedStationId = localStorage.getItem('stationId') || 'wkts';
        const localStorageData = localStorage.getItem(getKey(selectedStationId));
        
        if (localStorageData) {
            currentData = JSON.parse(localStorageData);
            console.log(`Loaded ${currentData.length} records from localStorage for station ${selectedStationId}`);
        } else {
            const stationFile = selectedStationId.toLowerCase();
            const response = await fetch(`./data/${stationFile}.json`);
            if (response.ok) {
                currentData = await response.json();
                console.log(`Loaded ${currentData.length} records from JSON file for station ${selectedStationId}`);
            } else {
                currentData = [];
                console.log(`No data found for station ${selectedStationId}`);
            }
        }
        
        // Initialize filteredData as empty - only populate after applying filters
        filteredData = [];
        console.log(`📊 Initialized filteredData as empty - waiting for filters to be applied`);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        currentData = [];
        filteredData = [];
    }
}

// === FILTER APPLICATION ===
export async function handleApplyFilters() {
    console.log('🔄 Applying filters...');
    
    if (currentData.length === 0) {
        console.log('❌ No data available');
        const welcomeSection = document.getElementById('welcomeSection');
        if (welcomeSection) {
            welcomeSection.innerHTML = `
                <div class="welcome-title">No Data Available</div>
                <div class="welcome-subtitle">Please upload CSV data first using the "Upload Data" button.</div>
            `;
            welcomeSection.classList.remove('hidden');
            welcomeSection.classList.add('visible');
        }
        return;
    }
    
    // Show loading state
    const welcomeSection = document.getElementById('welcomeSection');
    if (welcomeSection) {
        welcomeSection.innerHTML = `<div style="color: #00ff88; font-size: 16px; font-weight: 600;">Applying filters...</div>`;
    }
    
    await updateCurrentFiltersFromUI();
    applyFilters();
    
    console.log(`✅ Filtered data: ${filteredData.length} records from ${currentData.length} total`);
    
    // Mark filters as applied
    filtersApplied = true;
    
    // Show dashboard components and hide welcome section
    showDashboardComponents();
    
    // Update all components with filtered data
    try {
        // Update stats cards from stats.js
        const { updateStatsCards } = await import('./stats.js');
        updateStatsCards();
    } catch (error) {
        console.error('❌ Error updating stats cards:', error);
    }
    
    // Update table and charts from charts.js
    try {
        const { updateDataTable, renderCharts } = await import('./charts.js');
        updateDataTable();
        renderCharts();
        console.log('✅ Table and charts updated with filtered data');
    } catch (error) {
        console.error('❌ Error updating table and charts:', error);
    }
    
    console.log('✅ All components updated with filtered data');
}

// === FILTERING LOGIC ===
function applyFilters() {
    console.log('🔍 Applying filters...');
    console.log('Current data count:', currentData.length);
    console.log('Current filters:', currentFilters);
    
    if (currentData.length === 0) {
        filteredData = [];
        return;
    }
    
    // Start with all data and apply filters
    filteredData = currentData.filter(record => {
        let passesFilter = true;
        
        // Date filter
        if (currentFilters.dateRange.start && currentFilters.dateRange.end) {
            const recordDate = convertToISODate(record.日期);
            if (recordDate) {
                if (recordDate < currentFilters.dateRange.start || recordDate > currentFilters.dateRange.end) {
                    passesFilter = false;
                }
            }
        }
        
        // Time filter
        if (passesFilter && currentFilters.timeRange.start && currentFilters.timeRange.end && record.入磅時間) {
            const recordTime = extractTimeForComparison(record.入磅時間);
            if (recordTime) {
                const filterStartTime = currentFilters.timeRange.start.replace(':', '');
                const filterEndTime = currentFilters.timeRange.end.replace(':', '');
                
                if (recordTime < filterStartTime || recordTime > filterEndTime) {
                    passesFilter = false;
                }
            }
        }
        
        // Delivery Status filter
        if (passesFilter && currentFilters.deliveryStatus.length > 0) {
            const recordStatus = record.交收狀態 || record['交收狀態'];
            if (recordStatus && !currentFilters.deliveryStatus.includes(recordStatus)) {
                passesFilter = false;
            }
        }
        
        // Vehicle Tasks filter
        if (passesFilter && currentFilters.vehicleTasks.length > 0) {
            const recordTask = record.車輛任務 || record['車輛任務'];
            if (recordTask && !currentFilters.vehicleTasks.includes(recordTask)) {
                passesFilter = false;
            }
        }
        
        // Waste Types filter
        if (passesFilter && currentFilters.wasteTypes.length > 0) {
            const recordWaste = record.廢物類別 || record['廢物類別'];
            if (recordWaste && !currentFilters.wasteTypes.includes(recordWaste)) {
                passesFilter = false;
            }
        }
        
        return passesFilter;
    });
    
    console.log(`✅ Filtering complete: ${filteredData.length} records passed filters`);
}

// === UPDATE FILTERS FROM UI ===
async function updateCurrentFiltersFromUI() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    if (startDateInput && endDateInput && startDateInput.value && endDateInput.value) {
        currentFilters.dateRange.start = startDateInput.value;
        currentFilters.dateRange.end = endDateInput.value;
    } else {
        currentFilters.dateRange.start = null;
        currentFilters.dateRange.end = null;
    }
    
    if (startTimeInput && endTimeInput) {
        currentFilters.timeRange.start = startTimeInput.value || '00:00';
        currentFilters.timeRange.end = endTimeInput.value || '23:59';
    }
    
    const { getSelectedDeliveryStatus, getSelectedVehicleTasks, getSelectedWasteType } = await import('./slicer.js');
    
    currentFilters.deliveryStatus = getSelectedDeliveryStatus();
    currentFilters.vehicleTasks = getSelectedVehicleTasks();
    currentFilters.wasteTypes = getSelectedWasteType();
    
    console.log('🔄 Updated filters from UI:', currentFilters);
}

// === DATE/TIME CONVERSION FUNCTIONS ===
function convertToISODate(dateString) {
    if (!dateString) return '';
    
    if (typeof dateString === 'string') {
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const [day, month, year] = parts;
                const fullYear = year.length === 2 ? `20${year}` : year;
                return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
        
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        if (dateString.includes('T')) return dateString.split('T')[0];
    }
    
    return '';
}

function extractTimeForComparison(timeString) {
    if (!timeString) return '0000';
    
    if (typeof timeString === 'string') {
        const timeParts = timeString.split(':');
        if (timeParts.length >= 2) {
            const hours = timeParts[0].padStart(2, '0');
            const minutes = timeParts[1].padStart(2, '0');
            return hours + minutes;
        }
        
        if (timeString.length === 4 && !timeString.includes(':')) return timeString;
        if (timeString.includes(':') && timeString.length === 5) return timeString.replace(':', '');
    }
    
    return '0000';
}

// === STATION SELECTION ===
export async function selectStation(stationId) {
    console.log('🔄 Selecting station:', stationId);
    
    const stationIdLower = stationId.toLowerCase();
    localStorage.setItem('stationId', stationIdLower);
    
    const station = stations.find(s => s.id.toLowerCase() === stationIdLower);
    if (station) localStorage.setItem('stationName', station.name);
    
    enforceStationCheckboxState();
    await loadDashboardData();
    
    const { initializeSlicers } = await import('./slicer.js');
    await loadAndInitializeSlicers(stationIdLower, initializeSlicers);
    
    updateHeaderStationTitle(stationIdLower);
    
    // Reset to welcome section when switching stations
    showWelcomeSection();
    
    resetFilters();
    console.log(`✅ Switched to station: ${stationId}`);
}

// === UPDATE HEADER STATION TITLE ===
function updateHeaderStationTitle(stationId) {
    const stationTitle = document.querySelector('.station-main-title');
    if (stationTitle) {
        const selectedStation = stations.find(s => s.id.toLowerCase() === stationId.toLowerCase());
        const stationName = selectedStation ? selectedStation.name : 'Unknown Station';
        const namePart = stationName.split(' - ')[0];
        stationTitle.textContent = namePart;
    }
}

// === RESET FILTERS FOR NEW STATION ===
function resetFilters() {
    currentFilters = {
        dateRange: { start: null, end: null },
        timeRange: { start: '00:00', end: '23:59' },
        deliveryStatus: [],
        vehicleTasks: [],
        wasteTypes: []
    };
    
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    
    if (startDate) startDate.value = getPastDate(7);
    if (endDate) endDate.value = new Date().toISOString().split('T')[0];
    if (startTime) startTime.value = '00:00';
    if (endTime) endTime.value = '23:59';
    
    console.log('🔄 Filters reset for new station');
}

// Add this function to dashboard.js to handle compressed data
function decompressRecords(compressedRecords) {
    if (!compressedRecords || compressedRecords.length === 0) return [];
    
    // Check if already decompressed (has full column names)
    if (compressedRecords[0].日期) {
        return compressedRecords;
    }
    
    // Reverse the column mapping
    const reverseMap = {
        'd': '日期',     // date
        's': '交收狀態', // status  
        'p': '車牌',     // plate
        't': '車輛任務', // task
        'tm': '入磅時間', // time
        'w': '物料重量',  // weight
        'wt': '廢物類別', // waste type
        'src': '來源'    // source
    };
    
    return compressedRecords.map(compressed => {
        const record = { StationId: compressed.st };
        Object.keys(compressed).forEach(shortKey => {
            if (shortKey !== 'st' && reverseMap[shortKey]) {
                record[reverseMap[shortKey]] = compressed[shortKey];
            }
        });
        return record;
    });
}

// Update your load function in dashboard.js:
export function load(station) { 
    const data = localStorage.getItem(getKey(station));
    if (!data) return [];
    
    try {
        const parsed = JSON.parse(data);
        return decompressRecords(parsed);
    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
