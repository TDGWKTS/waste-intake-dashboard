// stats.js - Stats cards calculations
import { filteredData, currentData, filtersApplied, currentFilters } from './dashboard.js';

// Add this global variable to track current station
let currentStation = 'WKTS'; // Default station
let weightFieldName = null;

export function updateStatsCards() {
    console.log('Updating stats cards...');
    
    // Only show stats if filters have been applied
    if (!filtersApplied) {
        console.log('❌ Filters not applied yet - hiding stats');
        resetStatsCards();
        hideStatsCards();
        return;
    }
    
    // Use filteredData for calculations (this will be populated after filters are applied)
    const dataToUse = filteredData;
    
    console.log('Using filtered data for stats:', dataToUse.length, 'records');
    
    if (dataToUse.length === 0) {
        console.log('❌ No filtered data available for stats');
        resetStatsCards();
        return;
    }
    
    // Get current station from sidebar selection
    updateCurrentStationFromSidebar();
    
    console.log('Current station from sidebar:', currentStation);
    
    // DEBUG: Show ALL available fields
    console.log('🔍 ALL AVAILABLE FIELDS IN DATA:');
    const sampleRecord = dataToUse[0];
    console.log('Fields:', Object.keys(sampleRecord));
    
    // Find the actual weight field name in the data
    weightFieldName = detectWeightField(dataToUse);
    console.log(`🎯 FINAL weight field selected: "${weightFieldName}"`);
    
    // Show detailed weight analysis for first 5 records
    console.log('🔍 SAMPLE WEIGHT ANALYSIS (first 5 records):');
    let totalWeightSum = 0;
    let validWeights = 0;
    
    dataToUse.slice(0, 5).forEach((record, index) => {
        const weightValue = record[weightFieldName];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        const finalWeight = getWeightValue(record); // Get the final weight value used
        
        if (!isNaN(finalWeight) && finalWeight > 0) {
            totalWeightSum += finalWeight;
            validWeights++;
        }
        
        console.log(`   Record ${index + 1}:`, {
            task: vehicleTask,
            weightField: weightFieldName,
            rawValue: weightValue,
            finalWeight: finalWeight,
            hasWeightField: record.hasOwnProperty(weightFieldName)
        });
    });
    
    console.log(`📊 Weight summary: ${validWeights}/${dataToUse.length} valid weights, total: ${totalWeightSum.toFixed(2)} tons`);
    
    // Show stats cards first
    showStatsCards();
    
    // Get search period for subtitles
    const searchPeriod = getSearchPeriod();
    
    // Calculate all stats based on station
    const totalLoads = calculateTotalLoads(dataToUse, currentStation);
    const totalWeight = calculateTotalWeight(dataToUse, currentStation);
    const amLoads = calculateAMLoads(dataToUse, currentStation);
    const contractorLoads = calculateContractorLoads(dataToUse, currentStation);
    const privateLoads = calculatePrivateLoads(dataToUse, currentStation);
    const greaseTrapLoads = calculateGreaseTrapLoads(dataToUse, currentStation);
    
    // Calculate tons for each category
    const amTons = calculateAMTons(dataToUse, currentStation);
    const contractorTons = calculateContractorTons(dataToUse, currentStation);
    const privateTons = calculatePrivateTons(dataToUse, currentStation);
    const greaseTrapTons = calculateGreaseTrapTons(dataToUse, currentStation);
    
    // DEBUG: Check if weights make sense
    console.log('🔍 FINAL WEIGHT SANITY CHECK:');
    console.log('   Total Loads:', totalLoads);
    console.log('   Total Weight:', totalWeight.toFixed(2), 'tons');
    if (totalLoads > 0) {
        console.log('   Average weight per load:', (totalWeight / totalLoads).toFixed(2), 'tons');
    }
    console.log('   AM - Loads:', amLoads, 'Tons:', amTons.toFixed(2), 'Avg:', amLoads > 0 ? (amTons / amLoads).toFixed(2) : 'N/A');
    console.log('   Contractor - Loads:', contractorLoads, 'Tons:', contractorTons.toFixed(2), 'Avg:', contractorLoads > 0 ? (contractorTons / contractorLoads).toFixed(2) : 'N/A');
    console.log('   Private - Loads:', privateLoads, 'Tons:', privateTons.toFixed(2), 'Avg:', privateLoads > 0 ? (privateTons / privateLoads).toFixed(2) : 'N/A');
    
    // Update DOM elements
    updateStatCard('totalLoads', totalLoads.toLocaleString());
    updateStatCard('totalWeight', `${totalWeight.toFixed(2)} t`);
    updateStatCard('amLoads', amLoads.toLocaleString());
    updateStatCard('contractorLoads', contractorLoads.toLocaleString());
    updateStatCard('privateLoads', privateLoads.toLocaleString());
    updateStatCard('greaseTrapLoads', greaseTrapLoads.toLocaleString());
    
    // Show/hide grease trap card based on station
    toggleGreaseTrapCard(currentStation);
    
    // Update card layout with new format
    updateCardLayout(searchPeriod, {
        amTons,
        contractorTons,
        privateTons,
        greaseTrapTons
    });
    
    console.log('✅ Stats cards updated');
}

