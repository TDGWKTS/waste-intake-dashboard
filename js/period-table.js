// period-table.js - Complete with Waste Intake logic and proper CSS classes

// Import export functions from export.js
import { 
    exportWasteIntakeToPdf, 
    exportWasteIntakeToExcel, 
    exportPeriodToPdf, 
    exportPeriodToExcel 
} from './export.js';

// Function to get month index
function getMonthIndex(month) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    return months.indexOf(month.toLowerCase());
}

// Function to process Waste Intake data for a specific month
export function processWasteIntakeData(month, year) {
    console.log(`Processing Waste Intake for ${month} ${year}`);
    
    try {
        const monthIndex = getMonthIndex(month);
        const monthData = [];
        
        // We need access to wktsData - this will be provided by monthly-stats.js
        const wktsData = window.wktsData || [];
        
        console.log(`Available wktsData records: ${wktsData.length}`);
        
        if (wktsData.length === 0) {
            console.warn('No wktsData available for processing');
            return [];
        }
        
        // Filter data for the specific month and year
        const monthRecords = wktsData.filter(record => {
            if (!record.日期 || !record.入磅時間 || record.交收狀態 !== '完成') {
                return false;
            }
            
            try {
                const dateParts = record.日期.split('/');
                if (dateParts.length !== 3) return false;
                
                const day = parseInt(dateParts[0]);
                const recordMonth = parseInt(dateParts[1]);
                const recordYear = parseInt(dateParts[2]);
                
                const recordDate = new Date(recordYear, recordMonth - 1, day);
                return recordDate.getMonth() === monthIndex && recordDate.getFullYear() === year;
                
            } catch (error) {
                console.log('Error parsing date in record:', record, error);
                return false;
            }
        });
        
        console.log(`Waste Intake: ${monthRecords.length} records found for ${month} ${year}`);
        
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
                console.log('Error processing record date:', error);
            }
        });
        
        // Process each day for Waste Intake table
        Object.keys(recordsByDate).forEach(dateKey => {
            const records = recordsByDate[dateKey];
            const [year, month, day] = dateKey.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const weekday = getWeekdayFromDate(date);
            
            const dayData = {
                date: `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`,
                weekday: weekday,
                // Total Waste Intake (MSW + GTW)
                totalWasteIntakeLoads: 0,
                totalWasteIntakeTonnage: 0,
                // MSW Totals
                totalMSWLoads: 0,
                totalMSWTonnage: 0,
                // GTW (Grease Trap Waste)
                privateGTWLoads: 0,
                privateGTWTonnage: 0,
                // Public - AM Vehicle (G01)
                publicAMVehicleLoads: 0,
                publicAMVehicleTonnage: 0,
                // Public - Government Contractor (C31)
                publicContractorLoads: 0,
                publicContractorTonnage: 0,
                // Private - MSW (P99)
                privateMSWLoads: 0,
                privateMSWTonnage: 0
            };
            
            // Process each record for the day
            records.forEach(record => {
                const vehicleTask = record.車輛任務 || '';
                const weight = parseFloat(record.物料重量) || 0;
                
                // GTW Logic - P97 vehicles (Grease Trap Waste)
                if (vehicleTask === 'P97 油脂傾倒(私人車）') {
                    dayData.privateGTWLoads++;
                    dayData.privateGTWTonnage += weight;
                }
                // Public - AM Vehicle (G01)
                else if (vehicleTask === 'G01 食環署傾倒') {
                    dayData.publicAMVehicleLoads++;
                    dayData.publicAMVehicleTonnage += weight;
                }
                // Public - Government Contractor (C31)
                else if (vehicleTask === 'C31 食環署外判車傾倒') {
                    dayData.publicContractorLoads++;
                    dayData.publicContractorTonnage += weight;
                }
                // Private - MSW (P99)
                else if (vehicleTask === 'P99 私人車傾倒') {
                    dayData.privateMSWLoads++;
                    dayData.privateMSWTonnage += weight;
                }
            });
            
            // Calculate MSW Totals (AM Vehicle + Contractor + Private MSW)
            dayData.totalMSWLoads = dayData.publicAMVehicleLoads + dayData.publicContractorLoads + dayData.privateMSWLoads;
            dayData.totalMSWTonnage = dayData.publicAMVehicleTonnage + dayData.publicContractorTonnage + dayData.privateMSWTonnage;
            
            // Calculate Total Waste Intake (MSW + GTW)
            dayData.totalWasteIntakeLoads = dayData.totalMSWLoads + dayData.privateGTWLoads;
            dayData.totalWasteIntakeTonnage = dayData.totalMSWTonnage + dayData.privateGTWTonnage;
            
            // Round to 2 decimal places
            dayData.totalWasteIntakeTonnage = parseFloat(dayData.totalWasteIntakeTonnage.toFixed(2));
            dayData.totalMSWTonnage = parseFloat(dayData.totalMSWTonnage.toFixed(2));
            dayData.privateGTWTonnage = parseFloat(dayData.privateGTWTonnage.toFixed(2));
            dayData.publicAMVehicleTonnage = parseFloat(dayData.publicAMVehicleTonnage.toFixed(2));
            dayData.publicContractorTonnage = parseFloat(dayData.publicContractorTonnage.toFixed(2));
            dayData.privateMSWTonnage = parseFloat(dayData.privateMSWTonnage.toFixed(2));
            
            monthData.push(dayData);
        });
        
        // Sort by date
        monthData.sort((a, b) => {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
        });
        
        console.log(`Final Waste Intake data: ${monthData.length} days`);
        return monthData;
        
    } catch (error) {
        console.error('Error in processWasteIntakeData:', error);
        return [];
    }
}

