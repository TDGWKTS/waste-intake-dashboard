// monthly-stats.js - Fully Revised & Optimized (November 2025)
// Supports yearly data (wkts2023.json → wkts2025.json+), caching, multi-station, exports, tooltips

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

// Global raw & processed data
let wktsData = [];
const cache = {
    monthly: {},  // key: "january-2025" → processed day array
    hourly: {}    // key: "january-2025" → {timeSlots, dailyLoads, dailyWeights, dates}
};

// Load raw WKTS data (supports yearly files + legacy fallback)
async function loadWktsData() {
    try {
        const currentYear = new Date().getFullYear();
        let data = [];

        for (let year = currentYear; year >= 2023; year--) {
            const yearly = await loadYearlyData('wkts', year);
            if (yearly.length > 0) {
                data = yearly;
                console.log(`Loaded wkts${year}.json (${data.length} records)`);
                break;
            }
        }

        if (data.length === 0) {
            const legacy = await fetch('data/wkts.json').then(r => r.ok ? r.json() : []);
            if (legacy.length > 0) {
                data = legacy;
                console.log('Loaded legacy wkts.json');
            }
        }

        wktsData = data;
        setWktsData(wktsData);
        setStations(stations);
        console.log('WKTS data ready:', wktsData.length, 'records');
    } catch (err) {
        console.error('Failed to load WKTS data:', err);
    }
}

async function loadYearlyData(stationId, year) {
    try {
        const res = await fetch(`data/${stationId.toLowerCase()}${year}.json`);
        if (res.ok) return await res.json();
    } catch (_) { /* silent */ }
    return [];
}

// Helper: find latest year that has data for a processor
async function findLatestYear(processor, month = null) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2023; y--) {
        const data = month ? processor(month, y) : processor(y);
        const has = Array.isArray(data) ? data.length > 0 : Object.keys(data || {}).length > 0;
        if (has) return { year: y, data };
    }
    return { year: null, data: null };
}

// Cached processors
function getMonthlyData(month, year) {
    const key = `${month}-${year}`;
    if (!cache.monthly[key]) cache.monthly[key] = processMonthData(month, year);
    return cache.monthly[key];
}

function getHourlyData(month, year) {
    const key = `${month}-${year}`;
    if (!cache.hourly[key]) cache.hourly[key] = processHourlyData(month, year);
    return cache.hourly[key];
}