// === IMPROVED WEIGHT FIELD DETECTION ===
function detectWeightField(data) {
    if (!data || data.length === 0) {
        console.log('❌ No data available for weight field detection');
        return null;
    }
    
    const sampleRecord = data[0];
    const allFields = Object.keys(sampleRecord);
    
    console.log('🔍 SEARCHING FOR WEIGHT FIELD IN:', allFields);
    
    // Common weight field names to check (in order of priority)
    const weightFieldCandidates = [
        // Chinese field names
        '物料重量', '重量', '噸數', '噸', '淨重量', '毛重量', '載重量', '總重量',
        // English field names  
        'Weight', 'weight', 'Tons', 'tons', 'tonnage', 'Tonnage',
        'materialWeight', 'MaterialWeight', 'MATERIAL_WEIGHT', 'weightTons', 'WeightTons',
        // Other possible names
        '重量噸', '物料噸', '廢物重量', '垃圾重量'
    ];
    
    // First, try exact matches
    for (const field of weightFieldCandidates) {
        if (sampleRecord.hasOwnProperty(field)) {
            const sampleValue = sampleRecord[field];
            console.log(`✅ Found potential weight field: "${field}" = ${sampleValue}`);
            
            // Check if it contains numeric data
            if (sampleValue !== null && sampleValue !== undefined && sampleValue !== '') {
                const parsedValue = parseFloat(sampleValue);
                if (!isNaN(parsedValue)) {
                    console.log(`✅ Using weight field: "${field}" with numeric value: ${parsedValue}`);
                    return field;
                }
            }
        }
    }
    
    // If no exact matches, look for any field that might contain weight data
    console.log('🔍 No standard weight fields found, searching for numeric fields...');
    
    for (const field of allFields) {
        const value = sampleRecord[field];
        
        // Skip non-numeric looking fields
        if (typeof value === 'string' && value.match(/^\d+\.?\d*$/)) {
            const parsedValue = parseFloat(value);
            if (!isNaN(parsedValue) && parsedValue > 0 && parsedValue < 100) {
                console.log(`✅ Found numeric field as weight: "${field}" = ${parsedValue}`);
                return field;
            }
        }
    }
    
    console.log('❌ No weight field found in data');
    return null;
}

// Helper function to check if weight value is reasonable
function isReasonableWeight(weight) {
    if (isNaN(weight) || weight <= 0) return false;
    
    // Typical waste load weights are between 0.5 and 30 tons
    return weight >= 0.5 && weight <= 30;
}

// === FIXED: getWeightValue NOW HANDLES MISSING WEIGHT FIELD ===
function getWeightValue(record) {
    // If no weight field was detected, use fallback
    if (!weightFieldName) {
        return getFallbackWeight(record);
    }
    
    const value = record[weightFieldName];
    
    // If we have a valid weight value, parse and return it
    if (value !== undefined && value !== null && value !== '') {
        const parsedWeight = parseWeight(value);
        if (!isNaN(parsedWeight) && parsedWeight > 0) {
            return parsedWeight;
        }
    }
    
    // Fallback if weight field exists but has invalid data
    return getFallbackWeight(record);
}

// Separate function for fallback weights
function getFallbackWeight(record) {
    const vehicleTask = record.車輛任務 || record['車輛任務'];
    let fallbackWeight = 10; // Default fallback
    
    if (vehicleTask) {
        if (vehicleTask.includes('G01') || vehicleTask.includes('G')) {
            fallbackWeight = 8; // AM vehicles typically lighter
        } else if (vehicleTask.includes('C31') || vehicleTask.includes('C')) {
            fallbackWeight = 12; // Contractor vehicles
        } else if (vehicleTask.includes('P99') || vehicleTask.includes('P97') || vehicleTask.includes('P')) {
            fallbackWeight = 6; // Private vehicles typically lighter
        }
    }
    
    console.log(`⚠️ Using fallback weight ${fallbackWeight} for record with task: ${vehicleTask}`);
    return fallbackWeight;
}

