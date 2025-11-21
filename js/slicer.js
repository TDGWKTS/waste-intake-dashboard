import { currentFilters, formatTimeInput, loadSlicerOptions } from './dashboard.js';

// Add this global variable to track current station
let currentStation = localStorage.getItem('stationId') || 'wkts';

export function setupSlicerEventListeners() {
    console.log('🔧 Setting up slicer event listeners...');
    
    // Time input formatting
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    if (startTimeInput) {
        startTimeInput.addEventListener('input', (e) => {
            if (e.target.value.length === 4 && /^\d+$/.test(e.target.value)) {
                e.target.value = formatTimeInput(e.target.value);
            }
        });
        
        startTimeInput.addEventListener('blur', (e) => {
            e.target.value = formatTimeInput(e.target.value);
        });
    }
    
    if (endTimeInput) {
        endTimeInput.addEventListener('input', (e) => {
            if (e.target.value.length === 4 && /^\d+$/.test(e.target.value)) {
                e.target.value = formatTimeInput(e.target.value);
            }
        });
        
        endTimeInput.addEventListener('blur', (e) => {
            e.target.value = formatTimeInput(e.target.value);
        });
    }
    
    // Initialize dropdown toggles with responsive support
    setupDropdownToggle('deliveryStatusSelect', 'deliveryStatusDropdown');
    setupDropdownToggle('vehicleTasksSelect', 'vehicleTasksDropdown');
    setupDropdownToggle('wasteTypeSelect', 'wasteTypeDropdown');
    
    // Add responsive event listeners
    setupResponsiveBehavior();
    
    console.log('✅ Slicer event listeners setup complete');
}

// === RESPONSIVE BEHAVIOR SETUP ===
function setupResponsiveBehavior() {
    // Handle window resize for responsive adjustments
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            adjustDropdownsForMobile();
            closeAllDropdowns(); // Close dropdowns on resize for better mobile experience
        }, 250);
    });
    
    // Initial adjustment
    adjustDropdownsForMobile();
}

function adjustDropdownsForMobile() {
    const isMobile = window.innerWidth <= 768;
    const dropdowns = document.querySelectorAll('.dropdown-content');
    
    dropdowns.forEach(dropdown => {
        if (isMobile) {
            // Add mobile-specific classes
            dropdown.classList.add('mobile-dropdown');
            // Ensure dropdowns don't exceed viewport width
            dropdown.style.maxWidth = `${window.innerWidth - 40}px`;
        } else {
            dropdown.classList.remove('mobile-dropdown');
            dropdown.style.maxWidth = '';
        }
    });
}

// === STATION MANAGEMENT ===
export function setCurrentStation(stationId) {
    console.log('🔄 Setting current station to:', stationId);
    currentStation = stationId.toLowerCase();
    localStorage.setItem('stationId', currentStation);
    
    // Reload slicer options for the new station
    reloadSlicerOptions();
}

async function reloadSlicerOptions() {
    console.log('🔄 Reloading slicer options for station:', currentStation);
    try {
        const slicerOptions = await loadSlicerOptions(currentStation);
        await initializeSlicers(slicerOptions);
        console.log('✅ Slicer options reloaded for station:', currentStation);
    } catch (error) {
        console.error('❌ Failed to reload slicer options:', error);
    }
}

