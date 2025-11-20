// monthly-stats.js - Updated with Waste Intake button
import { stations } from './utils.js';
import { 
    exportHourlyToPdf, 
    exportHourlyToExcel, 
    exportMonthlyToPdf, 
    exportMonthlyToExcel 
} from './export.js';

import { 
    loadPeriodStats, 
    setWktsData, 
    setStations 
} from './period-table.js';

// Monthly Stats Data Structure
const monthlyData = {};

// Load and process WKTS data
let wktsData = [];

// Function to load and process WKTS data
async function loadWktsData() {
    try {
        const response = await fetch('data/wkts.json');
        wktsData = await response.json();
        console.log('✅ WKTS data loaded successfully:', wktsData.length, 'records');
        
        // Set the data for period-table.js AFTER it's loaded
        setWktsData(wktsData);
        setStations(stations);
        
        return wktsData;
    } catch (error) {
        console.error('❌ Error loading WKTS data:', error);
        return [];
    }
}

// Function to process data for a specific month
function processMonthData(month, year) {
    const monthIndex = getMonthIndex(month);
    const monthData = [];
    
    console.log(`Processing ${month} ${year}, looking for month index: ${monthIndex}`);
    
    // Filter data for the specific month and year
    const monthRecords = wktsData.filter(record => {
        if (!record.日期 || !record.入磅時間) {
            return false;
        }
        
        try {
            // Parse date from "日期" field (DD/MM/YYYY)
            const dateParts = record.日期.split('/');
            if (dateParts.length !== 3) {
                return false;
            }
            
            const day = parseInt(dateParts[0]);
            const recordMonth = parseInt(dateParts[1]);
            const recordYear = parseInt(dateParts[2]);
            
            const recordDate = new Date(recordYear, recordMonth - 1, day);
            
            return recordDate.getMonth() === monthIndex && recordDate.getFullYear() === year;
            
        } catch (error) {
            console.log('Error parsing date/time:', record.日期, record.入磅時間, error);
            return false;
        }
    });
    
    console.log(`Processing ${month} ${year}: ${monthRecords.length} records found`);
    
    if (monthRecords.length === 0) {
        console.log(`No records found for ${month} ${year}`);
        return [];
    }
    
    // Group records by date
    const recordsByDate = {};
    monthRecords.forEach(record => {
        try {
            const dateParts = record.日期.split('/');
            const day = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]);
            const year = parseInt(dateParts[2]);
            
            const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            
            if (!recordsByDate[dateKey]) {
                recordsByDate[dateKey] = [];
            }
            recordsByDate[dateKey].push(record);
        } catch (error) {
            console.log('Error processing record date:', record.日期, error);
        }
    });
    
    console.log(`Grouped into ${Object.keys(recordsByDate).length} dates`);
    
    // Process each day
    Object.keys(recordsByDate).forEach(dateKey => {
        const records = recordsByDate[dateKey];
        const [year, month, day] = dateKey.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 = Sunday, 6 = Saturday
        
        const dayData = {
            date: `${day.toString().padStart(2, '0')}/${month}/${year}`,
            isWeekend: isWeekend,
            domesticWasteLoads: 0,
            domesticWasteTonnes: 0,
            gullyWasteLoads: 0,
            gullyWasteTonnes: 0,
            publicNormalLoads: 0,
            publicNormalTonnes: 0,
            privateLoads: 0,
            privateTonnes: 0,
            greaseTrapLoads: 0,
            greaseTrapTonnes: 0
        };
        
        // Process each record for the day
        records.forEach(record => {
            if (record.交收狀態 !== '完成') {
                return;
            }
            
            try {
                // Parse time from "入磅時間" field (HH:mm:ss)
                const timeParts = record.入磅時間.split(':');
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                const timeInMinutes = hours * 60 + minutes;
                
                const vehicleTask = record.車輛任務 || '';
                const wasteType = record.廢物類別 || '';
                const weight = parseFloat(record.物料重量) || 0;
                
                // 1. Domestic Waste Logic (04:25 - 07:25)
                 if (vehicleTask === 'C31 食環署外判車傾倒' && 
                    timeInMinutes >= (4 * 60 + 25) && timeInMinutes <= (7 * 60 + 25) &&
                    wasteType !== '家居垃圾 - 坑渠垃圾、砂礫、沙泥和碎石') {
                    dayData.domesticWasteLoads++;
                    dayData.domesticWasteTonnes += weight;
                }
                
                // 2. Gully Waste Logic (04:25 - 07:25 + 家居垃圾 - 坑渠垃圾、砂礫、沙泥和碎石)
                if (vehicleTask === 'C31 食環署外判車傾倒' && 
                    wasteType === '家居垃圾 - 坑渠垃圾、砂礫、沙泥和碎石' &&
                    timeInMinutes >= (4 * 60 + 25) && timeInMinutes <= (7 * 60 + 25)) {
                    dayData.gullyWasteLoads++;
                    dayData.gullyWasteTonnes += weight;
                }
                
                // 3. Publicly Collected Waste Normal (07:26 - 23:59)
                if ((vehicleTask === 'C31 食環署外判車傾倒' || vehicleTask === 'G01 食環署傾倒') &&
                    timeInMinutes >= (7 * 60 + 26) && timeInMinutes <= (23 * 60 + 59)) {
                    dayData.publicNormalLoads++;
                    dayData.publicNormalTonnes += weight;
                }
                
                // 4. Privately Collected Waste Normal (07:26 - 23:59)
                if (vehicleTask === 'P99 私人車傾倒' &&
                    timeInMinutes >= (7 * 60 + 26) && timeInMinutes <= (23 * 60 + 59)) {
                    dayData.privateLoads++;
                    dayData.privateTonnes += weight;
                }
                
                // 5. Grease Trap Waste
                if (vehicleTask === 'P97 油脂傾倒(私人車）') {
                    dayData.greaseTrapLoads++;
                    dayData.greaseTrapTonnes += weight;
                }
                
            } catch (error) {
                console.log('Error processing record:', record, error);
            }
        });
        
        // Calculate extended hours totals (Domestic + Gully)
        dayData.extendedLoads = dayData.domesticWasteLoads + dayData.gullyWasteLoads;
        dayData.extendedTonnes = dayData.domesticWasteTonnes + dayData.gullyWasteTonnes;
        
        // Calculate daily totals
        dayData.dailyTotalLoads = dayData.extendedLoads + dayData.publicNormalLoads + dayData.privateLoads;
        dayData.dailyTotalTonnes = dayData.extendedTonnes + dayData.publicNormalTonnes + dayData.privateTonnes;
        
        // Round tonnes to 2 decimal places
        dayData.domesticWasteTonnes = dayData.domesticWasteTonnes.toFixed(2);
        dayData.gullyWasteTonnes = dayData.gullyWasteTonnes.toFixed(2);
        dayData.extendedTonnes = dayData.extendedTonnes.toFixed(2);
        dayData.publicNormalTonnes = dayData.publicNormalTonnes.toFixed(2);
        dayData.privateTonnes = dayData.privateTonnes.toFixed(2);
        dayData.dailyTotalTonnes = dayData.dailyTotalTonnes.toFixed(2);
        dayData.greaseTrapTonnes = dayData.greaseTrapTonnes.toFixed(2);
        
        monthData.push(dayData);
    });
    
    // Sort by date
    monthData.sort((a, b) => {
        const [dayA, monthA, yearA] = a.date.split('/').map(Number);
        const [dayB, monthB, yearB] = b.date.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
    
    console.log(`Final month data: ${monthData.length} days`);
    return monthData;
}

function getMonthIndex(month) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return months.indexOf(month.toLowerCase());
}

