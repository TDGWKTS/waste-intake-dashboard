// charts.js - Fixed Table Headers to Use Chinese Headers from JSON Data
import { filteredData, filtersApplied, currentData } from './dashboard.js';

// Chart instances
let averageLoadsChart = null;
let averageTonnageChart = null;
let averageLoadsP97Chart = null;
let averageTonnageP97Chart = null;
let sourceDistrictChart = null;

// Field names - with fallback for missing weight field
const FIELD_NAMES = {
    WEIGHT: "物料重量",      // Primary weight field
    TIME: "入磅時間",        // Time field
    STATUS: "交收狀態",      // Status field
    TASK: "車輛任務",        // Task field
    STATION: "StationId",    // Station field
    DISTRICT: "來源"         // District field
};

// Fallback weight value (tons per load)
const FALLBACK_WEIGHT = 10; // Default weight when field is missing

// Table management variables
let currentPage = 1;
const recordsPerPage = 100;
let allFilteredData = [];

export function renderCharts() {
    console.log('📈 Rendering charts...');
    
    if (!filteredData || filteredData.length === 0) {
        console.log('⚠️ No data available for charts');
        renderEmptyCharts();
        return;
    }

    console.log('🔍 Checking data structure...');
    const sampleRecord = filteredData[0];
    console.log('First record:', sampleRecord);
    console.log('Available fields:', Object.keys(sampleRecord));

    // Check for missing fields and handle weight field specifically
    const missingFields = checkMissingFields();
    const hasWeightField = sampleRecord.hasOwnProperty(FIELD_NAMES.WEIGHT);
    
    console.log('📊 Field status:', {
        hasWeightField,
        missingFields,
        weightFieldValue: hasWeightField ? sampleRecord[FIELD_NAMES.WEIGHT] : 'MISSING'
    });

    if (!hasWeightField) {
        console.warn('⚠️ Weight field missing! Using fallback weight of', FALLBACK_WEIGHT, 'tons per load');
    }

    // Get current station to determine if we should show P97 charts
    const currentStation = getCurrentStation();
    const showP97Charts = currentStation === 'WKTS'; // Only show P97 for WKTS
    
    console.log(`🏭 Current station: ${currentStation}, Show P97 charts: ${showP97Charts}`);

    try {
        const chartData = calculateChartData(hasWeightField);
        const chartDataP97 = showP97Charts ? calculateP97ChartData(hasWeightField) : null;
        const districtData = calculateDistrictChartData(hasWeightField);

        renderAllCharts(chartData, chartDataP97, districtData, showP97Charts);
        console.log('✅ All charts rendered successfully');
    } catch (error) {
        console.error('❌ Chart rendering error:', error);
        renderEmptyCharts();
    }
}

function getCurrentStation() {
    // Try to get station from various sources
    const stationFromLocalStorage = localStorage.getItem('selectedStation');
    const stationFromSidebar = document.querySelector('.station-selector')?.value;
    const stationFromData = filteredData[0]?.[FIELD_NAMES.STATION];
    
    return stationFromLocalStorage || stationFromSidebar || stationFromData || 'WKTS';
}

function checkMissingFields() {
    const sample = filteredData[0];
    const missing = [];
    
    for (const [key, fieldName] of Object.entries(FIELD_NAMES)) {
        if (!sample.hasOwnProperty(fieldName)) {
            missing.push(`${key}: "${fieldName}"`);
        } else {
            console.log(`✅ Field "${fieldName}":`, sample[fieldName]);
        }
    }
    
    return missing;
}

function calculateChartData(hasWeightField) {
    console.log('🔄 Calculating chart data...');
    
    const timeSlots = generateTimeSlots();
    const { loadsByTimeSlot, tonnageByTimeSlot } = initializeTimeSlotData(timeSlots);
    
    const validRecords = filterValidRecords();
    console.log(`📊 Processing ${validRecords.length} valid records`);
    
    let processedRecords = 0;
    let recordsWithWeight = 0;
    let totalTonnage = 0;
    
    validRecords.forEach(record => {
        const timeValue = record[FIELD_NAMES.TIME];
        if (timeValue) {
            const timeSlot = getTimeSlotForRecord(timeValue);
            
            if (timeSlot && loadsByTimeSlot[timeSlot] !== undefined) {
                loadsByTimeSlot[timeSlot]++;
                processedRecords++;
                
                const weightValue = getWeightValue(record, hasWeightField);
                if (weightValue > 0) {
                    tonnageByTimeSlot[timeSlot] += weightValue;
                    totalTonnage += weightValue;
                    recordsWithWeight++;
                }
            }
        }
    });
    
    console.log('📈 Chart data summary:', {
        processedRecords,
        recordsWithWeight,
        totalTonnage: totalTonnage.toFixed(2),
        hasWeightField,
        usingFallback: !hasWeightField
    });
    
    const numberOfDays = calculateNumberOfDays();
    return calculateAverages(loadsByTimeSlot, tonnageByTimeSlot, timeSlots, numberOfDays);
}

function calculateP97ChartData(hasWeightField) {
    console.log('🔄 Calculating P97 chart data...');
    
    const timeSlots = generateTimeSlots();
    const { loadsByTimeSlot, tonnageByTimeSlot } = initializeTimeSlotData(timeSlots);
    
    const p97Records = filteredData.filter(record => {
        const status = String(record[FIELD_NAMES.STATUS] || '').trim();
        const task = String(record[FIELD_NAMES.TASK] || '').trim();
        return status === '完成' && task.startsWith('P97');
    });
    
    console.log(`📊 Processing ${p97Records.length} P97 records`);
    
    p97Records.forEach(record => {
        const timeValue = record[FIELD_NAMES.TIME];
        if (timeValue) {
            const timeSlot = getTimeSlotForRecord(timeValue);
            
            if (timeSlot && loadsByTimeSlot[timeSlot] !== undefined) {
                loadsByTimeSlot[timeSlot]++;
                
                const weightValue = getWeightValue(record, hasWeightField);
                if (weightValue > 0) {
                    tonnageByTimeSlot[timeSlot] += weightValue;
                }
            }
        }
    });
    
    const numberOfDays = calculateNumberOfDays();
    return calculateAverages(loadsByTimeSlot, tonnageByTimeSlot, timeSlots, numberOfDays);
}

function calculateDistrictChartData(hasWeightField) {
    console.log('🔄 Calculating district chart data...');
    
    const validRecords = filterValidRecords();
    const districtCounts = {};
    const districtTonnage = {};
    
    validRecords.forEach(record => {
        const district = String(record[FIELD_NAMES.DISTRICT] || 'Unknown').trim();
        if (district && district !== 'Unknown') {
            districtCounts[district] = (districtCounts[district] || 0) + 1;
            
            const weightValue = getWeightValue(record, hasWeightField);
            if (weightValue > 0) {
                districtTonnage[district] = (districtTonnage[district] || 0) + weightValue;
            }
        }
    });
    
    const districts = Object.keys(districtCounts);
    console.log(`🗺️ Found ${districts.length} districts:`, districtCounts);
    
    return {
        districts: districts,
        loads: districts.map(district => districtCounts[district]),
        tonnage: districts.map(district => districtTonnage[district] || 0),
        districtCounts,
        districtTonnage
    };
}

// Helper functions
function filterValidRecords() {
    return filteredData.filter(record => {
        const status = String(record[FIELD_NAMES.STATUS] || '').trim();
        const task = String(record[FIELD_NAMES.TASK] || '').trim();
        const station = String(record[FIELD_NAMES.STATION] || '').trim();
        
        if (status !== '完成') return false;
        
        // WKTS station specific logic
        if (station === 'WKTS') {
            return task.startsWith('C31') || task.startsWith('G01') || task.startsWith('P99');
        }
        
        return task.startsWith('C') || task.startsWith('G') || task.startsWith('P');
    });
}

function getWeightValue(record, hasWeightField) {
    if (hasWeightField) {
        // Try to use the actual weight field
        const value = record[FIELD_NAMES.WEIGHT];
        if (value === null || value === undefined || value === '') {
            return FALLBACK_WEIGHT;
        }
        
        const parsed = parseFloat(value);
        return isNaN(parsed) ? FALLBACK_WEIGHT : parsed;
    } else {
        // Use fallback weight
        return FALLBACK_WEIGHT;
    }
}

function initializeTimeSlotData(timeSlots) {
    const loadsByTimeSlot = {};
    const tonnageByTimeSlot = {};
    
    timeSlots.forEach(slot => {
        loadsByTimeSlot[slot] = 0;
        tonnageByTimeSlot[slot] = 0;
    });
    
    return { loadsByTimeSlot, tonnageByTimeSlot };
}