// === IMPROVED DROPDOWN MANAGEMENT ===
function setupDropdownToggle(selectId, dropdownId) {
    const select = document.getElementById(selectId);
    const dropdown = document.getElementById(dropdownId);
    
    if (!select || !dropdown) {
        console.error(`❌ Dropdown elements not found: ${selectId}, ${dropdownId}`);
        return;
    }
    
    console.log(`🔧 Setting up dropdown: ${selectId} -> ${dropdownId}`);
    
    // Initially hide dropdown
    dropdown.style.display = 'none';
    
    // Remove any existing event listeners to prevent duplicates
    select.replaceWith(select.cloneNode(true));
    const freshSelect = document.getElementById(selectId);
    
    freshSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        console.log(`🖱️ Clicked ${selectId}`);
        
        // Close all other dropdowns first
        closeAllDropdowns();
        
        // Toggle current dropdown
        const isVisible = dropdown.style.display === 'block';
        console.log(`📋 Dropdown ${dropdownId} currently visible: ${isVisible}`);
        
        if (isVisible) {
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
        } else {
            dropdown.style.display = 'block';
            dropdown.classList.add('show');
            
            // Adjust position for mobile
            if (window.innerWidth <= 768) {
                positionDropdownForMobile(dropdown, freshSelect);
            }
        }
        
        console.log(`🔄 Dropdown ${dropdownId} now visible: ${!isVisible}`);
    });
    
    // Improved click outside handler
    document.addEventListener('click', (e) => {
        if (!freshSelect.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
            dropdown.classList.remove('show');
            console.log(`❌ Closed ${dropdownId} (clicked outside)`);
        }
    });
    
    // Prevent dropdown from closing when clicking inside
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`🔒 Keeping ${dropdownId} open (clicked inside)`);
    });
}

function positionDropdownForMobile(dropdown, select) {
    const selectRect = select.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Check if there's enough space below the select
    const spaceBelow = viewportHeight - selectRect.bottom;
    const dropdownHeight = Math.min(400, spaceBelow - 20); // Reserve some space
    
    if (spaceBelow < 200) {
        // Not enough space below, position above
        dropdown.style.bottom = '100%';
        dropdown.style.top = 'auto';
        dropdown.style.maxHeight = `${selectRect.top - 20}px`;
    } else {
        // Position below with available space
        dropdown.style.top = '100%';
        dropdown.style.bottom = 'auto';
        dropdown.style.maxHeight = `${spaceBelow - 20}px`;
    }
    
    // Ensure dropdown doesn't overflow horizontally
    dropdown.style.left = '0';
    dropdown.style.right = '0';
    dropdown.style.width = '100%';
}

function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    dropdowns.forEach(dropdown => {
        dropdown.style.display = 'none';
        dropdown.classList.remove('show');
        // Reset positioning
        dropdown.style.top = '';
        dropdown.style.bottom = '';
        dropdown.style.maxHeight = '';
    });
    console.log('🚪 Closed all dropdowns');
}

// === INITIALIZE SLICERS WITH DATA FROM JSON ===
export async function initializeSlicers(slicerOptions) {
    console.log('🎯 Initializing slicers with options:', {
        deliveryStatus: slicerOptions.deliveryStatus?.length || 0,
        vehicleTasks: slicerOptions.vehicleTasks?.length || 0,
        wasteType: slicerOptions.wasteType?.length || 0
    });
    
    // If no options provided, try to load from current station
    if (!slicerOptions || (!slicerOptions.deliveryStatus && !slicerOptions.vehicleTasks && !slicerOptions.wasteType)) {
        console.log('🔄 No slicer options provided, loading from current station...');
        try {
            slicerOptions = await loadSlicerOptions(currentStation);
            console.log('✅ Loaded slicer options from station data:', {
                deliveryStatus: slicerOptions.deliveryStatus?.length || 0,
                vehicleTasks: slicerOptions.vehicleTasks?.length || 0,
                wasteType: slicerOptions.wasteType?.length || 0
            });
        } catch (error) {
            console.error('❌ Failed to load slicer options:', error);
            slicerOptions = {
                deliveryStatus: [],
                vehicleTasks: [],
                wasteType: []
            };
        }
    }
    
    // Update select display counts
    updateSelectDisplayCount('deliveryStatusSelect', slicerOptions.deliveryStatus?.length || 0, 'Delivery Status');
    updateSelectDisplayCount('vehicleTasksSelect', slicerOptions.vehicleTasks?.length || 0, 'Vehicle Tasks');
    updateSelectDisplayCount('wasteTypeSelect', slicerOptions.wasteType?.length || 0, 'Waste Type');
    
    // Populate dropdowns with actual data
    populateDropdown('deliveryStatusDropdown', slicerOptions.deliveryStatus || [], 'deliveryStatus');
    populateDropdown('vehicleTasksDropdown', slicerOptions.vehicleTasks || [], 'vehicleTasks');
    populateDropdown('wasteTypeDropdown', slicerOptions.wasteType || [], 'wasteType');
    
    console.log('✅ Slicers initialized with station data');
}

function updateSelectDisplayCount(selectId, count, displayName) {
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `<option value="">${displayName} (${count})</option>`;
        console.log(`📊 Updated ${selectId} with ${count} options`);
    }
}

function populateDropdown(dropdownId, values, type) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        console.error(`❌ Dropdown element not found: ${dropdownId}`);
        return;
    }
    
    console.log(`📝 Populating ${dropdownId} with ${values.length} ${type} values:`, values);
    
    // Clear existing content
    dropdown.innerHTML = '';
    
    // Add "All" option
    const allItem = document.createElement('div');
    allItem.className = 'dropdown-item all-option active';
    allItem.setAttribute('data-type', type);
    allItem.innerHTML = `
        <div class="dropdown-checkbox"></div>
        All
    `;
    dropdown.appendChild(allItem);
    
    // Add individual value options
    if (values && values.length > 0) {
        values.forEach(value => {
            const valueItem = document.createElement('div');
            valueItem.className = 'dropdown-item';
            valueItem.setAttribute('data-value', value);
            valueItem.setAttribute('data-type', type);
            valueItem.innerHTML = `
                <div class="dropdown-checkbox"></div>
                ${value}
            `;
            dropdown.appendChild(valueItem);
        });
    } else {
        // Show "No options available" if no values
        const noDataItem = document.createElement('div');
        noDataItem.className = 'dropdown-item no-data';
        noDataItem.innerHTML = `
            <div class="dropdown-checkbox"></div>
            No options available
        `;
        dropdown.appendChild(noDataItem);
    }
    
    // Add click handlers to dropdown items
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.onclick = (e) => {
            e.stopPropagation();
            if (!item.classList.contains('no-data')) {
                console.log(`✅ Selected: ${item.textContent}`);
                handleDropdownSelection(item, type);
            }
        };
    });
    
    console.log(`✅ ${dropdownId} populated with ${values.length} items`);
}

function handleDropdownSelection(item, type) {
    const dropdown = item.closest('.dropdown-content');
    const allOption = dropdown.querySelector('.all-option');
    
    if (item === allOption) {
        // Toggle all options
        const isActive = allOption.classList.contains('active');
        dropdown.querySelectorAll('.dropdown-item').forEach(i => {
            if (!i.classList.contains('no-data')) {
                i.classList.toggle('active', !isActive);
            }
        });
        console.log(`🔄 Toggled ALL ${type} options: ${!isActive}`);
    } else {
        // Toggle individual option
        item.classList.toggle('active');
        console.log(`✅ Toggled ${type}: ${item.dataset.value}`);
        
        // Update "All" option state
        const allSelected = Array.from(dropdown.querySelectorAll('.dropdown-item:not(.all-option):not(.no-data)'))
            .every(i => i.classList.contains('active'));
        allOption.classList.toggle('active', allSelected);
    }
    
    updateSelectDisplay(type);
    updateFilterState(type);
}

function updateSelectDisplay(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const select = document.getElementById(`${type}Select`);
    
    if (!dropdown || !select) return;
    
    const selectedItems = dropdown.querySelectorAll('.dropdown-item:not(.all-option):not(.no-data).active');
    const totalItems = dropdown.querySelectorAll('.dropdown-item:not(.all-option):not(.no-data)').length;
    
    const displayName = type === 'deliveryStatus' ? 'Delivery Status' : 
                       type === 'vehicleTasks' ? 'Vehicle Tasks' : 'Waste Type';
    
    if (selectedItems.length === 0 || dropdown.querySelector('.all-option').classList.contains('active')) {
        select.innerHTML = `<option value="">${displayName} (${totalItems})</option>`;
    } else {
        select.innerHTML = `<option value="">${displayName} (${selectedItems.length})</option>`;
    }
    
    console.log(`📊 Updated ${type} display: ${selectedItems.length}/${totalItems} selected`);
}

function updateFilterState(type) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    if (!dropdown) return;
    
    const selectedItems = dropdown.querySelectorAll('.dropdown-item:not(.all-option):not(.no-data).active');
    const selectedValues = Array.from(selectedItems).map(item => item.dataset.value);
    
    // Update the correct property name based on type
    let filterProperty;
    switch(type) {
        case 'deliveryStatus':
            filterProperty = 'deliveryStatus';
            break;
        case 'vehicleTasks':
            filterProperty = 'vehicleTasks';
            break;
        case 'wasteType':
            filterProperty = 'wasteTypes'; // Note: this is 'wasteTypes' (plural) in dashboard.js
            break;
        default:
            filterProperty = type;
    }
    
    currentFilters[filterProperty] = selectedValues;
    console.log(`🎛️ Updated ${filterProperty} filters:`, selectedValues);
}

// === GET SELECTED VALUES FUNCTIONS ===
export function getSelectedDeliveryStatus() {
    const dropdown = document.getElementById('deliveryStatusDropdown');
    if (!dropdown) return [];
    
    const selectedItems = dropdown.querySelectorAll('.dropdown-item.active:not(.all-option):not(.no-data)');
    return Array.from(selectedItems).map(item => item.getAttribute('data-value'));
}

export function getSelectedVehicleTasks() {
    const dropdown = document.getElementById('vehicleTasksDropdown');
    if (!dropdown) return [];
    
    const selectedItems = dropdown.querySelectorAll('.dropdown-item.active:not(.all-option):not(.no-data)');
    return Array.from(selectedItems).map(item => item.getAttribute('data-value'));
}

export function getSelectedWasteType() {
    const dropdown = document.getElementById('wasteTypeDropdown');
    if (!dropdown) return [];
    
    const selectedItems = dropdown.querySelectorAll('.dropdown-item.active:not(.all-option):not(.no-data)');
    return Array.from(selectedItems).map(item => item.getAttribute('data-value'));
}

// === FILTER APPLICATION ===
export async function applyFilters() {
    console.log('🎯 Applying filters from slicer...');
    const { handleApplyFilters } = await import('./dashboard.js');
    handleApplyFilters();
}

// Add this CSS to your slicer.css for mobile support:
/*
.mobile-dropdown {
    position: fixed !important;
    left: 20px !important;
    right: 20px !important;
    width: auto !important;
    max-width: calc(100vw - 40px) !important;
    z-index: 10003 !important;
}
*/

// Debug function
export function debugSlicers() {
    console.log('=== 🐛 SLICER DEBUG INFO ===');
    
    const dropdowns = [
        'deliveryStatusSelect', 'deliveryStatusDropdown',
        'vehicleTasksSelect', 'vehicleTasksDropdown', 
        'wasteTypeSelect', 'wasteTypeDropdown'
    ];
    
    dropdowns.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element ? '✅ EXISTS' : '❌ MISSING');
        if (element) {
            console.log(`  - display: ${element.style.display}`);
            console.log(`  - classList:`, Array.from(element.classList));
            console.log(`  - children: ${element.children.length}`);
            
            if (element.children.length > 0) {
                console.log(`  - content:`, Array.from(element.children).map(child => child.textContent.trim()));
            }
        }
    });
    
    console.log('Current filters:', currentFilters);
    
    // Show selected values
    console.log('Selected Delivery Status:', getSelectedDeliveryStatus());
    console.log('Selected Vehicle Tasks:', getSelectedVehicleTasks());
    console.log('Selected Waste Types:', getSelectedWasteType());
    
    // Show available options
    const deliveryDropdown = document.getElementById('deliveryStatusDropdown');
    if (deliveryDropdown) {
        const options = Array.from(deliveryDropdown.querySelectorAll('.dropdown-item:not(.all-option):not(.no-data)'))
            .map(item => item.textContent.trim());
        console.log('Available Delivery Status options:', options);
    }
}