// Function to generate time slots with corrected 23:30-23:59 slot
function generateTimeSlots() {
    const timeSlots = [];
    
    // 04:30 - 06:59
    timeSlots.push('04:30 - 06:59');
    
    // Hourly slots from 07:00 to 23:00
    for (let hour = 7; hour <= 23; hour++) {
        const startHour = hour.toString().padStart(2, '0');
        const endHour = hour.toString().padStart(2, '0');
        timeSlots.push(`${startHour}:00 - ${endHour}:59`);
    }
    
    // 23:30 - 04:29 (next day)
    timeSlots.push('23:30 - 04:29');
    
    return timeSlots;
}

// Function to process hourly data with corrected vehicle task logic - COUNT LOADS
function processHourlyData(month, year) {
    const monthIndex = getMonthIndex(month);
    const timeSlots = generateTimeSlots();
    
    console.log(`Processing hourly data for ${month} ${year}, month index: ${monthIndex}`);
    
    // Filter data for the specific month and year
    const monthRecords = wktsData.filter(record => {
        if (!record.日期 || !record.入磅時間) {
            return false;
        }
        
        try {
            // Parse date from "日期" field (DD/MM/YYYY)
            const dateParts = record.日期.split('/');
            if (dateParts.length !== 3) {
                return false;
            }
            
            const day = parseInt(dateParts[0]);
            const recordMonth = parseInt(dateParts[1]);
            const recordYear = parseInt(dateParts[2]);
            
            const recordDate = new Date(recordYear, recordMonth - 1, day);
            
            return recordDate.getMonth() === monthIndex && recordDate.getFullYear() === year;
            
        } catch (error) {
            console.log('Error parsing date/time:', record.日期, record.入磅時間, error);
            return false;
        }
    });
    
    console.log(`Hourly data: ${monthRecords.length} records found for ${month} ${year}`);
    
    if (monthRecords.length === 0) {
        return { timeSlots, dailyData: {}, dailyWeights: {}, dates: [] };
    }
    
    // Get all unique dates in the month
    const dates = [...new Set(monthRecords.map(record => record.日期))].sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
    
    // Initialize data structure for loads and weights
    const dailyData = {};
    const dailyWeights = {};
    dates.forEach(date => {
        dailyData[date] = {};
        dailyWeights[date] = {};
        timeSlots.forEach(slot => {
            dailyData[date][slot] = 0; // Count of loads
            dailyWeights[date][slot] = 0; // Total weight
        });
    });
    
    // Process each record and assign to time slots with corrected vehicle task logic
    monthRecords.forEach(record => {
        // Filter for completed records with specified vehicle tasks
        if (record.交收狀態 !== '完成') {
            return;
        }
        
        const validVehicleTasks = ['P99 私人車傾倒', 'G01 食環署傾倒', 'C31 食環署外判車傾倒'];
        if (!validVehicleTasks.includes(record.車輛任務)) {
            return;
        }
        
        try {
            const time = record.入磅時間;
            const date = record.日期;
            const weight = parseFloat(record.物料重量) || 0;
            
            if (!time || !date || !dailyData[date]) {
                return;
            }
            
            const [hours, minutes, seconds] = time.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes;
            
            let timeSlot = '';
            
            // Determine time slot
            if (totalMinutes >= (4 * 60 + 20) && totalMinutes <= (6 * 60 + 59)) {
                timeSlot = '04:30 - 06:59';
            } else if (totalMinutes >= (23 * 60 + 30) && totalMinutes <= (23 * 60 + 59)) {
                timeSlot = '23:30 - 04:29'; // This covers 23:30-23:59
            } else if (totalMinutes >= 0 && totalMinutes <= (4 * 60 + 19)) {
                timeSlot = '23:30 - 04:29'; // This covers 00:00-04:29 (next day)
            } else {
                // Hourly slots from 07:00 to 23:00
                const hour = Math.floor(totalMinutes / 60);
                if (hour >= 7 && hour <= 23) {
                    const startHour = hour.toString().padStart(2, '0');
                    timeSlot = `${startHour}:00 - ${startHour}:59`;
                }
            }
            
            if (timeSlot && dailyData[date][timeSlot] !== undefined) {
                dailyData[date][timeSlot] += 1; // Count loads
                dailyWeights[date][timeSlot] += weight; // Sum weights
            }
            
        } catch (error) {
            console.log('Error processing hourly record:', record, error);
        }
    });
    
    return { timeSlots, dailyData, dailyWeights, dates };
}