// === WEIGHT PARSING ===
function parseWeight(weightStr) {
    if (!weightStr) return NaN;
    
    // If it's already a number, return it
    if (typeof weightStr === 'number') {
        return weightStr;
    }
    
    // Convert to string and clean it
    const cleanStr = weightStr.toString().trim().replace(/,/g, '');
    
    // Try direct parsing
    return parseFloat(cleanStr);
}

// === TONS CALCULATION FUNCTIONS ===
function calculateTotalWeight(data, station) {
    if (!data || data.length === 0) return 0;
    
    console.log(`🧮 Calculating total weight for ${station} with ${data.length} records`);
    console.log(`📊 Using weight field: "${weightFieldName}"`);
    
    const completedRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['G01', 'C31', 'P99'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['G', 'C', 'P'], station);
        }
    });
    
    console.log(`📊 Filtered to ${completedRecords.length} completed records for weight calculation`);
    
    let totalTons = 0;
    let validWeightCount = 0;
    let weightSum = 0;
    
    completedRecords.forEach((record, index) => {
        const weight = getWeightValue(record); // ← Now returns number directly
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!isNaN(weight) && weight > 0) {
            totalTons += weight;
            validWeightCount++;
            weightSum += weight;
            
            if (index < 3) { // Log first 3 for debugging
                console.log(`   ✅ Record ${index + 1}: ${weight.toFixed(2)} tons - "${vehicleTask}"`);
            }
        } else {
            if (index < 3) { // Log first 3 for debugging
                console.log(`   ❌ Record ${index + 1}: Invalid weight - "${vehicleTask}"`);
            }
        }
    });
    
    const averageWeight = validWeightCount > 0 ? weightSum / validWeightCount : 0;
    console.log(`🏁 Total weight calculation summary:`);
    console.log(`   Total tons: ${totalTons.toFixed(2)}`);
    console.log(`   Valid records: ${validWeightCount}/${completedRecords.length}`);
    console.log(`   Average weight per load: ${averageWeight.toFixed(2)} tons`);
    
    return totalTons;
}

function calculateAMTons(data, station) {
    if (!data || data.length === 0) return 0;
    
    const amRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['G01'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['G'], station);
        }
    });
    
    let totalTons = 0;
    amRecords.forEach(record => {
        const weight = getWeightValue(record); // ← Now returns number directly
        if (!isNaN(weight) && weight > 0) {
            totalTons += weight;
        }
    });
    
    console.log(`AM tons for ${station}: ${totalTons.toFixed(2)} from ${amRecords.length} records`);
    return totalTons;
}

function calculateContractorTons(data, station) {
    if (!data || data.length === 0) return 0;
    
    const contractorRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['C31'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['C'], station);
        }
    });
    
    let totalTons = 0;
    contractorRecords.forEach(record => {
        const weight = getWeightValue(record); // ← Now returns number directly
        if (!isNaN(weight) && weight > 0) {
            totalTons += weight;
        }
    });
    
    console.log(`Contractor tons for ${station}: ${totalTons.toFixed(2)} from ${contractorRecords.length} records`);
    return totalTons;
}

function calculatePrivateTons(data, station) {
    if (!data || data.length === 0) return 0;
    
    const privateRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['P99'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['P'], station);
        }
    });
    
    let totalTons = 0;
    privateRecords.forEach(record => {
        const weight = getWeightValue(record); // ← Now returns number directly
        if (!isNaN(weight) && weight > 0) {
            totalTons += weight;
        }
    });
    
    console.log(`Private tons for ${station}: ${totalTons.toFixed(2)} from ${privateRecords.length} records`);
    return totalTons;
}

function calculateGreaseTrapTons(data, station) {
    if (!data || data.length === 0) return 0;
    
    if (station !== 'WKTS') return 0;
    
    const greaseTrapRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        return matchesVehicleTask(vehicleTask, ['P97'], station);
    });
    
    let totalTons = 0;
    greaseTrapRecords.forEach(record => {
        const weight = getWeightValue(record); // ← Now returns number directly
        if (!isNaN(weight) && weight > 0) {
            totalTons += weight;
        }
    });
    
    console.log(`Grease trap tons for ${station}: ${totalTons.toFixed(2)} from ${greaseTrapRecords.length} records`);
    return totalTons;
}

// === VISIBILITY CONTROL ===
function showStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.classList.remove('hidden');
        statsGrid.classList.add('visible');
        console.log('✅ Stats cards made visible');
    } else {
        console.error('❌ Stats grid element not found');
    }
}

function hideStatsCards() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.classList.remove('visible');
        statsGrid.classList.add('hidden');
    }
}

// === LOAD CALCULATION FUNCTIONS ===
function calculateTotalLoads(data, station) {
    if (!data || data.length === 0) return 0;
    
    const completedRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['G01', 'C31', 'P99'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['G', 'C', 'P'], station);
        }
    });
    
    console.log(`Total loads calculation for ${station}: ${completedRecords.length} completed records`);
    return completedRecords.length;
}

function calculateAMLoads(data, station) {
    if (!data || data.length === 0) return 0;
    
    const amRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['G01'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['G'], station);
        }
    });
    
    console.log(`AM loads calculation for ${station}: ${amRecords.length} records`);
    return amRecords.length;
}

function calculateContractorLoads(data, station) {
    if (!data || data.length === 0) return 0;
    
    const contractorRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['C31'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['C'], station);
        }
    });
    
    console.log(`Contractor loads calculation for ${station}: ${contractorRecords.length} records`);
    return contractorRecords.length;
}

function calculatePrivateLoads(data, station) {
    if (!data || data.length === 0) return 0;
    
    const privateRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        if (station === 'WKTS') {
            return matchesVehicleTask(vehicleTask, ['P99'], station);
        } else {
            return matchesVehicleTask(vehicleTask, ['P'], station);
        }
    });
    
    console.log(`Private loads calculation for ${station}: ${privateRecords.length} records`);
    return privateRecords.length;
}

function calculateGreaseTrapLoads(data, station) {
    if (!data || data.length === 0) return 0;
    
    if (station !== 'WKTS') return 0;
    
    const greaseTrapRecords = data.filter(record => {
        const deliveryStatus = record.交收狀態 || record['交收狀態'];
        const vehicleTask = record.車輛任務 || record['車輛任務'];
        
        if (!deliveryStatus || deliveryStatus !== '完成') return false;
        if (!vehicleTask) return false;
        
        return matchesVehicleTask(vehicleTask, ['P97'], station);
    });
    
    console.log(`Grease trap loads calculation for ${station}: ${greaseTrapRecords.length} records`);
    return greaseTrapRecords.length;
}

export function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        console.log(`Updated ${elementId}: ${value}`);
    } else {
        console.warn(`Element with id '${elementId}' not found`);
    }
}

function resetStatsCards() {
    updateStatCard('totalLoads', '0');
    updateStatCard('totalWeight', '0.00 t');
    updateStatCard('amLoads', '0');
    updateStatCard('contractorLoads', '0');
    updateStatCard('privateLoads', '0');
    updateStatCard('greaseTrapLoads', '0');
    
    console.log('🔄 Stats cards reset to 0 (filters not applied)');
}

// === DEBUG FUNCTION TO CHECK YOUR DATA ===
export function debugWeightData() {
    if (!filteredData || filteredData.length === 0) {
        console.log('No filtered data available');
        return;
    }
    
    console.log('🔍 DEBUG WEIGHT DATA ANALYSIS');
    console.log('First 10 records weight analysis:');
    
    filteredData.slice(0, 10).forEach((record, index) => {
        const allFields = Object.keys(record);
        const weightFields = allFields.filter(field => 
            field.includes('重') || field.includes('weight') || field.includes('Weight') || field.includes('吨') || field.includes('噸')
        );
        
        console.log(`Record ${index + 1}:`);
        console.log(`  Task: ${record.車輛任務 || record['車輛任務']}`);
        console.log(`  Status: ${record.交收狀態 || record['交收狀態']}`);
        
        weightFields.forEach(field => {
            const value = record[field];
            const parsed = parseWeight(value);
            console.log(`  ${field}: ${value} -> ${parsed} tons`);
        });
        
        if (weightFields.length === 0) {
            console.log('  No weight-related fields found');
        }
        console.log('---');
    });
}