// ======================== MONTHLY PROCESSING ========================
function processMonthData(month, year) {
    const monthIdx = getMonthIndex(month);
    const records = wktsData.filter(r => {
        if (!r.日期 || !r.入磅時間 || r.交收狀態 !== '完成') return false;
        const [d, m, y] = r.日期.split('/').map(Number);
        return y === year && (m - 1) === monthIdx;
    });

    const byDate = {};
    records.forEach(r => {
        const key = r.日期.split('/').reverse().join('-');
        (byDate[key] ??= []).push(r);
    });

    const days = Object.keys(byDate).map(dateKey => {
        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const day = {
            date: `${d.toString().padStart(2, '0')}/${m}/${y}`,
            isWeekend: [0, 6].includes(dateObj.getDay()),
            domesticWasteLoads: 0, domesticWasteTonnes: 0,
            gullyWasteLoads: 0, gullyWasteTonnes: 0,
            publicNormalLoads: 0, publicNormalTonnes: 0,
            privateLoads: 0, privateTonnes: 0,
            greaseTrapLoads: 0, greaseTrapTonnes: 0
        };

        byDate[dateKey].forEach(r => {
            const [h, min] = r.入磅時間.split(':').map(Number);
            const mins = h * 60 + min;
            const weight = parseFloat(r.物料重量) || 0;
            const task = r.車輛任務 || '';
            const type = r.廢物類別 || '';

            if (task === 'C31 食環署外判車傾倒' && mins >= 265 && mins <= 445 && type !== '家居垃圾 - 坑渠垃圾、砂礫、沙泥和碎石') {
                day.domesticWasteLoads++; day.domesticWasteTonnes += weight;
            }
            if (task === 'C31 食環署外判車傾倒' && type === '家居垃圾 - 坑渠垃圾、砂礫、沙泥和碎石' && mins >= 265 && mins <= 445) {
                day.gullyWasteLoads++; day.gullyWasteTonnes += weight;
            }
            if ((task === 'C31 食環署外判車傾倒' || task === 'G01 食環署傾倒') && mins >= 446) {
                day.publicNormalLoads++; day.publicNormalTonnes += weight;
            }
            if (task === 'P99 私人車傾倒' && mins >= 446) {
                day.privateLoads++; day.privateTonnes += weight;
            }
            if (task === 'P97 油脂傾倒(私人車）') {
                day.greaseTrapLoads++; day.greaseTrapTonnes += weight;
            }
        });

        // Round tonnes
        day.domesticWasteTonnes = day.domesticWasteTonnes.toFixed(2);
        day.gullyWasteTonnes = day.gullyWasteTonnes.toFixed(2);
        day.publicNormalTonnes = day.publicNormalTonnes.toFixed(2);
        day.privateTonnes = day.privateTonnes.toFixed(2);
        day.greaseTrapTonnes = day.greaseTrapTonnes.toFixed(2);

        day.dailyTotalLoads = day.domesticWasteLoads + day.gullyWasteLoads + day.publicNormalLoads + day.privateLoads;
        day.dailyTotalTonnes = (parseFloat(day.domesticWasteTonnes) + parseFloat(day.gullyWasteTonnes) +
            parseFloat(day.publicNormalTonnes) + parseFloat(day.privateTonnes)).toFixed(2);

        return day;
    });

    days.sort((a, b) => a.date.split('/').reverse().join('-').localeCompare(b.date.split('/').reverse().join('-')));
    return days;
}

// ======================== HOURLY PROCESSING ========================
// CORRECTED Time Slot Generation
function generateTimeSlots() {
    const slots = [
        '04:30 - 06:59',    // Early morning extended hours
        '07:00 - 07:59',    // Hourly slots
        '08:00 - 08:59',
        '09:00 - 09:59',
        '10:00 - 10:59',
        '11:00 - 11:59',
        '12:00 - 12:59',
        '13:00 - 13:59',
        '14:00 - 14:59',
        '15:00 - 15:59',
        '16:00 - 16:59',
        '17:00 - 17:59',
        '18:00 - 18:59',
        '19:00 - 19:59',
        '20:00 - 20:59',
        '21:00 - 21:59',
        '22:00 - 22:59',
        '23:00 - 23:29',    // Fixed: Added this missing slot!
        '23:30 - 04:29'     // Overnight slot (next day)
    ];
    return slots;
}

// FINAL CORRECTED HOURLY PROCESSING
function processHourlyData(month, year) {
    const monthIdx = getMonthIndex(month);
    const records = wktsData.filter(r => {
        if (!r.日期 || !r.入磅時間 || r.交收狀態 !== '完成') return false;
        const [d, m, y] = r.日期.split('/').map(Number);
        return y === year && (m - 1) === monthIdx;
    });

    console.log(`📊 Processing ${records.length} records for hourly data in ${month} ${year}`);

    const dates = [...new Set(records.map(r => r.日期))].sort();
    const timeSlots = generateTimeSlots();

    const dailyLoads = {}, dailyWeights = {};
    dates.forEach(d => {
        dailyLoads[d] = {};
        dailyWeights[d] = {};
        timeSlots.forEach(s => { 
            dailyLoads[d][s] = 0; 
            dailyWeights[d][s] = 0; 
        });
    });

    records.forEach(r => {
        if (!['P99 私人車傾倒', 'G01 食環署傾倒', 'C31 食環署外判車傾倒'].includes(r.車輛任務)) return;

        const [h, min] = r.入磅時間.split(':').map(Number);
        const mins = h * 60 + min;
        const weight = parseFloat(r.物料重量) || 0;

        let slot = '';
        
        // 04:30 - 06:59 (270 - 419 minutes)
        if (mins >= 270 && mins <= 419) {
            slot = '04:30 - 06:59';
        }
        // 07:00 - 22:59 (420 - 1379 minutes) - Hourly slots
        else if (mins >= 420 && mins <= 1379) {
            const hour = Math.floor(mins / 60);
            slot = `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:59`;
        }
        // 23:00 - 23:29 (1380 - 1409 minutes)
        else if (mins >= 1380 && mins <= 1409) {
            slot = '23:00 - 23:29';
        }
        // 23:30 - 04:29 (1410 - 1439 OR 0 - 269 minutes) - Overnight (next day)
        else if ((mins >= 1410 && mins <= 1439) || (mins >= 0 && mins <= 269)) {
            slot = '23:30 - 04:29';
        }

        if (slot && dailyLoads[r.日期]) {
            dailyLoads[r.日期][slot]++;
            dailyWeights[r.日期][slot] += weight;
        } else {
            console.log(`❌ No slot found for time: ${r.入磅時間} (${mins} minutes)`);
        }
    });

    // Debug: Show final slot counts
    const slotCounts = {};
    let totalLoads = 0;
    timeSlots.forEach(slot => {
        slotCounts[slot] = 0;
        dates.forEach(date => {
            slotCounts[slot] += dailyLoads[date][slot] || 0;
        });
        totalLoads += slotCounts[slot];
    });
    
    console.log('📊 Final slot distribution:', slotCounts);
    console.log(`📈 Total loads assigned: ${totalLoads} out of ${records.length} records`);

    return { timeSlots, dailyLoads, dailyWeights, dates };
}

// ======================== UTILITIES ========================
function getMonthIndex(m) {
    return ['january','february','march','april','may','june','july','august','september','october','november','december']
        .indexOf(m.toLowerCase());
}

function isWeekend(d) { const [day, mon, yr] = d.split('/').map(Number); return new Date(yr, mon-1, day).getDay() % 6 === 0; }
function isSunday(d) { const [day, mon, yr] = d.split('/').map(Number); return new Date(yr, mon-1, day).getDay() === 0; }
function getWeekday(d) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const [day, mon, yr] = d.split('/').map(Number);
    return days[new Date(yr, mon-1, day).getDay()];
}

function calculateTotals(data) {
    const t = {
        domesticWasteLoads: 0, domesticWasteTonnes: 0,
        gullyWasteLoads: 0, gullyWasteTonnes: 0,
        publicNormalLoads: 0, publicNormalTonnes: 0,
        privateLoads: 0, privateTonnes: 0,
        dailyTotalLoads: 0, dailyTotalTonnes: 0,
        greaseTrapLoads: 0, greaseTrapTonnes: 0
    };
    data.forEach(d => {
        t.domesticWasteLoads += d.domesticWasteLoads;
        t.domesticWasteTonnes += parseFloat(d.domesticWasteTonnes);
        t.gullyWasteLoads += d.gullyWasteLoads;
        t.gullyWasteTonnes += parseFloat(d.gullyWasteTonnes);
        t.publicNormalLoads += d.publicNormalLoads;
        t.publicNormalTonnes += parseFloat(d.publicNormalTonnes);
        t.privateLoads += d.privateLoads;
        t.privateTonnes += parseFloat(d.privateTonnes);
        t.dailyTotalLoads += d.dailyTotalLoads;
        t.dailyTotalTonnes += parseFloat(d.dailyTotalTonnes);
        t.greaseTrapLoads += d.greaseTrapLoads;
        t.greaseTrapTonnes += parseFloat(d.greaseTrapTonnes);
    });
    Object.keys(t).forEach(k => t[k] = k.includes('Tonnes') ? t[k].toFixed(2) : t[k]);
    return t;
}

function calculateAverages(data) {
    const tot = calculateTotals(data);
    const days = data.length;
    const avg = {};
    Object.keys(tot).forEach(k => {
        avg[k] = k.includes('Tonnes')
            ? (parseFloat(tot[k]) / days).toFixed(2)
            : Math.round(tot[k] / days);
    });
    return avg;
}

// ======================== HOURLY TABLE FUNCTIONS ========================
function showHourlyTable(month, stationName, hourlyData, year) {
    const { timeSlots, dailyLoads, dailyWeights, dates } = hourlyData;
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    
    // Calculate totals and averages
    const { totals, averages } = calculateHourlyTotals(timeSlots, dates, dailyLoads);
    
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
            const loadCount = dailyLoads[date][timeSlot];
            const weight = dailyWeights[date][timeSlot];
            const isWeekendDay = isWeekend(date);
            const weekendClass = isWeekendDay ? 'weekend-data' : '';
            
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
            dateTotal += dailyLoads[date][slot] || 0;
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

function setupHourlyExportButtons(month, year) {
    const exportPdf = document.getElementById('exportHourlyPdf');
    const exportExcel = document.getElementById('exportHourlyExcel');
    
    if (exportPdf) {
        exportPdf.addEventListener('click', () => {
            const selectedStationId = localStorage.getItem('stationId') || 'wkts';
            const selectedStation = stations.find(s => s.id.toLowerCase() === selectedStationId.toLowerCase());
            const stationName = selectedStation ? selectedStation.name.split(' - ')[0] : 'Unknown Station';
            
            // Get current hourly data for the specific year
            const hourlyData = getHourlyData(month, year);
            
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
            const hourlyData = getHourlyData(month, year);
            
            // Check if we have data before exporting
            if (hourlyData.dates.length > 0) {
                exportHourlyToExcel(month, stationName, hourlyData, getWeekday, calculateHourlyTotals, year);
            } else {
                alert('No data available to export for the selected month and year.');
            }
        });
    }
}

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

// ======================== MONTHLY TABLE RENDERER ========================
function showMonthlyTable(month, stationName, monthData, year) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const totals = calculateTotals(monthData);
    const averages = calculateAverages(monthData);

    // Inject bold orange left border style once
    if (!document.getElementById('gtw-orange-border-style')) {
        const style = document.createElement('style');
        style.id = 'gtw-orange-border-style';
        style.textContent = `
            .gtw-left-orange-bold {
                border-left: 4px solid #ffaa00 !important;
                font-weight: bold !important;
                background-color: rgba(255, 170, 0, 0.05) !important;
            }
        `;
        document.head.appendChild(style);
    }

    document.getElementById('monthlyStatsContent').innerHTML = `
    <div class="monthly-table-container">
        <div class="monthly-table-header">
            <div class="monthly-table-title">Daily Transaction Log for MSW and GTW – ${monthName} ${year}</div>
            <div class="table-actions">
                <button class="export-btn" id="exportMonthlyPdf">Export to PDF</button>
                <button class="export-btn" id="exportMonthlyExcel">Export to Excel</button>
            </div>
        </div>
        <div class="table-wrapper">
            <table class="monthly-data-table">
                <thead>
                    <tr>
                        <th rowspan="4" class="transaction-date header-public">Transaction Date</th>
                        <th colspan="6" class="header-public">Publicly Collected Waste</th>
                        <th colspan="2" class="header-private">Privately Collected Waste</th>
                        <th colspan="2" class="header-total">Daily Total</th>
                        <th colspan="2" class="header-grease">Grease Trap Waste</th>
                    </tr>
                    <tr>
                        <th colspan="4" class="header-public">Extended Reception Hours (0430-0730)</th>
                        <th colspan="2" class="header-public">Normal (0730-2330)</th>
                        <th colspan="2" class="header-private">Normal (0730-2330)</th>
                        <th colspan="2" class="header-total"></th>
                        <th colspan="2" class="header-grease"></th>
                    </tr>
                    <tr>
                        <th colspan="2" class="header-public">Domestic Waste</th>
                        <th colspan="2" class="header-public">Gully Waste (D06)</th>
                        <th colspan="2" class="header-public"></th>
                        <th colspan="2" class="header-private"></th>
                        <th colspan="2" class="header-total"></th>
                        <th colspan="2" class="header-grease"></th>
                    </tr>
                    <tr class="column-labels">
                        <th class="header-public">Loads</th><th class="header-public">Tonnes</th>
                        <th class="header-public">Loads</th><th class="header-public">Tonnes</th>
                        <th class="header-public">Loads</th><th class="header-public">Tonnes</th>
                        <th class="header-private">Loads</th><th class="header-private">Tonnes</th>
                        <th class="header-total">Loads</th><th class="header-total">Tonnes</th>
                        <th class="header-grease gtw-left-orange-bold">Loads</th>
                        <th class="header-grease">Tonnes</th>
                    </tr>
                </thead>
                <tbody>
                    ${monthData.map(d => `
                        <tr class="${isSunday(d.date) ? 'sunday-row' : ''}">
                            <td class="transaction-date ${d.isWeekend ? 'weekend-date' : ''}">${d.date}</td>
                            <td>${d.domesticWasteLoads}</td><td>${d.domesticWasteTonnes}</td>
                            <td>${d.gullyWasteLoads}</td><td>${d.gullyWasteTonnes}</td>
                            <td>${d.publicNormalLoads}</td><td>${d.publicNormalTonnes}</td>
                            <td>${d.privateLoads}</td><td>${d.privateTonnes}</td>
                            <td>${d.dailyTotalLoads}</td><td>${d.dailyTotalTonnes}</td>
                            <td class="gtw-left-orange-bold">${d.greaseTrapLoads}</td>
                            <td>${d.greaseTrapTonnes}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td>Total</td>
                        <td>${totals.domesticWasteLoads}</td><td>${totals.domesticWasteTonnes}</td>
                        <td>${totals.gullyWasteLoads}</td><td>${totals.gullyWasteTonnes}</td>
                        <td>${totals.publicNormalLoads}</td><td>${totals.publicNormalTonnes}</td>
                        <td>${totals.privateLoads}</td><td>${totals.privateTonnes}</td>
                        <td>${totals.dailyTotalLoads}</td><td>${totals.dailyTotalTonnes}</td>
                        <td class="gtw-left-orange-bold">${totals.greaseTrapLoads}</td><td>${totals.greaseTrapTonnes}</td>
                    </tr>
                    <tr class="average-row">
                        <td>Daily Avg</td>
                        <td>${averages.domesticWasteLoads}</td><td>${averages.domesticWasteTonnes}</td>
                        <td>${averages.gullyWasteLoads}</td><td>${averages.gullyWasteTonnes}</td>
                        <td>${averages.publicNormalLoads}</td><td>${averages.publicNormalTonnes}</td>
                        <td>${averages.privateLoads}</td><td>${averages.privateTonnes}</td>
                        <td>${averages.dailyTotalLoads}</td><td>${averages.dailyTotalTonnes}</td>
                        <td class="gtw-left-orange-bold">${averages.greaseTrapLoads}</td><td>${averages.greaseTrapTonnes}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>`;

    setupMonthlyExportButtons(month, year);
}

function setupMonthlyExportButtons(month, year) {
    document.getElementById('exportMonthlyPdf')?.addEventListener('click', () => {
        const data = getMonthlyData(month, year);
        if (data.length === 0) return alert('No data to export');
        const station = stations.find(s => s.id.toLowerCase() === (localStorage.getItem('stationId') || 'wkts').toLowerCase());
        exportMonthlyToPdf(month, station?.name.split(' - ')[0] || 'Station', data, calculateTotals, calculateAverages, year);
    });
    document.getElementById('exportMonthlyExcel')?.addEventListener('click', () => {
        const data = getMonthlyData(month, year);
        if (data.length === 0) return alert('No data to export');
        const station = stations.find(s => s.id.toLowerCase() === (localStorage.getItem('stationId') || 'wkts').toLowerCase());
        exportMonthlyToExcel(month, station?.name.split(' - ')[0] || 'Station', data, calculateTotals, calculateAverages, year);
    });
}

// ======================== LOADERS ========================
async function loadMonthStats(month) {
    const content = document.getElementById('monthlyStatsContent');
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading ${month} data...</p></div>`;

    const { year, data: rawData } = await findLatestYear(processMonthData, month);
    if (!year || rawData.length === 0) {
        content.innerHTML = `<div class="no-data-message"><h3>No Data Available</h3><p>No records found for ${month}.</p></div>`;
        return;
    }

    const station = stations.find(s => s.id.toLowerCase() === (localStorage.getItem('stationId') || 'wkts').toLowerCase());
    showMonthlyTable(month, station?.name.split(' - ')[0] || 'Station', rawData, year);
}

async function loadHourlyStats(month) {
    const content = document.getElementById('monthlyStatsContent');
    content.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading hourly data...</p></div>`;

    const { year, data: rawData } = await findLatestYear(processHourlyData, month);
    if (!year || rawData.dates.length === 0) {
        content.innerHTML = `<div class="hourly-no-data"><h3>No Hourly Data</h3><p>No matching records found.</p></div>`;
        return;
    }

    const station = stations.find(s => s.id.toLowerCase() === (localStorage.getItem('stationId') || 'wkts').toLowerCase());
    showHourlyTable(month, station?.name.split(' - ')[0] || 'Station', rawData, year);
}

// ======================== WASTE INTAKE LOADER ========================
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
    
    // Try years from current year down to 2023
    const currentYear = new Date().getFullYear();
    let foundYear = currentYear;
    
    try {
        let wasteIntakeData = null;
        
        for (let year = currentYear; year >= 2023; year--) {
            wasteIntakeData = window.processWasteIntakeData(month, year);
            if (wasteIntakeData && wasteIntakeData.length > 0) {
                foundYear = year;
                console.log(`✅ Found waste intake data for ${month} ${year}`);
                break;
            }
        }
        
        const hasData = wasteIntakeData && wasteIntakeData.length > 0;
        
        if (!hasData) {
            statsContent.innerHTML = `
                <div class="no-data-message">
                    <h3>No Waste Intake Data Available</h3>
                    <p>No completed transaction records found for ${month} (2023-${currentYear}).</p>
                    <p>Please check if:</p>
                    <ul>
                        <li>The data file contains records for this month</li>
                        <li>The date formats in the data are correct</li>
                        <li>There are completed transactions (交收狀態: 完成)</li>
                    </ul>
                </div>
            `;
            return;
        }
        
        // Show the Waste Intake table with data
        window.showWasteIntakeTable(month, stationName, wasteIntakeData, foundYear);
        
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

// ======================== PAGE RENDER & INIT ========================
export function renderMonthlyStats() {
    const stationId = localStorage.getItem('stationId') || 'wkts';
    const station = stations.find(s => s.id.toLowerCase() === stationId.toLowerCase()) || stations[0];
    const namePart = station.name.split(' - ')[0];

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
                    ${stations.map(station => {
                        const isActive = station.id.toLowerCase() === stationId.toLowerCase();
                        return `
                            <div class="station-item ${isActive ? 'active' : ''}" data-station="${station.id.toLowerCase()}">
                                <div class="station-checkbox ${isActive ? 'checked' : ''}"></div>
                                <div class="station-name-text">${station.id}</div>
                            </div>
                        `;
                    }).join('')}
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

export async function initializeMonthlyStats() {
    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'index.html';
        return;
    }

    await loadWktsData();
    document.getElementById('app').innerHTML = renderMonthlyStats();
    setupMonthlyStatsEventListeners();
}

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

function showWelcomeMessage() {
    const statsContent = document.getElementById('monthlyStatsContent');
    
    statsContent.innerHTML = `
        <div class="simple-welcome-message">
            <h2>Which report are you looking for?</h2>
            <p>Please choose Waste Intake, a period (e.g., Q1, Annual) or select a month for Hourly WCV Intake or Monthly Stats report.</p>
        </div>
    `;
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('stationId');
    localStorage.removeItem('stationName');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

export { getWeekday, isWeekend, isSunday, calculateTotals, calculateAverages };

document.addEventListener('DOMContentLoaded', initializeMonthlyStats);