// Helper function to get weekday from date
function getWeekdayFromDate(date) {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays[date.getDay()];
}

// Function to calculate Waste Intake totals and averages
function calculateWasteIntakeTotals(monthData) {
    const totals = {
        totalWasteIntakeLoads: 0,
        totalWasteIntakeTonnage: 0,
        totalMSWLoads: 0,
        totalMSWTonnage: 0,
        privateGTWLoads: 0,
        privateGTWTonnage: 0,
        publicAMVehicleLoads: 0,
        publicAMVehicleTonnage: 0,
        publicContractorLoads: 0,
        publicContractorTonnage: 0,
        privateMSWLoads: 0,
        privateMSWTonnage: 0
    };
    
    monthData.forEach(day => {
        totals.totalWasteIntakeLoads += day.totalWasteIntakeLoads;
        totals.totalWasteIntakeTonnage += day.totalWasteIntakeTonnage;
        totals.totalMSWLoads += day.totalMSWLoads;
        totals.totalMSWTonnage += day.totalMSWTonnage;
        totals.privateGTWLoads += day.privateGTWLoads;
        totals.privateGTWTonnage += day.privateGTWTonnage;
        totals.publicAMVehicleLoads += day.publicAMVehicleLoads;
        totals.publicAMVehicleTonnage += day.publicAMVehicleTonnage;
        totals.publicContractorLoads += day.publicContractorLoads;
        totals.publicContractorTonnage += day.publicContractorTonnage;
        totals.privateMSWLoads += day.privateMSWLoads;
        totals.privateMSWTonnage += day.privateMSWTonnage;
    });
    
    // Format to 2 decimal places for tonnage
    totals.totalWasteIntakeTonnage = parseFloat(totals.totalWasteIntakeTonnage.toFixed(2));
    totals.totalMSWTonnage = parseFloat(totals.totalMSWTonnage.toFixed(2));
    totals.privateGTWTonnage = parseFloat(totals.privateGTWTonnage.toFixed(2));
    totals.publicAMVehicleTonnage = parseFloat(totals.publicAMVehicleTonnage.toFixed(2));
    totals.publicContractorTonnage = parseFloat(totals.publicContractorTonnage.toFixed(2));
    totals.privateMSWTonnage = parseFloat(totals.privateMSWTonnage.toFixed(2));
    
    return totals;
}

// Function to calculate Waste Intake averages
function calculateWasteIntakeAverages(monthData, totals) {
    const days = monthData.length;
    const averages = {};
    
    Object.keys(totals).forEach(key => {
        if (key.includes('Tonnage')) {
            averages[key] = (totals[key] / days).toFixed(2);
        } else {
            averages[key] = (totals[key] / days).toFixed(1);
        }
    });
    
    return averages;
}