// Function to check if date is weekend
function isWeekend(dateStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0 || date.getDay() === 6; // 0 = Sunday, 6 = Saturday
}

// Function to check if date is Sunday
function isSunday(dateStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0; // 0 = Sunday
}

// Function to calculate hourly totals and averages
function calculateHourlyTotals(timeSlots, dates, dailyData) {
    const totals = {};
    const averages = {};
    
    timeSlots.forEach(slot => {
        let total = 0;
        dates.forEach(date => {
            total += dailyData[date][slot] || 0;
        });
        totals[slot] = total;
        averages[slot] = dates.length > 0 ? (total / dates.length).toFixed(1) : 0;
    });
    
    return { totals, averages };
}

// Function to get weekday from date string (DD/MM/YYYY)
function getWeekday(dateStr) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[date.getDay()];
}

// Function to show hourly table - SHOW LOADS WITH WEIGHT TOOLTIPS AND WEEKEND STYLING
function showHourlyTable(month, stationName, hourlyData, year) {
    const { timeSlots, dailyData, dailyWeights, dates } = hourlyData;
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    
    // Calculate totals and averages
    const { totals, averages } = calculateHourlyTotals(timeSlots, dates, dailyData);
    
    const statsContent = document.getElementById('monthlyStatsContent');
    
    let tableHTML = `
    <div class="hourly-table-container">
        <div class="monthly-table-header">
            <div class="monthly-table-title">Hourly WCV Intake for ${monthName} ${year} - ${stationName}</div>
            <div class="table-actions">
                <button class="export-btn" id="exportHourlyPdf">
                    Export to PDF
                </button>
                <button class="export-btn" id="exportHourlyExcel">
                    Export to Excel
                </button>
            </div>
        </div>
            
        <div class="table-wrapper">
            <table class="hourly-data-table">
                <thead>
                    <tr>
                        <th class="time-header">Time</th>
                        ${dates.map((date, index) => {
                            const isWeekendDay = isWeekend(date);
                            const isSundayDay = isSunday(date);
                            const weekendClass = isWeekendDay ? 'weekend-date' : '';
                            // KEEP weekend classes for red text color, but remove background colors in CSS
                            return `
                            <th class="date-header ${weekendClass}" colspan="1" data-date="${date}">
                                ${date}<br>
                                <span class="weekday-cell ${weekendClass}">${getWeekday(date)}</span>
                            </th>
                        `}).join('')}
                        <th class="summary-header total-column">Total</th>
                        <th class="summary-header average-column">Average</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Add data rows for each time slot - SHOW LOAD COUNTS
    timeSlots.forEach(timeSlot => {
        tableHTML += `<tr>`;
        tableHTML += `<td class="time-slot-cell">${timeSlot}</td>`;
        
        let rowTotal = 0;
        let rowCount = 0;
        
        dates.forEach((date, dateIndex) => {
            const loadCount = dailyData[date][timeSlot];
            const weight = dailyWeights[date][timeSlot];
            const isWeekendDay = isWeekend(date);
            const weekendClass = isWeekendDay ? 'weekend-data' : '';
            // KEEP weekend class for red text color, but remove background colors in CSS
            
            if (loadCount > 0) {
                tableHTML += `<td class="load-cell ${weekendClass}" data-weight="${weight.toFixed(2)}t" data-loads="${loadCount} loads" data-date="${date}">
                    ${loadCount}
                </td>`;
                rowTotal += loadCount;
                rowCount++;
            } else {
                tableHTML += `<td class="${weekendClass}" data-date="${date}">-</td>`;
            }
        });
        
        // Add total and average columns for each time slot
        tableHTML += `<td class="total-cell">${totals[timeSlot]}</td>`;
        tableHTML += `<td class="average-cell">${averages[timeSlot]}</td>`;
        
        tableHTML += `</tr>`;
    });
    
    // Add total row (sum of each date column)
    tableHTML += `
                    </tbody>
                    <tfoot>
                        <tr class="hourly-total-row">
                            <td class="time-slot-cell"><strong>Total</strong></td>
    `;
    
    dates.forEach(date => {
        let dateTotal = 0;
        timeSlots.forEach(slot => {
            dateTotal += dailyData[date][slot] || 0;
        });
        tableHTML += `<td class="date-total-cell"><strong>${dateTotal}</strong></td>`;
    });
    
    // Add grand total and average of totals
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const overallAverage = dates.length > 0 ? (grandTotal / dates.length).toFixed(1) : 0;
    
    tableHTML += `
                            <td class="grand-total-cell"><strong>${grandTotal}</strong></td>
                            <td class="overall-average-cell"><strong>${overallAverage}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
    
    statsContent.innerHTML = tableHTML;
    
    // Add hover tooltip functionality
    setupHourlyTooltips();
    
    // Add export button event listeners
    setupHourlyExportButtons(month, year);
}

