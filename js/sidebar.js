// sidebar.js - Fixed version without problematic imports
import { selectStation, applyFilters } from './dashboard.js';
import { setCurrentStation, updateStatsCards } from './stats.js';
import { setCurrentStation as setSlicerStation } from './slicer.js';

export function setupSidebarEventListeners() {
    console.log('Setting up sidebar event listeners...');
    
    // Station selection
    document.querySelectorAll('[data-station]').forEach(el => {
        if (el.dataset.station) {
            el.addEventListener('click', () => {
                console.log('Station clicked:', el.dataset.station);
                handleStationSelect(el.dataset.station);
            });
        }
    });
    
    // All Stations button
    const allStationsBtn = document.getElementById('allStations');
    if (allStationsBtn) {
        allStationsBtn.addEventListener('click', toggleAllStations);
    }
    
    // Action buttons
    const uploadCsvBtn = document.getElementById('uploadCsv');
    const logoutBtn = document.getElementById('logout');
    const monthlyStatsBtn = document.getElementById('monthlyStats');
    
    if (uploadCsvBtn) {
        uploadCsvBtn.addEventListener('click', uploadCSV);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    if (monthlyStatsBtn) {
        monthlyStatsBtn.addEventListener('click', () => {
            // Add active state to indicate current page
            document.querySelectorAll('.action-item').forEach(item => {
                item.classList.remove('active');
            });
            monthlyStatsBtn.classList.add('active');
            
            window.location.href = 'monthly-stats.html';
        });
    }
    
    console.log('✅ Sidebar event listeners setup complete');
}

function toggleAllStations() {
    alert('All stations selection - Comparison feature coming soon!');
}

function uploadCSV() {
    window.location.href = 'upload.html';
}

async function handleStationSelect(stationId) {
    console.log('🔄 Station selected:', stationId);
    
    // Update active state in sidebar
    updateSidebarActiveState(stationId);
    
    // Store in localStorage
    localStorage.setItem('stationId', stationId);
    
    // Update the page content for monthly stats
    updateMonthlyStatsForStation(stationId);
    
    console.log('✅ Station switched to:', stationId);
}

function updateSidebarActiveState(selectedStationId) {
    // Remove active class from all station items
    document.querySelectorAll('[data-station]').forEach(el => {
        el.classList.remove('active');
        const checkbox = el.querySelector('.station-checkbox');
        if (checkbox) checkbox.classList.remove('checked');
    });
    
    // Add active class to selected station
    const selectedStation = document.querySelector(`[data-station="${selectedStationId}"]`);
    if (selectedStation) {
        selectedStation.classList.add('active');
        const checkbox = selectedStation.querySelector('.station-checkbox');
        if (checkbox) checkbox.classList.add('checked');
    }
    
    console.log('✅ Updated sidebar active state for:', selectedStationId);
}

function updateMonthlyStatsForStation(stationId) {
    console.log('🔄 Updating monthly stats for station:', stationId);
    
    // Import stations to get full station names
    import('./utils.js').then(({ stations }) => {
        const selectedStation = stations.find(s => s.id.toLowerCase() === stationId.toLowerCase());
        const stationName = selectedStation ? selectedStation.name : 'Unknown Station';
        const namePart = stationName.split(' - ')[0];
        
        // Update the header with new station name
        const headerTitle = document.querySelector('.monthly-stats-header h1');
        if (headerTitle) {
            headerTitle.textContent = `Monthly Statistics - ${namePart}`;
        }
        
        // Update any other elements that show station info
        updateStationInContent(stationId, namePart);
        
        // Reload current data for new station
        const monthSelect = document.getElementById('monthSelect');
        if (monthSelect && monthSelect.value) {
            // Trigger change event to reload data
            monthSelect.dispatchEvent(new Event('change'));
        } else {
            // If no month selected, update the placeholder
            const statsContent = document.getElementById('monthlyStatsContent');
            if (statsContent) {
                statsContent.innerHTML = `
                    <div class="monthly-table-placeholder">
                        <p>Select a month to view ${namePart} monthly statistics</p>
                    </div>
                `;
            }
        }
    }).catch(error => {
        console.error('Error importing stations:', error);
        // Fallback using just the station ID
        const headerTitle = document.querySelector('.monthly-stats-header h1');
        if (headerTitle) {
            headerTitle.textContent = `Monthly Statistics - ${stationId.toUpperCase()}`;
        }
    });
}

function updateStationInContent(stationId, stationName) {
    // Update any table titles or content that shows station name
    const tableTitles = document.querySelectorAll('.monthly-table-title');
    tableTitles.forEach(title => {
        const currentText = title.textContent;
        // Extract the month/year part and keep it, only change station name
        if (currentText.includes('Daily Transaction Log')) {
            const monthMatch = currentText.match(/for (\w+) \d{4}/);
            const year = new Date().getFullYear();
            if (monthMatch) {
                title.textContent = `Daily Transaction Log for MSW and GTW for ${monthMatch[1]} ${year} - ${stationName}`;
            }
        }
    });
    
    // Update any other station references in the content
    console.log('✅ Updated content for station:', stationName);
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('stationId');
    localStorage.removeItem('stationName');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}