// UPDATED: showWasteIntakeTable function with complete table HTML
export function showWasteIntakeTable(month, stationName, wasteIntakeData, year) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const totals = calculateWasteIntakeTotals(wasteIntakeData);
    const averages = calculateWasteIntakeAverages(wasteIntakeData, totals);
    
    const statsContent = document.getElementById('monthlyStatsContent');
    
    statsContent.innerHTML = `
    <div class="waste-intake-container">
        <div class="waste-intake-header">
            <div class="waste-intake-title">Waste Intake for ${monthName} ${year} - ${stationName}</div>
            <div class="table-actions">
                <button class="export-btn" id="exportWasteIntakePdf">
                    Export to PDF
                </button>
                <button class="export-btn" id="exportWasteIntakeExcel">
                    Export to Excel
                </button>
            </div>
        </div>
        
        <div class="table-wrapper">
            <table class="waste-intake-data-table">
                <thead>
                    <tr>
                        <th rowspan="2" class="waste-intake-date-header">Date</th>
                        <th colspan="2" class="waste-intake-total-header">Total Waste Intake<br>(MSW+GTW)</th>
                        <th colspan="2" class="waste-intake-msw-header">Total Waste Intakes<br>(MSW)</th>
                        <th colspan="2" class="waste-intake-public-am-header">Public<br>(AM Vehicle)</th>
                        <th colspan="2" class="waste-intake-public-contractor-header">Public<br>(Government Contractor)</th>
                        <th colspan="2" class="waste-intake-private-msw-header">Private<br>(MSW)</th>
                        <th colspan="2" class="waste-intake-private-gtw-header">Private<br>(GTW)</th>
                    </tr>
                    <tr>
                        <!-- Total Waste Intake -->
                        <th class="waste-intake-subheader">Loads</th>
                        <th class="waste-intake-subheader">Tonnage</th>
                        <!-- Total MSW -->
                        <th class="waste-intake-subheader">Loads</th>
                        <th class="waste-intake-subheader">Tonnage</th>
                        <!-- Public AM Vehicle -->
                        <th class="waste-intake-subheader">Loads</th>
                        <th class="waste-intake-subheader">Tonnage</th>
                        <!-- Public Contractor -->
                        <th class="waste-intake-subheader">Loads</th>
                        <th class="waste-intake-subheader">Tonnage</th>
                        <!-- Private MSW -->
                        <th class="waste-intake-subheader">Loads</th>
                        <th class="waste-intake-subheader">Tonnage</th>
                        <!-- Private GTW -->
                        <th class="waste-intake-subheader">Loads</th>
                        <th class="waste-intake-subheader">Tonnage</th>
                    </tr>
                </thead>
                <tbody>
                    ${wasteIntakeData.map(day => {
                        const weekendStyle = day.weekday === 'Sat' || day.weekday === 'Sun' ? 'color: #ff4444;' : '';
                        return `
                            <tr>
                                <td class="waste-intake-date-cell" style="${weekendStyle}">
                                    ${day.weekday}<br>${day.date}
                                </td>
                                <td class="waste-intake-data-cell">${day.totalWasteIntakeLoads}</td>
                                <td class="waste-intake-data-cell">${day.totalWasteIntakeTonnage.toFixed(2)}</td>
                                <td class="waste-intake-data-cell">${day.totalMSWLoads}</td>
                                <td class="waste-intake-data-cell">${day.totalMSWTonnage.toFixed(2)}</td>
                                <td class="waste-intake-data-cell">${day.publicAMVehicleLoads}</td>
                                <td class="waste-intake-data-cell">${day.publicAMVehicleTonnage.toFixed(2)}</td>
                                <td class="waste-intake-data-cell">${day.publicContractorLoads}</td>
                                <td class="waste-intake-data-cell">${day.publicContractorTonnage.toFixed(2)}</td>
                                <td class="waste-intake-data-cell">${day.privateMSWLoads}</td>
                                <td class="waste-intake-data-cell">${day.privateMSWTonnage.toFixed(2)}</td>
                                <td class="waste-intake-data-cell">${day.privateGTWLoads}</td>
                                <td class="waste-intake-data-cell">${day.privateGTWTonnage.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="waste-intake-total-row">
                        <td class="waste-intake-date-cell"><strong>Total</strong></td>
                        <td><strong>${totals.totalWasteIntakeLoads}</strong></td>
                        <td><strong>${totals.totalWasteIntakeTonnage.toFixed(2)}</strong></td>
                        <td><strong>${totals.totalMSWLoads}</strong></td>
                        <td><strong>${totals.totalMSWTonnage.toFixed(2)}</strong></td>
                        <td><strong>${totals.publicAMVehicleLoads}</strong></td>
                        <td><strong>${totals.publicAMVehicleTonnage.toFixed(2)}</strong></td>
                        <td><strong>${totals.publicContractorLoads}</strong></td>
                        <td><strong>${totals.publicContractorTonnage.toFixed(2)}</strong></td>
                        <td><strong>${totals.privateMSWLoads}</strong></td>
                        <td><strong>${totals.privateMSWTonnage.toFixed(2)}</strong></td>
                        <td><strong>${totals.privateGTWLoads}</strong></td>
                        <td><strong>${totals.privateGTWTonnage.toFixed(2)}</strong></td>
                    </tr>
                    <tr class="waste-intake-average-row">
                        <td class="waste-intake-date-cell"><strong>Daily Average</strong></td>
                        <td><strong>${averages.totalWasteIntakeLoads}</strong></td>
                        <td><strong>${averages.totalWasteIntakeTonnage}</strong></td>
                        <td><strong>${averages.totalMSWLoads}</strong></td>
                        <td><strong>${averages.totalMSWTonnage}</strong></td>
                        <td><strong>${averages.publicAMVehicleLoads}</strong></td>
                        <td><strong>${averages.publicAMVehicleTonnage}</strong></td>
                        <td><strong>${averages.publicContractorLoads}</strong></td>
                        <td><strong>${averages.publicContractorTonnage}</strong></td>
                        <td><strong>${averages.privateMSWLoads}</strong></td>
                        <td><strong>${averages.privateMSWTonnage}</strong></td>
                        <td><strong>${averages.privateGTWLoads}</strong></td>
                        <td><strong>${averages.privateGTWTonnage}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="waste-intake-footer">
            <p>Data shown for ${monthName} ${year} - Daily averages calculated based on ${wasteIntakeData.length} days with recorded data</p>
        </div>
    </div>
    `;
    
    // UPDATED: Add export button event listeners with ALL required data
    setupWasteIntakeExportButtons(month, year, stationName, wasteIntakeData);
}

// UPDATED: Function to setup Waste Intake export buttons with proper data passing
function setupWasteIntakeExportButtons(month, year, stationName, wasteIntakeData) {
    const exportPdf = document.getElementById('exportWasteIntakePdf');
    const exportExcel = document.getElementById('exportWasteIntakeExcel');
    
    if (exportPdf) {
        exportPdf.addEventListener('click', () => {
            exportWasteIntakeToPdf(month, stationName, wasteIntakeData, year);
        });
    }
    
    if (exportExcel) {
        exportExcel.addEventListener('click', () => {
            exportWasteIntakeToExcel(month, stationName, wasteIntakeData, year);
        });
    }
}

// Update the loadWasteIntake function to use the new logic
export function loadWasteIntake(month) {
    console.log('Loading Waste Intake for month:', month);
    
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    const selectedStation = window.stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
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
    const wasteIntakeData = processWasteIntakeData(month, currentYear);
    
    // Check if we have data for the requested year
    const hasData = wasteIntakeData.length > 0;
    
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
    showWasteIntakeTable(month, stationName, wasteIntakeData, currentYear);
}

// Function to process period data - SEPARATE TABLES FOR EACH YEAR
export function processPeriodData(period) {
    console.log(`Processing ${period} for available years`);
    
    const currentYear = new Date().getFullYear();
    const availableYears = [];
    const yearDataMap = new Map();
    
    // Find available years with data
    for (let year = currentYear; year >= currentYear - 2; year--) {
        console.log(`Checking ${period} ${year}...`);
        const yearData = processSingleYearPeriodData(period, year);
        
        // Only include years that have actual data
        if (yearData && yearData.months.length > 0 && yearData.totalDays > 0) {
            availableYears.push(year);
            yearDataMap.set(year, yearData);
        }
    }
    
    return {
        period: period,
        availableYears: availableYears,
        yearDataMap: yearDataMap
    };
}

// Helper function to process single year data
function processSingleYearPeriodData(period, year) {
    const periodMonths = getPeriodMonths(period, year);
    
    let periodData = {
        months: [],
        totals: {
            mswLoads: 0,
            mswTons: 0,
            amVehicleLoads: 0,
            amVehicleTons: 0,
            fehdContractorLoads: 0,
            fehdContractorTons: 0,
            privateLoads: 0,
            privateTons: 0,
            gtwLoads: 0,
            gtwTonnage: 0
        },
        dailyAverages: {},
        totalDays: 0,
        year: year
    };
    
    // Process each month in the period
    periodMonths.forEach(monthInfo => {
        const monthData = processMonthDataForPeriod(monthInfo.month, monthInfo.year);
        if (monthData && monthData.days.length > 0) {
            const monthSummary = calculateMonthSummary(monthData);
            periodData.months.push({
                ...monthSummary,
                monthName: monthInfo.monthName,
                year: monthInfo.year
            });
            
            // Add to totals
            Object.keys(periodData.totals).forEach(key => {
                periodData.totals[key] += monthSummary[key];
            });
            
            periodData.totalDays += monthData.days.length;
        }
    });
    
    // Calculate daily averages
    if (periodData.totalDays > 0) {
        periodData.dailyAverages = {
            mswLoads: (periodData.totals.mswLoads / periodData.totalDays).toFixed(2),
            mswTons: (periodData.totals.mswTons / periodData.totalDays).toFixed(2),
            amVehicleLoads: (periodData.totals.amVehicleLoads / periodData.totalDays).toFixed(2),
            amVehicleTons: (periodData.totals.amVehicleTons / periodData.totalDays).toFixed(2),
            fehdContractorLoads: (periodData.totals.fehdContractorLoads / periodData.totalDays).toFixed(2),
            fehdContractorTons: (periodData.totals.fehdContractorTons / periodData.totalDays).toFixed(2),
            privateLoads: (periodData.totals.privateLoads / periodData.totalDays).toFixed(2),
            privateTons: (periodData.totals.privateTons / periodData.totalDays).toFixed(2),
            gtwLoads: (periodData.totals.gtwLoads / periodData.totalDays).toFixed(2),
            gtwTonnage: (periodData.totals.gtwTonnage / periodData.totalDays).toFixed(2)
        };
    }
    
    return periodData;
}

// Function to get months for each period
function getPeriodMonths(period, year) {
    const months = [
        { month: 'january', monthName: 'Jan', number: 0 },
        { month: 'february', monthName: 'Feb', number: 1 },
        { month: 'march', monthName: 'Mar', number: 2 },
        { month: 'april', monthName: 'Apr', number: 3 },
        { month: 'may', monthName: 'May', number: 4 },
        { month: 'june', monthName: 'Jun', number: 5 },
        { month: 'july', monthName: 'Jul', number: 6 },
        { month: 'august', monthName: 'Aug', number: 7 },
        { month: 'september', monthName: 'Sep', number: 8 },
        { month: 'october', monthName: 'Oct', number: 9 },
        { month: 'november', monthName: 'Nov', number: 10 },
        { month: 'december', monthName: 'Dec', number: 11 }
    ];
    
    switch(period) {
        case 'q1':
            return months.slice(0, 3).map(m => ({...m, year}));
        case 'q2':
            return months.slice(3, 6).map(m => ({...m, year}));
        case 'q3':
            return months.slice(6, 9).map(m => ({...m, year}));
        case 'q4':
            return months.slice(9, 12).map(m => ({...m, year}));
        case 'h1':
            return months.slice(0, 6).map(m => ({...m, year}));
        case 'h2':
            return months.slice(6, 12).map(m => ({...m, year}));
        case 'annual':
            return months.map(m => ({...m, year}));
        default:
            return [];
    }
}

// Function to process month data for period reports
function processMonthDataForPeriod(month, year) {
    const monthIndex = getMonthIndex(month);
    const monthData = {
        days: [],
        month: month,
        year: year
    };
    
    // We need access to wktsData - this will be provided by monthly-stats.js
    const wktsData = window.wktsData || [];
            
    // STRICT Filter data for the specific month and year
    const monthRecords = wktsData.filter(record => {
        // Basic validation
        if (!record.日期 || !record.入磅時間 || record.交收狀態 !== '完成') {
            return false;
        }
        
        try {
            const dateParts = record.日期.split('/');
            if (dateParts.length !== 3) return false;
            
            const day = parseInt(dateParts[0]);
            const recordMonth = parseInt(dateParts[1]);
            const recordYear = parseInt(dateParts[2]);
            
            // STRICT YEAR CHECK - must match exactly
            if (recordYear !== year) {
                return false;
            }
            
            const recordDate = new Date(recordYear, recordMonth - 1, day);
            return recordDate.getMonth() === monthIndex;
            
        } catch (error) {
            console.log('Error parsing date in record:', record, error);
            return false;
        }
    });    
    
    if (monthRecords.length === 0) {
        return monthData; // Return empty month data
    } else {
        monthData.days = groupRecordsByDate(monthRecords);
        return monthData;
    }
}

// FIXED: Function to group records by date - COMPLETE categorization logic
function groupRecordsByDate(records) {
    const recordsByDate = {};
    let recordCount = 0;
    
    records.forEach(record => {
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
            recordCount++;
            
        } catch (error) {
            console.log('Error processing record date:', error);
        }
    });
        
    // Convert to array and process each day
    return Object.keys(recordsByDate).map(dateKey => {
        const records = recordsByDate[dateKey];
        const [year, month, day] = dateKey.split('-').map(Number);
        
        const dayData = {
            date: `${day.toString().padStart(2, '0')}/${month}/${year}`,
            // Initialize counters
            mswLoads: 0,
            mswTons: 0,
            amVehicleLoads: 0,
            amVehicleTons: 0,
            fehdContractorLoads: 0,
            fehdContractorTons: 0,
            privateLoads: 0,
            privateTons: 0,
            gtwLoads: 0,
            gtwTonnage: 0
        };
        
        // FIXED: COMPLETE categorization logic for period tables
        records.forEach(record => {
            const vehicleTask = record.車輛任務 || '';
            const weight = parseFloat(record.物料重量) || 0;
            
            // MSW Categories
            if (vehicleTask === 'C31 食環署外判車傾倒' || 
                vehicleTask === 'P99 私人車傾倒' || 
                vehicleTask === 'G01 食環署傾倒') {
                dayData.mswLoads++;
                dayData.mswTons += weight;
                
                // Breakdown within MSW
                if (vehicleTask === 'G01 食環署傾倒') {
                    dayData.amVehicleLoads++;
                    dayData.amVehicleTons += weight;
                } else if (vehicleTask === 'C31 食環署外判車傾倒') {
                    dayData.fehdContractorLoads++;
                    dayData.fehdContractorTons += weight;
                } else if (vehicleTask === 'P99 私人車傾倒') {
                    dayData.privateLoads++;
                    dayData.privateTons += weight;
                }
            }
            // GTW Category
            else if (vehicleTask === 'P97 油脂傾倒(私人車）') {
                dayData.gtwLoads++;
                dayData.gtwTonnage += weight;
            }
        });
        
        // Round tonnage values
        dayData.mswTons = parseFloat(dayData.mswTons.toFixed(2));
        dayData.amVehicleTons = parseFloat(dayData.amVehicleTons.toFixed(2));
        dayData.fehdContractorTons = parseFloat(dayData.fehdContractorTons.toFixed(2));
        dayData.privateTons = parseFloat(dayData.privateTons.toFixed(2));
        dayData.gtwTonnage = parseFloat(dayData.gtwTonnage.toFixed(2));
        
        return dayData;
    });
}

// Function to calculate month summary for period reports
function calculateMonthSummary(monthData) {
    const summary = {
        mswLoads: 0,
        mswTons: 0,
        amVehicleLoads: 0,
        amVehicleTons: 0,
        fehdContractorLoads: 0,
        fehdContractorTons: 0,
        privateLoads: 0,
        privateTons: 0,
        gtwLoads: 0,
        gtwTonnage: 0
    };
    
    monthData.days.forEach(day => {
        summary.mswLoads += day.mswLoads;
        summary.mswTons += day.mswTons;
        summary.amVehicleLoads += day.amVehicleLoads;
        summary.amVehicleTons += day.amVehicleTons;
        summary.fehdContractorLoads += day.fehdContractorLoads;
        summary.fehdContractorTons += day.fehdContractorTons;
        summary.privateLoads += day.privateLoads;
        summary.privateTons += day.privateTons;
        summary.gtwLoads += day.gtwLoads;
        summary.gtwTonnage += day.gtwTonnage;
    });
    
    // Round to 2 decimal places for tons
    summary.mswTons = parseFloat(summary.mswTons.toFixed(2));
    summary.amVehicleTons = parseFloat(summary.amVehicleTons.toFixed(2));
    summary.fehdContractorTons = parseFloat(summary.fehdContractorTons.toFixed(2));
    summary.privateTons = parseFloat(summary.privateTons.toFixed(2));
    summary.gtwTonnage = parseFloat(summary.gtwTonnage.toFixed(2));
    
    return summary;
}

// UPDATED: Function to show period table with proper CSS classes
export function showPeriodTable(period, stationName, periodData) {
    // Check if we have valid data
    if (!periodData || !periodData.availableYears || periodData.availableYears.length === 0) {
        const statsContent = document.getElementById('monthlyStatsContent');
        statsContent.innerHTML = `
            <div class="no-data-message">
                <h3>No Data Available</h3>
                <p>No transaction records found for ${getPeriodDisplayName(period)} in available years.</p>
                <p>Only showing tables for years with actual data.</p>
            </div>
        `;
        return;
    }
    
    const statsContent = document.getElementById('monthlyStatsContent');
    let tablesHTML = '';
    
    // Sort years in descending order (most recent first)
    const sortedYears = [...periodData.availableYears].sort((a, b) => b - a);
        
    // Create separate table for each year WITH DATA
    sortedYears.forEach((year, index) => {
        const yearData = periodData.yearDataMap.get(year);
        // Double-check that we have data before creating table
        if (yearData && yearData.months.length > 0 && yearData.totalDays > 0) {
            tablesHTML += createYearTable(period, stationName, yearData, year, index);            
        } else {
            console.log(`❌ Skipping ${year} - no valid data`);
        }
    });
    
    // If no tables were created after all checks
    if (tablesHTML === '') {
        statsContent.innerHTML = `
            <div class="no-data-message">
                <h3>No Data Available</h3>
                <p>No transaction records found for ${getPeriodDisplayName(period)}.</p>
                <p>Please check if the data file contains records for the selected period.</p>
            </div>
        `;
        return;
    }
    
    statsContent.innerHTML = tablesHTML;
    
    // Add export button event listeners for each table
    sortedYears.forEach((year, index) => {
        setupPeriodExportButtons(period, stationName, periodData.yearDataMap.get(year), year, index);
    });
}

// UPDATED: Function to create individual year table with CSS classes
function createYearTable(period, stationName, yearData, year, tableIndex) {
    const periodName = getPeriodDisplayName(period);
    
    return `
    <div class="period-table-container">
        <div class="period-table-header">
            <div class="period-table-title">Monthly Statistics: ${periodName} ${year} - ${stationName}</div>
            <div class="table-actions">
                <button class="export-btn" id="exportPeriodPdf${tableIndex}">
                    Export to PDF
                </button>
                <button class="export-btn" id="exportPeriodExcel${tableIndex}">
                    Export to Excel
                </button>
            </div>
        </div>
        
        <div class="table-wrapper">
            <table class="period-data-table">
                <thead>
                    <tr>
                        <th rowspan="2" class="period-month-header">Month</th>
                        <th colspan="8" class="period-msw-header">MSW</th>
                        <th colspan="2" class="period-gtw-header">GTW</th>
                    </tr>
                    <tr>
                        <!-- MSW Columns -->
                        <th class="period-subheader">Loads</th>
                        <th class="period-subheader">Tons<br>(ALL MSW)</th>
                        <th class="period-subheader">AM Vehicle<br>Loads</th>
                        <th class="period-subheader">Tons</th>
                        <th class="period-subheader">FEHD Contractor<br>Loads</th>
                        <th class="period-subheader">Tons</th>
                        <th class="period-subheader">Private<br>Loads</th>
                        <th class="period-subheader">Tons</th>
                        
                        <!-- GTW Columns -->
                        <th class="period-subheader">Loads</th>
                        <th class="period-subheader">Tonnage</th>
                    </tr>
                </thead>
                <tbody>
                    ${yearData.months.map(month => {
                        const monthYear = `${month.monthName}-${year.toString().slice(2)}`;
                        return `
                            <tr>
                                <td class="period-month-cell">${monthYear}</td>
                                <td class="period-data-cell">${(month.mswLoads || 0).toLocaleString()}</td>
                                <td class="period-data-cell">${(month.mswTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="period-data-cell">${(month.amVehicleLoads || 0).toLocaleString()}</td>
                                <td class="period-data-cell">${(month.amVehicleTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="period-data-cell">${(month.fehdContractorLoads || 0).toLocaleString()}</td>
                                <td class="period-data-cell">${(month.fehdContractorTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="period-data-cell">${(month.privateLoads || 0).toLocaleString()}</td>
                                <td class="period-data-cell">${(month.privateTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td class="period-data-cell">${(month.gtwLoads || 0).toLocaleString()}</td>
                                <td class="period-data-cell">${(month.gtwTonnage || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr class="period-total-row">
                        <td class="period-month-cell"><strong>Total</strong></td>
                        <td><strong>${(yearData.totals.mswLoads || 0).toLocaleString()}</strong></td>
                        <td><strong>${(yearData.totals.mswTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                        <td><strong>${(yearData.totals.amVehicleLoads || 0).toLocaleString()}</strong></td>
                        <td><strong>${(yearData.totals.amVehicleTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                        <td><strong>${(yearData.totals.fehdContractorLoads || 0).toLocaleString()}</strong></td>
                        <td><strong>${(yearData.totals.fehdContractorTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                        <td><strong>${(yearData.totals.privateLoads || 0).toLocaleString()}</strong></td>
                        <td><strong>${(yearData.totals.privateTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                        <td><strong>${(yearData.totals.gtwLoads || 0).toLocaleString()}</strong></td>
                        <td><strong>${(yearData.totals.gtwTonnage || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    </tr>
                    <tr class="period-average-row">
                        <td class="period-month-cell"><strong>Daily Average</strong></td>
                        <td><strong>${yearData.dailyAverages.mswLoads || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.mswTons || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.amVehicleLoads || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.amVehicleTons || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.fehdContractorLoads || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.fehdContractorTons || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.privateLoads || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.privateTons || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.gtwLoads || '0.00'}</strong></td>
                        <td><strong>${yearData.dailyAverages.gtwTonnage || '0.00'}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="period-footer">
            <p>Daily averages are based on ${yearData.totalDays || 0} days with recorded data in ${year}.</p>
        </div>
    </div>
    `;
}

// Function to get display name for period
function getPeriodDisplayName(period) {
    const periodNames = {
        'q1': 'Q1 (Jan-Mar)',
        'q2': 'Q2 (Apr-Jun)',
        'q3': 'Q3 (Jul-Sep)',
        'q4': 'Q4 (Oct-Dec)',
        'h1': 'H1 (Jan-Jun)',
        'h2': 'H2 (Jul-Dec)',
        'annual': 'Annual (Jan-Dec)'
    };
    return periodNames[period] || period.toUpperCase();
}

// UPDATED: Function to setup period export buttons with proper data passing
function setupPeriodExportButtons(period, stationName, yearData, year, tableIndex) {
    const exportPdf = document.getElementById(`exportPeriodPdf${tableIndex}`);
    const exportExcel = document.getElementById(`exportPeriodExcel${tableIndex}`);
    
    if (exportPdf) {
        exportPdf.addEventListener('click', () => {
            exportPeriodToPdf(period, stationName, yearData, year);
        });
    }
    
    if (exportExcel) {
        exportExcel.addEventListener('click', () => {
            exportPeriodToExcel(period, stationName, yearData, year);
        });
    }
}

export function loadPeriodStats(period) {
    console.log('Loading stats for period:', period);
    
    const selectedStationId = localStorage.getItem('stationId') || 'wkts';
    const selectedStation = window.stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
    const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
    
    const statsContent = document.getElementById('monthlyStatsContent');
    statsContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading ${period.toUpperCase()} statistics for ${stationName}...</p>
            <p>Checking available data for ${new Date().getFullYear()}, ${new Date().getFullYear()-1}, ${new Date().getFullYear()-2}</p>
        </div>
    `;
    
    // Process data for available years
    const periodData = processPeriodData(period);
         
    // Show the period tables - will only show tables for years with data
    showPeriodTable(period, stationName, periodData);
}

// Make wktsData available globally
export function setWktsData(data) {
    window.wktsData = data;
}

export function setStations(data) {
    window.stations = data;
}

// Make functions available globally for monthly-stats.js
window.processWasteIntakeData = processWasteIntakeData;
window.showWasteIntakeTable = showWasteIntakeTable;
window.loadWasteIntake = loadWasteIntake;