function calculateAverages(loadsByTimeSlot, tonnageByTimeSlot, timeSlots, numberOfDays) {
    const totalLoads = Object.values(loadsByTimeSlot).reduce((a, b) => a + b, 0);
    const totalTonnage = Object.values(tonnageByTimeSlot).reduce((a, b) => a + b, 0);
    
    const averageLoads = timeSlots.map(slot => loadsByTimeSlot[slot] / numberOfDays);
    const averageTonnage = timeSlots.map(slot => tonnageByTimeSlot[slot] / numberOfDays);
    
    // Calculate max values for Y-axis with REASONABLE buffer
    const maxAverageLoads = Math.max(...averageLoads);
    const maxAverageTonnage = Math.max(...averageTonnage);
    const maxTotalLoads = Math.max(...Object.values(loadsByTimeSlot));
    const maxTotalTonnage = Math.max(...Object.values(tonnageByTimeSlot));
    
    return {
        timeSlots,
        averageLoads: averageLoads.map(avg => Math.round(avg)),
        averageTonnage: averageTonnage.map(avg => parseFloat(avg.toFixed(1))),
        totalLoads: loadsByTimeSlot,
        totalTonnage: tonnageByTimeSlot,
        numberOfDays,
        averageLoadsPerDay: totalLoads / numberOfDays,
        averageTonnagePerDay: totalTonnage / numberOfDays,
        maxAverageLoads: calculateReasonableMax(maxAverageLoads),
        maxAverageTonnage: calculateReasonableMax(maxAverageTonnage),
        maxTotalLoads: calculateReasonableMax(maxTotalLoads),
        maxTotalTonnage: calculateReasonableMax(maxTotalTonnage)
    };
}

function calculateReasonableMax(value) {
    if (value === 0) return 10; // Default minimum range
    
    // For average values, use smaller buffer (10-20%)
    // For total values, use larger buffer (20-30%)
    const buffer = value < 50 ? 0.2 : 0.1; // 20% for small values, 10% for larger values
    
    let maxValue = Math.ceil(value * (1 + buffer));
    
    // Ensure minimum range for very small values
    if (maxValue < 5) maxValue = 5;
    
    console.log(`📊 Y-Axis scaling: ${value} → ${maxValue} (${Math.round(buffer * 100)}% buffer)`);
    return maxValue;
}

function calculateNumberOfDays() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (!startDate || !endDate) return 1;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.max(Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1, 1);
}

function getSearchPeriodText() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    
    if (!startDate) return '';
    
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };
    
    if (!endDate || startDate === endDate) {
        return `(${formatDate(startDate)})`;
    } else {
        return `(${formatDate(startDate)} - ${formatDate(endDate)})`;
    }
}

// Chart rendering functions
function renderAllCharts(chartData, chartDataP97, districtData, showP97Charts) {
    const searchPeriod = getSearchPeriodText();
    
    // Set custom heights for charts
    increaseChartHeight('averageLoadsChart', 400);
    increaseChartHeight('averageTonnageChart', 400);
    
    renderTimeSeriesChart('averageLoadsChart', chartData, {
        data: chartData.averageLoads,
        label: `Average ${Math.round(chartData.averageLoadsPerDay)} Loads`,
        colors: { bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 1)', label: '#00ff88' },
        yAxisTitle: 'Average Number of Loads',
        chartTitle: `Average Loads vs Time Period ${searchPeriod}`,
        showDataLabels: true,
        dataLabelFormatter: value => Math.round(value).toString(),
        maxYValue: chartData.maxAverageLoads
    });

    renderTimeSeriesChart('averageTonnageChart', chartData, {
        data: chartData.averageTonnage,
        label: `Average ${chartData.averageTonnagePerDay.toFixed(1)} Tons`,
        colors: { bg: 'rgba(0, 200, 255, 0.1)', border: 'rgba(0, 200, 255, 1)', label: '#00c8ff' },
        yAxisTitle: 'Average Tonnage (t)',
        chartTitle: `Average Tonnage vs Time Period ${searchPeriod}`,
        showDataLabels: true,
        dataLabelFormatter: value => value.toFixed(1) + 't',
        maxYValue: chartData.maxAverageTonnage
    });

    // Only render P97 charts if enabled for this station
    if (showP97Charts && chartDataP97) {
        increaseChartHeight('averageLoadsP97Chart', 400);
        increaseChartHeight('averageTonnageP97Chart', 400);
        
        renderTimeSeriesChart('averageLoadsP97Chart', chartDataP97, {
            data: chartDataP97.averageLoads,
            label: `Average ${Math.round(chartDataP97.averageLoadsPerDay)} P97 Loads`,
            colors: { bg: 'rgba(255, 107, 107, 0.1)', border: 'rgba(255, 107, 107, 1)', label: '#ff6b6b' },
            yAxisTitle: 'Average P97 Loads',
            chartTitle: `Average P97 Loads vs Time Period ${searchPeriod}`,
            showDataLabels: true,
            dataLabelFormatter: value => Math.round(value).toString(),
            maxYValue: chartDataP97.maxAverageLoads
        });

        renderTimeSeriesChart('averageTonnageP97Chart', chartDataP97, {
            data: chartDataP97.averageTonnage,
            label: `Average ${chartDataP97.averageTonnagePerDay.toFixed(1)} P97 Tons`,
            colors: { bg: 'rgba(255, 167, 38, 0.1)', border: 'rgba(255, 167, 38, 1)', label: '#ffa726' },
            yAxisTitle: 'Average P97 Tonnage (t)',
            chartTitle: `Average P97 Tonnage vs Time Period ${searchPeriod}`,
            showDataLabels: true,
            dataLabelFormatter: value => value.toFixed(1) + 't',
            maxYValue: chartDataP97.maxAverageTonnage
        });
    } else {
        // Hide P97 chart containers if not showing
        hideP97Charts();
    }

    renderDistrictChart(districtData, searchPeriod);
}

function increaseChartHeight(canvasId, height) {
    const container = document.getElementById(canvasId)?.parentElement;
    if (container) {
        container.style.height = `${height}px`;
        container.style.minHeight = `${height}px`;
        console.log(`📏 Set ${canvasId} container height to ${height}px`);
    }
}

function hideP97Charts() {
    const p97Containers = [
        document.getElementById('averageLoadsP97Chart')?.parentElement,
        document.getElementById('averageTonnageP97Chart')?.parentElement
    ].filter(container => container);
    
    p97Containers.forEach(container => {
        container.style.display = 'none';
    });
    console.log('📊 Hidden P97 charts for non-WKTS station');
}

function renderTimeSeriesChart(canvasId, fullData, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`❌ Canvas not found: ${canvasId}`);
        return;
    }

    // Show container if it was hidden
    const container = ctx.parentElement;
    if (container) {
        container.style.display = 'block';
    }

    // Destroy existing chart
    const chartInstances = {
        'averageLoadsChart': averageLoadsChart,
        'averageTonnageChart': averageTonnageChart,
        'averageLoadsP97Chart': averageLoadsP97Chart,
        'averageTonnageP97Chart': averageTonnageP97Chart
    };
    
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fullData.timeSlots,
            datasets: [{
                label: config.label,
                data: config.data,
                backgroundColor: config.colors.bg,
                borderColor: config.colors.border,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: config.colors.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: config.chartTitle,
                    color: '#fff',
                    font: { size: 14, weight: 'bold' },
                    padding: { top: 5, bottom: 10 }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: { 
                        color: '#fff', 
                        font: { size: 11, weight: 'bold' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: config.colors.border,
                    borderWidth: 2,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        title: (tooltipItems) => {
                            return `Time Slot: ${tooltipItems[0].label}`;
                        },
                        label: (context) => {
                            const value = context.parsed.y;
                            const timeSlot = fullData.timeSlots[context.dataIndex];
                            const totalLoads = fullData.totalLoads[timeSlot] || 0;
                            const totalTons = fullData.totalTonnage[timeSlot] || 0;
                            
                            // FIXED: Properly check if it's a tonnage chart
                            const isTonnageChart = canvasId.includes('tonnage') || canvasId.includes('Tonnage');
                            
                            if (isTonnageChart) {
                                return [
                                    `Average: ${value.toFixed(1)} tons`,
                                    `Total Loads: ${totalLoads}`,
                                    `Total Tons: ${totalTons.toFixed(1)} t`
                                ];
                            } else {
                                return [
                                    `Average: ${Math.round(value)} loads`,
                                    `Total Loads: ${totalLoads}`,
                                    `Total Tons: ${totalTons.toFixed(1)} t`
                                ];
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#ccc',
                        maxRotation: 45,
                        minRotation: 45,
                        font: { size: 9 }
                    },
                    title: {
                        display: true,
                        text: 'Time Slot',
                        color: '#ccc',
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: config.maxYValue,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: {
                        color: '#ccc',
                        precision: 0,
                        font: { size: 10 },
                        stepSize: calculateStepSize(config.maxYValue)
                    },
                    title: {
                        display: true,
                        text: config.yAxisTitle,
                        color: '#ccc',
                        font: { size: 11 }
                    }
                }
            },
            layout: {
                padding: {
                    top: 5,
                    bottom: 5,
                    left: 10,
                    right: 10
                }
            }
        },
        plugins: config.showDataLabels ? [createDataLabelsPlugin(config.colors.label, config.dataLabelFormatter)] : []
    });

    // Update the appropriate chart instance
    switch(canvasId) {
        case 'averageLoadsChart': averageLoadsChart = chart; break;
        case 'averageTonnageChart': averageTonnageChart = chart; break;
        case 'averageLoadsP97Chart': averageLoadsP97Chart = chart; break;
        case 'averageTonnageP97Chart': averageTonnageP97Chart = chart; break;
    }
}

function calculateStepSize(maxValue) {
    // Calculate appropriate step size based on max value
    if (maxValue <= 10) return 1;
    if (maxValue <= 50) return 5;
    if (maxValue <= 100) return 10;
    if (maxValue <= 500) return 50;
    if (maxValue <= 1000) return 100;
    return 200;
}

function renderDistrictChart(data, searchPeriod) {
    const ctx = document.getElementById('sourceDistrictChart') || 
                document.getElementById('districtChart');
    
    if (!ctx) {
        console.error('❌ District chart canvas not found');
        return;
    }

    // Show container and set height
    const container = ctx.parentElement;
    if (container) {
        container.style.display = 'block';
        container.style.height = '600px';
        container.style.minHeight = '600px';
    }

    if (sourceDistrictChart) {
        sourceDistrictChart.destroy();
    }

    if (!data.districts || data.districts.length === 0) {
        console.log('⚠️ No district data available');
        renderEmptyDistrictChart(ctx, searchPeriod);
        return;
    }

    console.log(`🗺️ Rendering district chart with ${data.districts.length} districts`);

    // Sort districts by load count
    const sortedIndices = data.districts.map((_, index) => index)
        .sort((a, b) => data.loads[b] - data.loads[a]);
    
    const sortedDistricts = sortedIndices.map(i => data.districts[i]);
    const sortedLoads = sortedIndices.map(i => data.loads[i]);
    const sortedTonnage = sortedIndices.map(i => data.tonnage[i]);

    // Generate different colors for each bar
    const colors = generateDistrictColors(sortedDistricts.length);

    sourceDistrictChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDistricts,
            datasets: [{
                label: 'Load Count',
                data: sortedLoads,
                backgroundColor: colors.backgrounds,
                borderColor: colors.borders,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Source Districts - Load Distribution ${searchPeriod}`,
                    color: '#fff',
                    font: { size: 16, weight: 'bold' },
                    padding: { top: 10, bottom: 30 }
                },
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    titleColor: '#00ff88',
                    bodyColor: '#fff',
                    borderColor: '#36a2eb',
                    borderWidth: 2,
                    padding: 16,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        title: (tooltipItems) => `${tooltipItems[0].label}`,
                        label: (context) => {
                            const index = context.dataIndex;
                            const loads = sortedLoads[index];
                            const tons = sortedTonnage[index];
                            const totalLoads = data.loads.reduce((a, b) => a + b, 0);
                            const percentage = ((loads / totalLoads) * 100).toFixed(1);
                            
                            return [
                                `Loads: ${loads.toLocaleString()}`,
                                `Tonnage: ${tons.toFixed(1).toLocaleString()} t`,
                                `Percentage: ${percentage}%`
                            ];
                        },
                        labelColor: (context) => {
                            return {
                                borderColor: colors.borders[context.dataIndex],
                                backgroundColor: colors.backgrounds[context.dataIndex],
                                borderWidth: 2
                            };
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: '#ccc',
                        callback: value => value.toLocaleString()
                    },
                    title: {
                        display: true,
                        text: 'Number of Loads',
                        color: '#ccc',
                        font: { size: 14 }
                    }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { 
                        color: '#ccc',
                        padding: 20
                    },
                    title: {
                        display: true,
                        text: 'Source Districts',
                        color: '#ccc',
                        font: { size: 14 }
                    }
                }
            }
        }
    });
}

function generateDistrictColors(count) {
    const colorPalette = [
        { bg: 'rgba(255, 99, 132, 0.8)', border: 'rgba(255, 99, 132, 1)' },
        { bg: 'rgba(54, 162, 235, 0.8)', border: 'rgba(54, 162, 235, 1)' },
        { bg: 'rgba(255, 206, 86, 0.8)', border: 'rgba(255, 206, 86, 1)' },
        { bg: 'rgba(75, 192, 192, 0.8)', border: 'rgba(75, 192, 192, 1)' },
        { bg: 'rgba(153, 102, 255, 0.8)', border: 'rgba(153, 102, 255, 1)' },
        { bg: 'rgba(255, 159, 64, 0.8)', border: 'rgba(255, 159, 64, 1)' },
        { bg: 'rgba(199, 199, 199, 0.8)', border: 'rgba(199, 199, 199, 1)' },
        { bg: 'rgba(83, 102, 255, 0.8)', border: 'rgba(83, 102, 255, 1)' },
        { bg: 'rgba(40, 159, 64, 0.8)', border: 'rgba(40, 159, 64, 1)' },
        { bg: 'rgba(210, 105, 30, 0.8)', border: 'rgba(210, 105, 30, 1)' }
    ];
    
    const backgrounds = [];
    const borders = [];
    
    for (let i = 0; i < count; i++) {
        const color = colorPalette[i % colorPalette.length];
        backgrounds.push(color.bg);
        borders.push(color.border);
    }
    
    return { backgrounds, borders };
}

function createDataLabelsPlugin(color, formatter) {
    return {
        id: 'dataLabels',
        afterDatasetsDraw(chart) {
            const { ctx, data, scales: { x, y } } = chart;
            
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 11px Arial';
            
            data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    
                    if (value > 0) {
                        const xPos = element.x;
                        const yPos = index % 2 === 0 ? element.y - 15 : element.y + 15;
                        
                        ctx.fillStyle = color;
                        ctx.strokeStyle = '#000';
                        ctx.lineWidth = 2;
                        
                        const labelText = formatter(value);
                        ctx.strokeText(labelText, xPos, yPos);
                        ctx.fillText(labelText, xPos, yPos);
                    }
                });
            });
            
            ctx.restore();
        }
    };
}

function renderEmptyDistrictChart(ctx, searchPeriod) {
    sourceDistrictChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['No Data Available'],
            datasets: [{
                label: 'Load Count',
                data: [0],
                backgroundColor: 'rgba(128, 128, 128, 0.5)',
                borderColor: 'rgba(128, 128, 128, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: `Source Districts - No Data Available ${searchPeriod}`,
                    color: '#fff',
                    font: { size: 14 }
                }
            }
        }
    });
}

function renderEmptyCharts() {
    console.log('📊 Rendering empty charts');
    const timeSlots = generateTimeSlots();
    const zeroData = timeSlots.map(() => 0);
    
    const emptyData = {
        timeSlots,
        averageLoads: zeroData,
        averageTonnage: zeroData,
        averageLoadsPerDay: 0,
        averageTonnagePerDay: 0,
        totalLoads: {},
        totalTonnage: {},
        maxLoads: 10,
        maxTonnage: 10
    };
    
    const emptyDistrictData = {
        districts: [],
        loads: [],
        tonnage: []
    };
    
    renderAllCharts(emptyData, emptyData, emptyDistrictData, false);
}

// Utility functions
function generateTimeSlots() {
    const timeSlots = [];
    for (let hour = 4; hour <= 27; hour++) {
        const currentHour = hour % 24;
        const nextHour = (hour + 1) % 24;
        const currentHourStr = currentHour.toString().padStart(2, '0');
        const nextHourStr = nextHour.toString().padStart(2, '0');
        
        if (hour === 4) timeSlots.push('0430-0529');
        else if (hour === 27) timeSlots.push('0330-0429');
        else timeSlots.push(`${currentHourStr}30-${nextHourStr}29`);
    }
    return timeSlots;
}

function getTimeSlotForRecord(timeStr) {
    if (!timeStr) return null;
    
    let cleanTime;
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        cleanTime = parts[0].padStart(2, '0') + parts[1].padStart(2, '0');
    } else {
        cleanTime = timeStr.replace(/\D/g, '').padStart(4, '0');
    }
    
    const timeNum = parseInt(cleanTime);
    if (isNaN(timeNum)) return null;
    
    // Time slot mapping
    if (timeNum >= 430 && timeNum <= 529) return '0430-0529';
    if (timeNum >= 530 && timeNum <= 629) return '0530-0629';
    if (timeNum >= 630 && timeNum <= 729) return '0630-0729';
    if (timeNum >= 730 && timeNum <= 829) return '0730-0829';
    if (timeNum >= 830 && timeNum <= 929) return '0830-0929';
    if (timeNum >= 930 && timeNum <= 1029) return '0930-1029';
    if (timeNum >= 1030 && timeNum <= 1129) return '1030-1129';
    if (timeNum >= 1130 && timeNum <= 1229) return '1130-1229';
    if (timeNum >= 1230 && timeNum <= 1329) return '1230-1329';
    if (timeNum >= 1330 && timeNum <= 1429) return '1330-1429';
    if (timeNum >= 1430 && timeNum <= 1529) return '1430-1529';
    if (timeNum >= 1530 && timeNum <= 1629) return '1530-1629';
    if (timeNum >= 1630 && timeNum <= 1729) return '1630-1729';
    if (timeNum >= 1730 && timeNum <= 1829) return '1730-1829';
    if (timeNum >= 1830 && timeNum <= 1929) return '1830-1929';
    if (timeNum >= 1930 && timeNum <= 2029) return '1930-2029';
    if (timeNum >= 2030 && timeNum <= 2129) return '2030-2129';
    if (timeNum >= 2130 && timeNum <= 2229) return '2130-2229';
    if (timeNum >= 2230 && timeNum <= 2329) return '2230-2329';
    if (timeNum >= 2330 && timeNum <= 2359) return '2330-0029';
    if (timeNum >= 0 && timeNum <= 29) return '2330-0029';
    if (timeNum >= 30 && timeNum <= 129) return '0030-0129';
    if (timeNum >= 130 && timeNum <= 229) return '0130-0229';
    if (timeNum >= 230 && timeNum <= 329) return '0230-0329';
    if (timeNum >= 330 && timeNum <= 429) return '0330-0429';
    
    return null;
}

export function destroyCharts() {
    [averageLoadsChart, averageTonnageChart, averageLoadsP97Chart, averageTonnageP97Chart, sourceDistrictChart]
        .forEach(chart => chart?.destroy());
}

// ==================== TABLE MANAGEMENT FUNCTIONS ====================

// Function to get the actual table headers from your JSON data
export function getTableHeaders() {
    // Try filteredData first, then currentData as fallback
    const dataSource = filteredData.length > 0 ? filteredData : currentData;
    
    if (!dataSource || dataSource.length === 0) {
        console.log('⚠️ No data available for headers, using defaults');
        // Return default headers based on FIELD_NAMES
        return [
            FIELD_NAMES.STATION,
            '日期', 
            FIELD_NAMES.STATUS,
            '車牌',
            FIELD_NAMES.TASK, 
            FIELD_NAMES.TIME,
            FIELD_NAMES.WEIGHT,
            '廢物類別',
            FIELD_NAMES.DISTRICT
        ];
    }
    
    const sampleRecord = dataSource[0];
    const headers = Object.keys(sampleRecord);
    console.log('📋 Actual table headers from data:', headers);
    return headers;
}

// Function to create table header row dynamically
export function createTableHeaderRow() {
    const headers = getTableHeaders();
    console.log('🔄 Creating table header row with:', headers);
    
    return headers.map(header => {
        // Map field names to display names
        const displayNames = {
            'StationId': 'Station',
            '日期': 'Date', 
            '交收狀態': 'Delivery Status',
            '車牌': 'License Plate',
            '車輛任務': 'Vehicle Task',
            '入磅時間': 'In Time',
            '物料重量': 'Weight (t)',
            '廢物類別': 'Waste Type',
            '來源': 'Source'
        };
        
        return `<th>${displayNames[header] || header}</th>`;
    }).join('');
}

// Function to create table data with proper weight values
function getTableData() {
    if (!filteredData || filteredData.length === 0) {
        return [];
    }

    const sampleRecord = filteredData[0];
    const hasWeightField = sampleRecord.hasOwnProperty(FIELD_NAMES.WEIGHT);
    
    console.log('🔄 Preparing table data with weight fix...');
    
    // Create a copy of the data with fixed weight values
    const tableData = filteredData.map(record => {
        const recordCopy = { ...record };
        
        // Fix weight field if missing or empty
        if (!hasWeightField || !recordCopy[FIELD_NAMES.WEIGHT] || recordCopy[FIELD_NAMES.WEIGHT] === '') {
            recordCopy[FIELD_NAMES.WEIGHT] = FALLBACK_WEIGHT.toString();
        }
        
        return recordCopy;
    });
    
    console.log('✅ Table data prepared with weight values');
    return tableData;
}

export function updateDataTable() {
    console.log('🔄 Updating data table with proper headers and weights...');
    
    // Update table headers
    const tableHeader = document.querySelector('#dataTable thead tr');
    if (tableHeader) {
        tableHeader.innerHTML = createTableHeaderRow();
        console.log('✅ Table headers updated dynamically');
    }
    
    allFilteredData = getTableData();
    currentPage = 1;
    
    displayPage(currentPage);
    console.log(`📊 Data table: ${allFilteredData.length} total records available`);
}

function displayPage(page) {
    const tableBody = document.querySelector('#dataTable tbody');
    const tableLoading = document.getElementById('tableLoading');
    const paginationControls = document.getElementById('paginationControls');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const totalPages = Math.ceil(allFilteredData.length / recordsPerPage);
    const startIndex = (page - 1) * recordsPerPage;
    const endIndex = Math.min(startIndex + recordsPerPage, allFilteredData.length);
    const pageData = allFilteredData.slice(startIndex, endIndex);
    
    if (allFilteredData.length > 1000) {
        if (tableLoading) tableLoading.style.display = 'flex';
        setTimeout(() => {
            renderTableRows(pageData);
            if (tableLoading) tableLoading.style.display = 'none';
        }, 100);
    } else {
        renderTableRows(pageData);
    }
    
    updatePaginationControls(page, totalPages);
    
    const showingElement = document.getElementById('showingCount');
    const totalElement = document.getElementById('totalCount');
    
    if (showingElement) showingElement.textContent = `${startIndex + 1}-${endIndex}`;
    if (totalElement) totalElement.textContent = allFilteredData.length;
}

function renderTableRows(data) {
    const tableBody = document.querySelector('#dataTable tbody');
    if (!tableBody) return;
    
    const headers = getTableHeaders();
    
    data.forEach(record => {
        const row = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = record[header] || '';
            row.appendChild(td);
        });
        
        tableBody.appendChild(row);
    });
}

function updatePaginationControls(currentPage, totalPages) {
    const paginationControls = document.getElementById('paginationControls');
    const currentPageElement = document.getElementById('currentPage');
    const totalPagesElement = document.getElementById('totalPages');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (paginationControls) {
        if (totalPages > 1) {
            paginationControls.style.display = 'flex';
            if (currentPageElement) currentPageElement.textContent = currentPage;
            if (totalPagesElement) totalPagesElement.textContent = totalPages;
            if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
            if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
        } else {
            paginationControls.style.display = 'none';
        }
    }
}

// === TABLE EVENT LISTENERS ===
export function setupTableEventListeners() {
    const viewAllBtn = document.getElementById('viewAllBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', viewAllRecords);
        console.log('✅ View All button listener added');
    }
    if (downloadCsvBtn) {
        downloadCsvBtn.addEventListener('click', downloadCSV);
        console.log('✅ Download CSV button listener added');
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => navigatePage(-1));
        console.log('✅ Previous Page button listener added');
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => navigatePage(1));
        console.log('✅ Next Page button listener added');
    }
}

function viewAllRecords() {
    const tableContainer = document.getElementById('dataTableContainer');
    if (tableContainer) tableContainer.scrollIntoView({ behavior: 'smooth' });
    console.log(`Viewing all ${allFilteredData.length} records`);
}

function navigatePage(direction) {
    const totalPages = Math.ceil(allFilteredData.length / recordsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayPage(currentPage);
    }
}

function downloadCSV() {
    if (allFilteredData.length === 0) {
        alert('No data to download');
        return;
    }
    
    try {
        const headers = getTableHeaders();
        const csvContent = [
            headers.join(','),
            ...allFilteredData.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    return `"${String(value).replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `epd-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`📥 Downloaded CSV with ${allFilteredData.length} records`);
    } catch (error) {
        console.error('Error downloading CSV:', error);
        alert('Error downloading CSV file');
    }
}

// Call this to render charts and fix table in one go
export function renderChartsAndFixTable() {
    updateDataTable();
    renderCharts();
}

// Debug function to check data structure
export function debugDataStructure() {
    console.log('🔍 Debugging data structure...');
    
    const dataSource = filteredData.length > 0 ? filteredData : currentData;
    
    if (dataSource && dataSource.length > 0) {
        const sample = dataSource[0];
        console.log('Sample record:', sample);
        console.log('Available fields:', Object.keys(sample));
        console.log('Field names mapping:');
        Object.entries(FIELD_NAMES).forEach(([key, field]) => {
            console.log(`  ${key}: "${field}" -> ${sample[field]}`);
        });
    } else {
        console.log('No data available');
    }
}