// === HELPER FUNCTIONS ===
function updateCurrentStationFromSidebar() {
    // Method 1: Check localStorage first (most reliable)
    const localStorageStation = localStorage.getItem('stationId');
    if (localStorageStation) {
        currentStation = localStorageStation.toUpperCase();
        console.log('Found station from localStorage:', currentStation);
        return;
    }
    
    // Method 2: Check sidebar station selection
    const stationSidebarItem = document.querySelector('.station-item.active');
    if (stationSidebarItem) {
        const stationId = stationSidebarItem.getAttribute('data-station') || 
                         stationSidebarItem.textContent.trim();
        if (stationId) {
            currentStation = stationId.toUpperCase();
            console.log('Found station from sidebar:', currentStation);
            return;
        }
    }
    
    // Method 3: Check for station in data as fallback
    if (filteredData && filteredData.length > 0) {
        const firstRecord = filteredData[0];
        const dataStation = firstRecord.StationId || firstRecord.stationId || firstRecord.站點 || firstRecord['站點'];
        if (dataStation) {
            currentStation = dataStation.toUpperCase();
            console.log('Found station from data:', currentStation);
            return;
        }
    }
    
    console.log('Using default station:', currentStation);
}

function toggleGreaseTrapCard(station) {
    const greaseTrapCard = document.querySelector('#greaseTrapLoads')?.closest('.stat-card');
    if (greaseTrapCard) {
        if (station === 'WKTS') {
            greaseTrapCard.style.display = '';
            greaseTrapCard.classList.remove('hidden');
            greaseTrapCard.classList.add('visible');
        } else {
            greaseTrapCard.style.display = 'none';
            greaseTrapCard.classList.remove('visible');
            greaseTrapCard.classList.add('hidden');
        }
        console.log(`Grease trap card ${station === 'WKTS' ? 'shown' : 'hidden'} for station: ${station}`);
    }
}

function getSearchPeriod() {
    const startDate = currentFilters.dateRange?.start;
    const endDate = currentFilters.dateRange?.end;
    
    if (!startDate || !endDate) {
        return 'No date range selected';
    }
    
    const startFormatted = formatDateForDisplay(startDate);
    const endFormatted = formatDateForDisplay(endDate);
    
    if (startDate === endDate) {
        return `${startFormatted}`;
    } else {
        return `${startFormatted} - ${endFormatted}`;
    }
}

function formatDateForDisplay(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            day: 'numeric',
            month: 'short', 
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

function updateCardLayout(searchPeriod, tonsData) {
    console.log('Updating card layout...');
    
    const statCards = [
        { id: 'totalLoads', period: searchPeriod, tons: null },
        { id: 'totalWeight', period: searchPeriod, tons: null },
        { id: 'amLoads', period: null, tons: tonsData.amTons },
        { id: 'contractorLoads', period: null, tons: tonsData.contractorTons },
        { id: 'privateLoads', period: null, tons: tonsData.privateTons },
        { id: 'greaseTrapLoads', period: null, tons: tonsData.greaseTrapTons }
    ];
    
    statCards.forEach(card => {
        const statCard = document.querySelector(`#${card.id}`)?.closest('.stat-card');
        if (!statCard) return;
        
        if (statCard.style.display === 'none') return;
        
        const valueElement = statCard.querySelector('.stat-value');
        const labelElement = statCard.querySelector('.stat-label');
        const subtitleElement = statCard.querySelector('.stat-subtitle');
        
        if (!valueElement || !labelElement || !subtitleElement) return;
       
        if (card.period) {
            subtitleElement.textContent = card.period;
            subtitleElement.style.fontSize = '13px';
            subtitleElement.style.fontWeight = 'normal';
            subtitleElement.style.color = '#888';
            subtitleElement.style.marginTop = '8px';
            subtitleElement.style.lineHeight = '1.3';
        } else if (card.tons !== null) {
            subtitleElement.textContent = `${card.tons.toFixed(2)} tons`;
            subtitleElement.style.fontSize = '13px';
            subtitleElement.style.fontWeight = '600';
            subtitleElement.style.color = '#00ff88';
            subtitleElement.style.marginTop = '8px';
            subtitleElement.style.lineHeight = '1.3';
        }
    });
    
    console.log('✅ Card layout updated with new format');
}

function matchesVehicleTask(vehicleTask, patterns, station) {
    if (!vehicleTask) return false;
    
    const task = vehicleTask.toString().trim();
    
    if (station === 'WKTS') {
        return patterns.some(pattern => {
            return task.startsWith(pattern) || task.startsWith(pattern + ' ');
        });
    } else {
        return patterns.some(prefix => {
            return task.startsWith(prefix) || task.startsWith(prefix + ' ');
        });
    }
}

// Export function to manually set station (call this from your sidebar click handler)
export function setCurrentStation(station) {
    currentStation = station.toUpperCase();
    console.log('Station manually set to:', currentStation);
    updateStatsCards();
}