// Function to setup hover tooltips for hourly table
function setupHourlyTooltips() {
    const loadCells = document.querySelectorAll('.load-cell');
    
    loadCells.forEach(cell => {
        const weight = cell.getAttribute('data-weight');
        const loads = cell.getAttribute('data-loads');
        
        // Create tooltip
        cell.style.position = 'relative';
        cell.style.cursor = 'help';
        
        cell.addEventListener('mouseenter', function(e) {
            // Remove any existing tooltip
            const existingTooltip = document.querySelector('.weight-tooltip');
            if (existingTooltip) {
                existingTooltip.remove();
            }
            
            // Create new tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'weight-tooltip';
            tooltip.innerHTML = `
                <div class="tooltip-content">
                    <strong>${loads}</strong><br>
                    ${weight}
                </div>
            `;
            document.body.appendChild(tooltip);
            
            // Position tooltip
            const rect = cell.getBoundingClientRect();
            tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
        });
        
        cell.addEventListener('mouseleave', function() {
            const tooltip = document.querySelector('.weight-tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
        
        cell.addEventListener('mousemove', function(e) {
            const tooltip = document.querySelector('.weight-tooltip');
            if (tooltip) {
                const rect = cell.getBoundingClientRect();
                tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
            }
        });
    });
}

// Function to setup hourly export buttons
function setupHourlyExportButtons(month, year) {
    const exportPdf = document.getElementById('exportHourlyPdf');
    const exportExcel = document.getElementById('exportHourlyExcel');
    
    if (exportPdf) {
        exportPdf.addEventListener('click', () => {
            const selectedStationId = localStorage.getItem('stationId') || 'wkts';
            const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
            const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
            
            // Get current hourly data for the specific year
            const hourlyData = processHourlyData(month, year);
            
            // Check if we have data before exporting
            if (hourlyData.dates.length > 0) {
                exportHourlyToPdf(month, stationName, hourlyData, getWeekday, isWeekend, calculateHourlyTotals, year);
            } else {
                alert('No data available to export for the selected month and year.');
            }
        });
    }
    
    if (exportExcel) {
        exportExcel.addEventListener('click', () => {
            const selectedStationId = localStorage.getItem('stationId') || 'wkts';
            const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
            const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
            
            // Get current hourly data for the specific year
            const hourlyData = processHourlyData(month, year);
            
            // Check if we have data before exporting
            if (hourlyData.dates.length > 0) {
                exportHourlyToExcel(month, stationName, hourlyData, getWeekday, calculateHourlyTotals, year);
            } else {
                alert('No data available to export for the selected month and year.');
            }
        });
    }
}

// Function to load hourly stats
async function loadHourlyStats(month) {
    console.log('Loading hourly stats for month:', month);
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
    const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
    
    const statsContent = document.getElementById('monthlyStatsContent');
    statsContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading hourly WCV intake data for ${month} at ${stationName}...</p>
        </div>
    `;
    
    // Use current year only - NO FALLBACK
    const currentYear = new Date().getFullYear();
    const hourlyData = processHourlyData(month, currentYear);
    
    // Check if we have data for the requested year
    const hasData = hourlyData.dates.length > 0;
    
    if (!hasData) {
        statsContent.innerHTML = `
            <div class="hourly-no-data">
                <h3>No Hourly WCV Intake Data Available</h3>
                <p>No completed transaction records found for ${month} ${currentYear} with vehicle tasks: P99 私人車傾倒, G01 食環署傾倒, or C31 食環署外判車傾倒.</p>
                <p>Please check if the data file contains records for this month and year.</p>
            </div>
        `;
        return;
    }
    
    // Show the hourly table with data
    showHourlyTable(month, stationName, hourlyData, currentYear);
}

// Function to load monthly stats
async function loadMonthStats(month) {
    console.log('Loading monthly stats for month:', month);
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
    const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
    
    const statsContent = document.getElementById('monthlyStatsContent');
    statsContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading ${month} data for ${stationName}...</p>
        </div>
    `;
    
    // Use current year only - NO FALLBACK
    const currentYear = new Date().getFullYear();
    const monthData = processMonthData(month, currentYear);
    
    // Check if we have data for the requested year
    const hasData = monthData.length > 0;
    
    if (!hasData) {
        statsContent.innerHTML = `
            <div class="no-data-message">
                <h3>No Data Available</h3>
                <p>No transaction records found for ${month} ${currentYear}.</p>
                <p>Please check if:</p>
                <ul>
                    <li>The data file contains records for this month and year</li>
                    <li>The date formats in the data are correct</li>
                    <li>There are completed transactions (交收狀態: 完成)</li>
                </ul>
            </div>
        `;
        return;
    }
    
    // Show the monthly table with data
    showMonthlyTable(month, stationName, monthData, currentYear);
}

// Show Monthly Table with Data - CORRECTED HEADER FORMAT
function showMonthlyTable(month, stationName, monthData, year) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    
    // Calculate totals and averages
    const totals = calculateTotals(monthData);
    const averages = calculateAverages(monthData);
    
    const statsContent = document.getElementById('monthlyStatsContent');
    
    statsContent.innerHTML = `
<div class="monthly-table-container">
    <div class="monthly-table-header">
        <div class="monthly-table-title">Daily Transaction Log for MSW and GTW for ${monthName} ${year}</div>
        <div class="table-actions">
            <button class="export-btn" id="exportPdf">
                Export to PDF
            </button>
            <button class="export-btn" id="exportExcel">
                Export to Excel
            </button>
        </div>
    </div>
        
    <div class="table-wrapper">
        <table class="monthly-data-table">
            <thead>
                <!-- Row 1 -->
                <tr>
                    <th rowspan="4" class="transaction-date header-public">Transaction Date</th>
                    <th colspan="6" class="header-public">Publicly Collected Waste</th>
                    <th colspan="2" class="header-private">Privately Collected Waste</th>
                    <th colspan="2" class="header-total">Daily Total</th>
                    <th colspan="2" class="header-grease">Grease Trap Waste</th>
                </tr>
                <!-- Row 2 -->
                <tr>
                    <th colspan="4" class="header-public">Extended Reception Hours (0430-0730)</th>
                    <th colspan="2" class="header-public">Normal (0730-2330)</th>
                    <th colspan="2" class="header-private">Normal (0730-2330)</th>
                    <th colspan="2" class="header-total"></th>
                    <th colspan="2" class="header-grease"></th>
                </tr>
                <!-- Row 3 -->
                <tr>
                    <th colspan="2" class="header-public">Domestic Waste</th>
                    <th colspan="2" class="header-public">Gully Waste (D06)</th>
                    <th colspan="2" class="header-public"></th>
                    <th colspan="2" class="header-private"></th>
                    <th colspan="2" class="header-total"></th>
                    <th colspan="2" class="header-grease"></th>
                </tr>
                <!-- Row 4 -->
                <tr class="column-labels">
                    <th class="header-public">No. of Loads</th>
                    <th class="header-public">Tonnes</th>
                    <th class="header-public">No. of Loads</th>
                    <th class="header-public">Tonnes</th>
                    <th class="header-public">No. of Loads</th>
                    <th class="header-public">Tonnes</th>
                    <th class="header-private">No. of Loads</th>
                    <th class="header-private">Tonnes</th>
                    <th class="header-total">No. of Loads</th>
                    <th class="header-total">Tonnes</th>
                    <th class="header-grease grease-trap-border">No. of Loads</th>
                    <th class="header-grease">Tonnes</th>
                </tr>
            </thead>
           
            <tbody>
                ${monthData.map((day, index) => {
                    const date = new Date(day.date.split('/').reverse().join('-'));
                    const isSunday = date.getDay() === 0;
                    
                    return `
                        <tr class="${isSunday ? 'sunday-row' : ''}">
                            <td class="transaction-date ${day.isWeekend ? 'weekend-date' : ''}">${day.date}</td>
                            <td>${day.domesticWasteLoads}</td>
                            <td>${day.domesticWasteTonnes}</td>
                            <td>${day.gullyWasteLoads}</td>
                            <td>${day.gullyWasteTonnes}</td>
                            <td>${day.publicNormalLoads}</td>
                            <td>${day.publicNormalTonnes}</td>
                            <td>${day.privateLoads}</td>
                            <td>${day.privateTonnes}</td>
                            <td>${day.dailyTotalLoads}</td>
                            <td>${day.dailyTotalTonnes}</td>
                            <td>${day.greaseTrapLoads}</td>
                            <td>${day.greaseTrapTonnes}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
            <tfoot>
                <tr class="total-row">
                    <td class="transaction-date">Total</td>
                    <td>${totals.domesticWasteLoads}</td>
                    <td>${totals.domesticWasteTonnes}</td>
                    <td>${totals.gullyWasteLoads}</td>
                    <td>${totals.gullyWasteTonnes}</td>
                    <td>${totals.publicNormalLoads}</td>
                    <td>${totals.publicNormalTonnes}</td>
                    <td>${totals.privateLoads}</td>
                    <td>${totals.privateTonnes}</td>
                    <td>${totals.dailyTotalLoads}</td>
                    <td>${totals.dailyTotalTonnes}</td>
                    <td class="grease-trap-border">${totals.greaseTrapLoads}</td>
                    <td>${totals.greaseTrapTonnes}</td>
                </tr>
                <tr class="average-row">
                    <td class="transaction-date">Daily Average</td>
                    <td>${averages.domesticWasteLoads}</td>
                    <td>${averages.domesticWasteTonnes}</td>
                    <td>${averages.gullyWasteLoads}</td>
                    <td>${averages.gullyWasteTonnes}</td>
                    <td>${averages.publicNormalLoads}</td>
                    <td>${averages.publicNormalTonnes}</td>
                    <td>${averages.privateLoads}</td>
                    <td>${averages.privateTonnes}</td>
                    <td>${averages.dailyTotalLoads}</td>
                    <td>${averages.dailyTotalTonnes}</td>
                    <td class="grease-trap-border">${averages.greaseTrapLoads}</td>
                    <td>${averages.greaseTrapTonnes}</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>
    `;
    
    // Add export button event listeners
    setupExportButtons(month, year);
}

// Calculate totals for the month
function calculateTotals(monthData) {
    const totals = {
        domesticWasteLoads: 0,
        domesticWasteTonnes: 0,
        gullyWasteLoads: 0,
        gullyWasteTonnes: 0,
        extendedLoads: 0,
        extendedTonnes: 0,
        publicNormalLoads: 0,
        publicNormalTonnes: 0,
        privateLoads: 0,
        privateTonnes: 0,
        dailyTotalLoads: 0,
        dailyTotalTonnes: 0,
        greaseTrapLoads: 0,
        greaseTrapTonnes: 0
    };
    
    monthData.forEach(day => {
        totals.domesticWasteLoads += day.domesticWasteLoads;
        totals.domesticWasteTonnes += parseFloat(day.domesticWasteTonnes);
        totals.gullyWasteLoads += day.gullyWasteLoads;
        totals.gullyWasteTonnes += parseFloat(day.gullyWasteTonnes);
        totals.extendedLoads += day.extendedLoads;
        totals.extendedTonnes += parseFloat(day.extendedTonnes);
        totals.publicNormalLoads += day.publicNormalLoads;
        totals.publicNormalTonnes += parseFloat(day.publicNormalTonnes);
        totals.privateLoads += day.privateLoads;
        totals.privateTonnes += parseFloat(day.privateTonnes);
        totals.dailyTotalLoads += day.dailyTotalLoads;
        totals.dailyTotalTonnes += parseFloat(day.dailyTotalTonnes);
        totals.greaseTrapLoads += day.greaseTrapLoads;
        totals.greaseTrapTonnes += parseFloat(day.greaseTrapTonnes);
    });
    
    // Format to 2 decimal place for tonnes
    Object.keys(totals).forEach(key => {
        if (key.includes('Tonnes')) {
            totals[key] = totals[key].toFixed(2);
        }
    });
    
    return totals;
}

// Calculate averages for the month
function calculateAverages(monthData) {
    const totals = calculateTotals(monthData);
    const days = monthData.length;
    
    const averages = {};
    
    Object.keys(totals).forEach(key => {
        if (key.includes('Tonnes')) {
            averages[key] = (parseFloat(totals[key]) / days).toFixed(2);
        } else {
            averages[key] = Math.round(parseFloat(totals[key]) / days);
        }
    });
    
    return averages;
}

// Function to setup monthly export buttons
function setupExportButtons(month, year) {
    const exportPdf = document.getElementById('exportPdf');
    const exportExcel = document.getElementById('exportExcel');
    
    if (exportPdf) {
        exportPdf.addEventListener('click', () => {
            const selectedStationId = localStorage.getItem('stationId') || 'wkts';
            const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
            const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
            
            // Get current monthly data for the specific year
            const monthData = processMonthData(month, year);
            
            // Check if we have data before exporting
            if (monthData.length > 0) {
                exportMonthlyToPdf(month, stationName, monthData, calculateTotals, calculateAverages, year);
            } else {
                alert('No data available to export for the selected month and year.');
            }
        });
    }
    
    if (exportExcel) {
        exportExcel.addEventListener('click', () => {
            const selectedStationId = localStorage.getItem('stationId') || 'wkts';
            const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
            const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
            
            // Get current monthly data for the specific year
            const monthData = processMonthData(month, year);
            
            // Check if we have data before exporting
            if (monthData.length > 0) {
                exportMonthlyToExcel(month, stationName, monthData, calculateTotals, calculateAverages, year);
            } else {
                alert('No data available to export for the selected month and year.');
            }
        });
    }
}

// Function to load waste intake data
function loadWasteIntake(month) {
    console.log('Loading waste intake data for month:', month);
    
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
    const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
    
    const statsContent = document.getElementById('monthlyStatsContent');
    statsContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading Waste Intake data for ${month} at ${stationName}...</p>
        </div>
    `;
    
    // Use current year only
    const currentYear = new Date().getFullYear();
    
    try {
        // Call the actual implementation from period-table.js
        const wasteIntakeData = window.processWasteIntakeData(month, currentYear);
        
        // Check if we have data for the requested year
        const hasData = wasteIntakeData && wasteIntakeData.length > 0;
        
        if (!hasData) {
            statsContent.innerHTML = `
                <div class="no-data-message">
                    <h3>No Waste Intake Data Available</h3>
                    <p>No completed transaction records found for ${month} ${currentYear}.</p>
                    <p>Please check if:</p>
                    <ul>
                        <li>The data file contains records for this month and year</li>
                        <li>The date formats in the data are correct</li>
                        <li>There are completed transactions (交收狀態: 完成)</li>
                    </ul>
                </div>
            `;
            return;
        }
        
        // Show the Waste Intake table with data
        window.showWasteIntakeTable(month, stationName, wasteIntakeData, currentYear);
        
    } catch (error) {
        console.error('Error loading waste intake data:', error);
        statsContent.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Data</h3>
                <p>There was an error processing the waste intake data for ${month}.</p>
                <p>Error: ${error.message}</p>
            </div>
        `;
    }
}

// Render the complete monthly stats page
export function renderMonthlyStats() {
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
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
        <div class="monthly-stats-container">
            <!-- SIDEBAR -->
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header" id="sidebarHeader">
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
                    <div class="action-item active" id="monthlyStats">
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
            <div class="monthly-main-content">
                <!-- MONTHLY STATS HEADER -->
                <div class="monthly-stats-header">
                    <div class="monthly-header-top">
                        <h1>Monthly Statistics - ${namePart}</h1>
                        <div class="period-selector">
                            <!-- WASTE INTAKE DROPDOWN -->
                            <div class="month-dropdown">
                                <select id="wasteIntakeSelect" class="month-select waste-intake-select">
                                    <option value="">Waste Intake</option>
                                    <option value="january">January</option>
                                    <option value="february">February</option>
                                    <option value="march">March</option>
                                    <option value="april">April</option>
                                    <option value="may">May</option>
                                    <option value="june">June</option>
                                    <option value="july">July</option>
                                    <option value="august">August</option>
                                    <option value="september">September</option>
                                    <option value="october">October</option>
                                    <option value="november">November</option>
                                    <option value="december">December</option>
                                </select>
                            </div>

                            <!-- PERIOD DROPDOWN -->
                            <div class="period-dropdown">
                                <select id="periodSelect" class="period-select">
                                    <option value="">Select Period</option>
                                    <option value="q1">Q1 (Jan-Mar)</option>
                                    <option value="q2">Q2 (Apr-Jun)</option>
                                    <option value="q3">Q3 (Jul-Sep)</option>
                                    <option value="q4">Q4 (Oct-Dec)</option>
                                    <option value="h1">H1 (Jan-Jun)</option>
                                    <option value="h2">H2 (Jul-Dec)</option>
                                    <option value="annual">Annual (Jan-Dec)</option>
                                </select>
                            </div>
                            
                            <!-- Hourly WCV Intake Dropdown -->
                            <div class="month-dropdown">
                                <select id="hourlyMonthSelect" class="month-select hourly-wcv-select">
                                    <option value="">Hourly (WCV Intake)</option>
                                    <option value="january">January</option>
                                    <option value="february">February</option>
                                    <option value="march">March</option>
                                    <option value="april">April</option>
                                    <option value="may">May</option>
                                    <option value="june">June</option>
                                    <option value="july">July</option>
                                    <option value="august">August</option>
                                    <option value="september">September</option>
                                    <option value="october">October</option>
                                    <option value="november">November</option>
                                    <option value="december">December</option>
                                </select>
                            </div>

                            <!-- Monthly Stats Dropdown -->
                            <div class="month-dropdown">
                                <select id="monthSelect" class="month-select monthly-stats-select">
                                    <option value="">Monthly Stats</option>
                                    <option value="january">January</option>
                                    <option value="february">February</option>
                                    <option value="march">March</option>
                                    <option value="april">April</option>
                                    <option value="may">May</option>
                                    <option value="june">June</option>
                                    <option value="july">July</option>
                                    <option value="august">August</option>
                                    <option value="september">September</option>
                                    <option value="october">October</option>
                                    <option value="november">November</option>
                                    <option value="december">December</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MONTHLY STATS CONTENT -->
                <div class="monthly-stats-content" id="monthlyStatsContent">
                    <div class="simple-welcome-message">
                        <h2>Which report are you looking for?</h2>
                        <p>Please choose Waste Intake, a period (e.g., Q1, Annual) or select a month for Hourly WCV Intake or Monthly Stats report.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize Monthly Stats Page
export async function initializeMonthlyStats() {
    console.log('Initializing Monthly Stats page...');
    
    // Check authentication
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'index.html';
        return;
    }
    
    // Load WKTS data
    await loadWktsData();
    
    // Render the page
    document.getElementById('app').innerHTML = renderMonthlyStats();
    
    // Setup event listeners
    setupMonthlyStatsEventListeners();
    
    console.log('✅ Monthly Stats page initialized successfully');
}

// Setup Monthly Stats Event Listeners
function setupMonthlyStatsEventListeners() {
    console.log('Setting up monthly stats event listeners...');
    
    // Sidebar header click to return to main dashboard
    const sidebarHeader = document.getElementById('sidebarHeader');
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
    
    // Station selection
    document.querySelectorAll('[data-station]').forEach(item => {
        item.addEventListener('click', function() {
            const stationId = this.dataset.station;
            handleStationSelect(stationId);
        });
    });
    
    // All Stations button
    const allStationsBtn = document.getElementById('allStations');
    if (allStationsBtn) {
        allStationsBtn.addEventListener('click', () => {
            alert('All stations comparison feature coming soon!');
        });
    }
    
    // Waste Intake dropdown
    const wasteIntakeSelect = document.getElementById('wasteIntakeSelect');
    if (wasteIntakeSelect) {
        wasteIntakeSelect.addEventListener('change', function() {
            if (this.value) {
                // Clear the other dropdowns
                const periodSelect = document.getElementById('periodSelect');
                const hourlyMonthSelect = document.getElementById('hourlyMonthSelect');
                const monthSelect = document.getElementById('monthSelect');
                
                if (periodSelect) periodSelect.value = '';
                if (hourlyMonthSelect) hourlyMonthSelect.value = '';
                if (monthSelect) monthSelect.value = '';
                
                console.log('Loading waste intake for:', this.value);
                loadWasteIntake(this.value);
            } else {
                showWelcomeMessage();
            }
        });
    }
    
    // Period dropdown
    const periodSelect = document.getElementById('periodSelect');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            if (this.value) {
                // Clear the other dropdowns
                const wasteIntakeSelect = document.getElementById('wasteIntakeSelect');
                const hourlyMonthSelect = document.getElementById('hourlyMonthSelect');
                const monthSelect = document.getElementById('monthSelect');
                
                if (wasteIntakeSelect) wasteIntakeSelect.value = '';
                if (hourlyMonthSelect) hourlyMonthSelect.value = '';
                if (monthSelect) monthSelect.value = '';
                
                console.log('Loading period stats for:', this.value);
                loadPeriodStats(this.value);
            } else {
                showWelcomeMessage();
            }
        });
    }
    
    // Hourly WCV month dropdown
    const hourlyMonthSelect = document.getElementById('hourlyMonthSelect');
    if (hourlyMonthSelect) {
        hourlyMonthSelect.addEventListener('change', function() {
            if (this.value) {
                // Clear the other dropdowns
                const wasteIntakeSelect = document.getElementById('wasteIntakeSelect');
                const periodSelect = document.getElementById('periodSelect');
                const monthSelect = document.getElementById('monthSelect');
                
                if (wasteIntakeSelect) wasteIntakeSelect.value = '';
                if (periodSelect) periodSelect.value = '';
                if (monthSelect) monthSelect.value = '';
                
                console.log('Loading hourly stats for:', this.value);
                loadHourlyStats(this.value);
            } else {
                showWelcomeMessage();
            }
        });
    }
    
    // Monthly Stats dropdown
    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) {
        monthSelect.addEventListener('change', function() {
            if (this.value) {
                // Clear the other dropdowns
                const wasteIntakeSelect = document.getElementById('wasteIntakeSelect');
                const periodSelect = document.getElementById('periodSelect');
                const hourlyMonthSelect = document.getElementById('hourlyMonthSelect');
                
                if (wasteIntakeSelect) wasteIntakeSelect.value = '';
                if (periodSelect) periodSelect.value = '';
                if (hourlyMonthSelect) hourlyMonthSelect.value = '';
                
                console.log('Loading monthly stats for:', this.value);
                loadMonthStats(this.value);
            } else {
                showWelcomeMessage();
            }
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
        // Already on monthly stats page, just ensure it's active
        monthlyStatsBtn.classList.add('active');
    }
    
    console.log('✅ Monthly stats event listeners setup complete');
}

// Handle station selection
function handleStationSelect(stationId) {
    console.log('🔄 Station selected:', stationId);
    
    // Update active state in sidebar
    updateSidebarActiveState(stationId);
    
    // Store in localStorage
    localStorage.setItem('stationId', stationId);
    
    // Update the header with new station name
    updateStationHeader(stationId);
    
    // Reload current view if data is already loaded
    const wasteIntakeSelect = document.getElementById('wasteIntakeSelect');
    const periodSelect = document.getElementById('periodSelect');
    const hourlyMonthSelect = document.getElementById('hourlyMonthSelect');
    const monthSelect = document.getElementById('monthSelect');
    
    // Priority: Waste Intake > Period > Hourly > Monthly
    if (wasteIntakeSelect && wasteIntakeSelect.value) {
        console.log('Reloading waste intake data for new station');
        loadWasteIntake(wasteIntakeSelect.value);
    } else if (periodSelect && periodSelect.value) {
        console.log('Reloading period data for new station');
        loadPeriodStats(periodSelect.value);
    } else if (hourlyMonthSelect && hourlyMonthSelect.value) {
        console.log('Reloading hourly data for new station');
        loadHourlyStats(hourlyMonthSelect.value);
    } else if (monthSelect && monthSelect.value) {
        console.log('Reloading monthly data for new station');
        loadMonthStats(monthSelect.value);
    } else {
        console.log('No active view to reload');
        showWelcomeMessage();
    }
    
    console.log('✅ Station switched to:', stationId);
}

// Update sidebar active state
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
}

// Update station name in header
function updateStationHeader(stationId) {
    const selectedStation = stations.find(s => s.id.toLowerCase() === stationId.toLowerCase());
    if (selectedStation) {
        const namePart = selectedStation.name.split(' - ')[0];
        const headerTitle = document.querySelector('.monthly-stats-header h1');
        if (headerTitle) {
            headerTitle.textContent = `Monthly Statistics - ${namePart}`;
        }
    }
}

// Show welcome message - SIMPLE DESIGN
function showWelcomeMessage() {
    const statsContent = document.getElementById('monthlyStatsContent');
    
    statsContent.innerHTML = `
        <div class="simple-welcome-message">
            <h2>Which report are you looking for?</h2>
            <p>Please choose Waste Intake, a period (e.g., Q1, Annual) or select a month for Hourly WCV Intake or Monthly Stats report.</p>
        </div>
    `;
}

// Export helper functions if needed by other modules
export { getWeekday, isWeekend, isSunday, calculateHourlyTotals, calculateTotals, calculateAverages };

// Logout function
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('stationId');
    localStorage.removeItem('stationName');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeMonthlyStats);