// export.js - Export functionality for monthly stats
// Export function for Waste Intake Table to PDF
export function exportWasteIntakeToPdf(month, stationName, wasteIntakeData, year) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    
    // Calculate totals and averages
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
    
    wasteIntakeData.forEach(day => {
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
    
    // Calculate averages
    const days = wasteIntakeData.length;
    const averages = {};
    Object.keys(totals).forEach(key => {
        if (key.includes('Tonnage')) {
            averages[key] = (totals[key] / days).toFixed(2);
        } else {
            averages[key] = (totals[key] / days).toFixed(1);
        }
    });
    
    // Create PDF content
    let tableHTML = `
        <h2>Waste Intake for ${monthName} ${year} - ${stationName}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-size: 8px;">
            <thead>
                <tr>
                    <th rowspan="2" style="padding: 4px; background-color: #f0f0f0;">Date</th>
                    <th colspan="2" style="padding: 4px; background-color: #e8f4fd;">Total Waste Intake<br>(MSW+GTW)</th>
                    <th colspan="2" style="padding: 4px; background-color: #e8f8e8;">Total Waste Intakes<br>(MSW)</th>
                    <th colspan="2" style="padding: 4px; background-color: #fff3cd;">Public<br>(AM Vehicle)</th>
                    <th colspan="2" style="padding: 4px; background-color: #ffe6cc;">Public<br>(Government Contractor)</th>
                    <th colspan="2" style="padding: 4px; background-color: #f0e6ff;">Private<br>(MSW)</th>
                    <th colspan="2" style="padding: 4px; background-color: #ffebee;">Private<br>(GTW)</th>
                </tr>
                <tr>
                    <th style="padding: 3px; background-color: #e8f4fd;">Loads</th>
                    <th style="padding: 3px; background-color: #e8f4fd;">Tonnage</th>
                    <th style="padding: 3px; background-color: #e8f8e8;">Loads</th>
                    <th style="padding: 3px; background-color: #e8f8e8;">Tonnage</th>
                    <th style="padding: 3px; background-color: #fff3cd;">Loads</th>
                    <th style="padding: 3px; background-color: #fff3cd;">Tonnage</th>
                    <th style="padding: 3px; background-color: #ffe6cc;">Loads</th>
                    <th style="padding: 3px; background-color: #ffe6cc;">Tonnage</th>
                    <th style="padding: 3px; background-color: #f0e6ff;">Loads</th>
                    <th style="padding: 3px; background-color: #f0e6ff;">Tonnage</th>
                    <th style="padding: 3px; background-color: #ffebee;">Loads</th>
                    <th style="padding: 3px; background-color: #ffebee;">Tonnage</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add data rows
    wasteIntakeData.forEach(day => {
        const weekendStyle = day.weekday === 'Sat' || day.weekday === 'Sun' ? 'color: #ff4444;' : '';
        tableHTML += `
            <tr>
                <td style="padding: 3px; ${weekendStyle}">${day.weekday}<br>${day.date}</td>
                <td style="padding: 3px;">${day.totalWasteIntakeLoads}</td>
                <td style="padding: 3px;">${day.totalWasteIntakeTonnage.toFixed(2)}</td>
                <td style="padding: 3px;">${day.totalMSWLoads}</td>
                <td style="padding: 3px;">${day.totalMSWTonnage.toFixed(2)}</td>
                <td style="padding: 3px;">${day.publicAMVehicleLoads}</td>
                <td style="padding: 3px;">${day.publicAMVehicleTonnage.toFixed(2)}</td>
                <td style="padding: 3px;">${day.publicContractorLoads}</td>
                <td style="padding: 3px;">${day.publicContractorTonnage.toFixed(2)}</td>
                <td style="padding: 3px;">${day.privateMSWLoads}</td>
                <td style="padding: 3px;">${day.privateMSWTonnage.toFixed(2)}</td>
                <td style="padding: 3px;">${day.privateGTWLoads}</td>
                <td style="padding: 3px;">${day.privateGTWTonnage.toFixed(2)}</td>
            </tr>
        `;
    });
    
    // Add totals and averages
    tableHTML += `
            </tbody>
            <tfoot style="background-color: #e8e8e8; font-weight: bold;">
                <tr>
                    <td style="padding: 3px;">Total</td>
                    <td style="padding: 3px;">${totals.totalWasteIntakeLoads}</td>
                    <td style="padding: 3px;">${totals.totalWasteIntakeTonnage.toFixed(2)}</td>
                    <td style="padding: 3px;">${totals.totalMSWLoads}</td>
                    <td style="padding: 3px;">${totals.totalMSWTonnage.toFixed(2)}</td>
                    <td style="padding: 3px;">${totals.publicAMVehicleLoads}</td>
                    <td style="padding: 3px;">${totals.publicAMVehicleTonnage.toFixed(2)}</td>
                    <td style="padding: 3px;">${totals.publicContractorLoads}</td>
                    <td style="padding: 3px;">${totals.publicContractorTonnage.toFixed(2)}</td>
                    <td style="padding: 3px;">${totals.privateMSWLoads}</td>
                    <td style="padding: 3px;">${totals.privateMSWTonnage.toFixed(2)}</td>
                    <td style="padding: 3px;">${totals.privateGTWLoads}</td>
                    <td style="padding: 3px;">${totals.privateGTWTonnage.toFixed(2)}</td>
                </tr>
                <tr>
                    <td style="padding: 3px;">Daily Average</td>
                    <td style="padding: 3px;">${averages.totalWasteIntakeLoads}</td>
                    <td style="padding: 3px;">${averages.totalWasteIntakeTonnage}</td>
                    <td style="padding: 3px;">${averages.totalMSWLoads}</td>
                    <td style="padding: 3px;">${averages.totalMSWTonnage}</td>
                    <td style="padding: 3px;">${averages.publicAMVehicleLoads}</td>
                    <td style="padding: 3px;">${averages.publicAMVehicleTonnage}</td>
                    <td style="padding: 3px;">${averages.publicContractorLoads}</td>
                    <td style="padding: 3px;">${averages.publicContractorTonnage}</td>
                    <td style="padding: 3px;">${averages.privateMSWLoads}</td>
                    <td style="padding: 3px;">${averages.privateMSWTonnage}</td>
                    <td style="padding: 3px;">${averages.privateGTWLoads}</td>
                    <td style="padding: 3px;">${averages.privateGTWTonnage}</td>
                </tr>
            </tfoot>
        </table>
        <p style="margin-top: 10px; font-size: 9px;">
            <strong>Note:</strong> Data shown for ${monthName} ${year} - Daily averages calculated based on ${wasteIntakeData.length} days with recorded data
        </p>
    `;
    
    // Download PDF directly without print dialog
    downloadAsPdf(tableHTML, `Waste_Intake_${monthName}_${year}_${stationName.replace(/\s+/g, '_')}.pdf`);
}

// Export function for Waste Intake Table to Excel
export function exportWasteIntakeToExcel(month, stationName, wasteIntakeData, year) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    
    // Calculate totals (same as PDF)
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
    
    wasteIntakeData.forEach(day => {
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
    
    // Create CSV content
    let csvContent = "Waste Intake," + monthName + " " + year + "," + stationName + "\r\n\r\n";
    
    // Headers
    csvContent += "Date,Weekday,";
    csvContent += "Total Waste Intake Loads,Total Waste Intake Tonnage,";
    csvContent += "Total MSW Loads,Total MSW Tonnage,";
    csvContent += "Public AM Vehicle Loads,Public AM Vehicle Tonnage,";
    csvContent += "Public Contractor Loads,Public Contractor Tonnage,";
    csvContent += "Private MSW Loads,Private MSW Tonnage,";
    csvContent += "Private GTW Loads,Private GTW Tonnage\r\n";
    
    // Data rows
    wasteIntakeData.forEach(day => {
        csvContent += `"${day.date}","${day.weekday}",`;
        csvContent += `${day.totalWasteIntakeLoads},${day.totalWasteIntakeTonnage.toFixed(2)},`;
        csvContent += `${day.totalMSWLoads},${day.totalMSWTonnage.toFixed(2)},`;
        csvContent += `${day.publicAMVehicleLoads},${day.publicAMVehicleTonnage.toFixed(2)},`;
        csvContent += `${day.publicContractorLoads},${day.publicContractorTonnage.toFixed(2)},`;
        csvContent += `${day.privateMSWLoads},${day.privateMSWTonnage.toFixed(2)},`;
        csvContent += `${day.privateGTWLoads},${day.privateGTWTonnage.toFixed(2)}\r\n`;
    });
    
    // Totals row
    csvContent += "\r\nTotal,,,";
    csvContent += `${totals.totalWasteIntakeLoads},${totals.totalWasteIntakeTonnage.toFixed(2)},`;
    csvContent += `${totals.totalMSWLoads},${totals.totalMSWTonnage.toFixed(2)},`;
    csvContent += `${totals.publicAMVehicleLoads},${totals.publicAMVehicleTonnage.toFixed(2)},`;
    csvContent += `${totals.publicContractorLoads},${totals.publicContractorTonnage.toFixed(2)},`;
    csvContent += `${totals.privateMSWLoads},${totals.privateMSWTonnage.toFixed(2)},`;
    csvContent += `${totals.privateGTWLoads},${totals.privateGTWTonnage.toFixed(2)}\r\n\r\n`;
    
    csvContent += "Note: Data shown for " + monthName + " " + year + "\r\n";
    csvContent += "Daily averages calculated based on " + wasteIntakeData.length + " days with recorded data\r\n";
    csvContent += "Generated on: " + new Date().toLocaleString() + "\r\n";
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Waste_Intake_${monthName}_${year}_${stationName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export function for Period Table to PDF
export function exportPeriodToPdf(period, stationName, yearData, year) {
    const periodName = getPeriodDisplayName(period);
    
    let tableHTML = `
        <h2>Monthly Statistics: ${periodName} ${year} - ${stationName}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-size: 9px;">
            <thead>
                <tr>
                    <th rowspan="2" style="padding: 4px; background-color: #f0f0f0;">Month</th>
                    <th colspan="8" style="padding: 4px; background-color: #e8f8e8;">MSW</th>
                    <th colspan="2" style="padding: 4px; background-color: #ffebee;">GTW</th>
                </tr>
                <tr>
                    <!-- MSW Columns -->
                    <th style="padding: 3px; background-color: #e8f8e8;">Loads</th>
                    <th style="padding: 3px; background-color: #e8f8e8;">Tons<br>(ALL MSW)</th>
                    <th style="padding: 3px; background-color: #fff3cd;">AM Vehicle<br>Loads</th>
                    <th style="padding: 3px; background-color: #fff3cd;">Tons</th>
                    <th style="padding: 3px; background-color: #ffe6cc;">FEHD Contractor<br>Loads</th>
                    <th style="padding: 3px; background-color: #ffe6cc;">Tons</th>
                    <th style="padding: 3px; background-color: #f0e6ff;">Private<br>Loads</th>
                    <th style="padding: 3px; background-color: #f0e6ff;">Tons</th>
                    
                    <!-- GTW Columns -->
                    <th style="padding: 3px; background-color: #ffebee;">Loads</th>
                    <th style="padding: 3px; background-color: #ffebee;">Tonnage</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add data rows
    yearData.months.forEach(month => {
        const monthYear = `${month.monthName}-${year.toString().slice(2)}`;
        tableHTML += `
            <tr>
                <td style="padding: 3px;">${monthYear}</td>
                <td style="padding: 3px;">${(month.mswLoads || 0).toLocaleString()}</td>
                <td style="padding: 3px;">${(month.mswTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="padding: 3px;">${(month.amVehicleLoads || 0).toLocaleString()}</td>
                <td style="padding: 3px;">${(month.amVehicleTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="padding: 3px;">${(month.fehdContractorLoads || 0).toLocaleString()}</td>
                <td style="padding: 3px;">${(month.fehdContractorTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="padding: 3px;">${(month.privateLoads || 0).toLocaleString()}</td>
                <td style="padding: 3px;">${(month.privateTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="padding: 3px;">${(month.gtwLoads || 0).toLocaleString()}</td>
                <td style="padding: 3px;">${(month.gtwTonnage || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    });
    
    // Add totals and averages
    tableHTML += `
            </tbody>
            <tfoot style="background-color: #e8e8e8; font-weight: bold;">
                <tr>
                    <td style="padding: 3px;">Total</td>
                    <td style="padding: 3px;">${(yearData.totals.mswLoads || 0).toLocaleString()}</td>
                    <td style="padding: 3px;">${(yearData.totals.mswTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 3px;">${(yearData.totals.amVehicleLoads || 0).toLocaleString()}</td>
                    <td style="padding: 3px;">${(yearData.totals.amVehicleTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 3px;">${(yearData.totals.fehdContractorLoads || 0).toLocaleString()}</td>
                    <td style="padding: 3px;">${(yearData.totals.fehdContractorTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 3px;">${(yearData.totals.privateLoads || 0).toLocaleString()}</td>
                    <td style="padding: 3px;">${(yearData.totals.privateTons || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 3px;">${(yearData.totals.gtwLoads || 0).toLocaleString()}</td>
                    <td style="padding: 3px;">${(yearData.totals.gtwTonnage || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
                <tr>
                    <td style="padding: 3px;">Daily Average</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.mswLoads || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.mswTons || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.amVehicleLoads || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.amVehicleTons || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.fehdContractorLoads || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.fehdContractorTons || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.privateLoads || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.privateTons || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.gtwLoads || '0.00'}</td>
                    <td style="padding: 3px;">${yearData.dailyAverages.gtwTonnage || '0.00'}</td>
                </tr>
            </tfoot>
        </table>
        <p style="margin-top: 10px; font-size: 9px;">
            <strong>Note:</strong> Daily averages are based on ${yearData.totalDays || 0} days with recorded data in ${year}.
        </p>
    `;
    
    // Download PDF directly
    downloadAsPdf(tableHTML, `Period_Stats_${periodName.replace(/\s+/g, '_')}_${year}_${stationName.replace(/\s+/g, '_')}.pdf`);
}

// Export function for Period Table to Excel
export function exportPeriodToExcel(period, stationName, yearData, year) {
    const periodName = getPeriodDisplayName(period);
    
    let csvContent = "Monthly Statistics," + periodName + " " + year + "," + stationName + "\r\n\r\n";
    
    // Headers
    csvContent += "Month,";
    csvContent += "MSW Loads,MSW Tons,";
    csvContent += "AM Vehicle Loads,AM Vehicle Tons,";
    csvContent += "FEHD Contractor Loads,FEHD Contractor Tons,";
    csvContent += "Private Loads,Private Tons,";
    csvContent += "GTW Loads,GTW Tonnage\r\n";
    
    // Data rows
    yearData.months.forEach(month => {
        const monthYear = `${month.monthName}-${year.toString().slice(2)}`;
        csvContent += `"${monthYear}",`;
        csvContent += `${month.mswLoads || 0},${month.mswTons || 0},`;
        csvContent += `${month.amVehicleLoads || 0},${month.amVehicleTons || 0},`;
        csvContent += `${month.fehdContractorLoads || 0},${month.fehdContractorTons || 0},`;
        csvContent += `${month.privateLoads || 0},${month.privateTons || 0},`;
        csvContent += `${month.gtwLoads || 0},${month.gtwTonnage || 0}\r\n`;
    });
    
    // Totals and averages
    csvContent += "\r\nTotal,";
    csvContent += `${yearData.totals.mswLoads || 0},${yearData.totals.mswTons || 0},`;
    csvContent += `${yearData.totals.amVehicleLoads || 0},${yearData.totals.amVehicleTons || 0},`;
    csvContent += `${yearData.totals.fehdContractorLoads || 0},${yearData.totals.fehdContractorTons || 0},`;
    csvContent += `${yearData.totals.privateLoads || 0},${yearData.totals.privateTons || 0},`;
    csvContent += `${yearData.totals.gtwLoads || 0},${yearData.totals.gtwTonnage || 0}\r\n`;
    
    csvContent += "Daily Average,";
    csvContent += `${yearData.dailyAverages.mswLoads || '0.00'},${yearData.dailyAverages.mswTons || '0.00'},`;
    csvContent += `${yearData.dailyAverages.amVehicleLoads || '0.00'},${yearData.dailyAverages.amVehicleTons || '0.00'},`;
    csvContent += `${yearData.dailyAverages.fehdContractorLoads || '0.00'},${yearData.dailyAverages.fehdContractorTons || '0.00'},`;
    csvContent += `${yearData.dailyAverages.privateLoads || '0.00'},${yearData.dailyAverages.privateTons || '0.00'},`;
    csvContent += `${yearData.dailyAverages.gtwLoads || '0.00'},${yearData.dailyAverages.gtwTonnage || '0.00'}\r\n\r\n`;
    
    csvContent += "Note: Daily averages are based on " + (yearData.totalDays || 0) + " days with recorded data in " + year + "\r\n";
    csvContent += "Generated on: " + new Date().toLocaleString() + "\r\n";
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Period_Stats_${periodName.replace(/\s+/g, '_')}_${year}_${stationName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper function to download as PDF without print dialog
function downloadAsPdf(htmlContent, filename) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${filename.replace('.pdf', '')}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 15px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 3px; text-align: center; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                    tfoot { background-color: #e8e8e8; }
                    .footer { margin-top: 20px; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                ${htmlContent}
                <div class="footer">
                    Generated on: ${new Date().toLocaleString()}<br>
                    Station: ${filename.split('_').slice(-2)[0]}
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    
    // Instead of printing, we'll trigger download by creating a PDF (simplified approach)
    // Note: For actual PDF generation, you might want to use a library like jsPDF
    // This implementation uses print to PDF functionality
    setTimeout(() => {
        printWindow.print();
        // Close the window after a delay
        setTimeout(() => {
            printWindow.close();
        }, 1000);
    }, 500);
}

// Helper function to get period display name
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

// Function to export Hourly Table to PDF
export function exportHourlyToPdf(month, stationName, hourlyData, getWeekday, isWeekend, calculateHourlyTotals) {
    const { timeSlots, dailyData, dailyWeights, dates } = hourlyData;
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const year = new Date().getFullYear();
    
    // Calculate totals and averages
    const { totals, averages } = calculateHourlyTotals(timeSlots, dates, dailyData);
    
    // Create a simple HTML table for PDF export
    let tableHTML = `
        <h2>Hourly WCV Intake for ${monthName} ${year} - ${stationName}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-size: 10px;">
            <thead>
                <tr>
                    <th style="padding: 5px; background-color: #f0f0f0;">Time</th>
    `;
    
    // Add date headers
    dates.forEach(date => {
        const isWeekendDay = isWeekend(date);
        const weekendStyle = isWeekendDay ? 'color: #ff4444;' : '';
        tableHTML += `<th style="padding: 5px; background-color: #f0f0f0; ${weekendStyle}">${date}<br>${getWeekday(date)}</th>`;
    });
    
    tableHTML += `
                    <th style="padding: 5px; background-color: #e0e0e0;">Total</th>
                    <th style="padding: 5px; background-color: #e0e0e0;">Average</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add data rows
    timeSlots.forEach(timeSlot => {
        tableHTML += `<tr><td style="padding: 4px; font-weight: bold;">${timeSlot}</td>`;
        
        dates.forEach(date => {
            const loadCount = dailyData[date][timeSlot];
            const isWeekendDay = isWeekend(date);
            const weekendStyle = isWeekendDay ? 'color: #ff4444;' : '';
            
            if (loadCount > 0) {
                tableHTML += `<td style="padding: 4px; ${weekendStyle}">${loadCount}</td>`;
            } else {
                tableHTML += `<td style="padding: 4px; ${weekendStyle}">-</td>`;
            }
        });
        
        tableHTML += `<td style="padding: 4px; font-weight: bold; background-color: #f8f8f8;">${totals[timeSlot]}</td>`;
        tableHTML += `<td style="padding: 4px; background-color: #f8f8f8;">${averages[timeSlot]}</td>`;
        tableHTML += `</tr>`;
    });
    
    // Add total row
    tableHTML += `<tr style="background-color: #e8e8e8;"><td style="padding: 4px; font-weight: bold;">Total</td>`;
    dates.forEach(date => {
        let dateTotal = 0;
        timeSlots.forEach(slot => {
            dateTotal += dailyData[date][slot] || 0;
        });
        tableHTML += `<td style="padding: 4px; font-weight: bold;">${dateTotal}</td>`;
    });
    
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const overallAverage = dates.length > 0 ? (grandTotal / dates.length).toFixed(1) : 0;
    
    tableHTML += `
                    <td style="padding: 4px; font-weight: bold;">${grandTotal}</td>
                    <td style="padding: 4px; font-weight: bold;">${overallAverage}</td>
                </tr>
            </tbody>
        </table>
        <p style="margin-top: 10px; font-size: 9px;">
            <strong>Note:</strong> This table shows Number of Loads for completed transactions with vehicle tasks: P99 私人車傾倒, G01 食環署傾倒, and C31 食環署外判車傾倒.
            Weekend dates (Saturday/Sunday) are shown in red.
        </p>
    `;
    
    // Create a new window and print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Hourly WCV Intake - ${monthName} ${year} - ${stationName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 4px; text-align: center; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                    .footer { margin-top: 20px; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                ${tableHTML}
                <div class="footer">
                    Generated on: ${new Date().toLocaleString()}<br>
                    Station: ${stationName}
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// Function to export Hourly Table to Excel
export function exportHourlyToExcel(month, stationName, hourlyData, getWeekday, calculateHourlyTotals) {
    const { timeSlots, dailyData, dailyWeights, dates } = hourlyData;
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const year = new Date().getFullYear();
    
    // Calculate totals and averages
    const { totals, averages } = calculateHourlyTotals(timeSlots, dates, dailyData);
    
    // Create CSV content
    let csvContent = "Hourly WCV Intake," + monthName + " " + year + "," + stationName + "\r\n\r\n";
    
    // Headers
    csvContent += "Time Slot,";
    dates.forEach(date => {
        csvContent += `"${date} (${getWeekday(date)})",`;
    });
    csvContent += "Total,Average\r\n";
    
    // Data rows
    timeSlots.forEach(timeSlot => {
        csvContent += `"${timeSlot}",`;
        
        dates.forEach(date => {
            const loadCount = dailyData[date][timeSlot];
            csvContent += (loadCount > 0 ? loadCount : "-") + ",";
        });
        
        csvContent += `${totals[timeSlot]},${averages[timeSlot]}\r\n`;
    });
    
    // Total row
    csvContent += "Total,";
    dates.forEach(date => {
        let dateTotal = 0;
        timeSlots.forEach(slot => {
            dateTotal += dailyData[date][slot] || 0;
        });
        csvContent += dateTotal + ",";
    });
    
    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);
    const overallAverage = dates.length > 0 ? (grandTotal / dates.length).toFixed(1) : 0;
    
    csvContent += `${grandTotal},${overallAverage}\r\n\r\n`;
    csvContent += "Note: This table shows Number of Loads for completed transactions with vehicle tasks: P99 私人車傾倒, G01 食環署傾倒, and C31 食環署外判車傾倒.\r\n";
    csvContent += "Weekend dates (Saturday/Sunday) are highlighted in the application.\r\n";
    csvContent += "Generated on: " + new Date().toLocaleString() + "\r\n";
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Hourly_WCV_Intake_${monthName}_${year}_${stationName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to export Monthly Table to PDF
export function exportMonthlyToPdf(month, stationName, monthData, calculateTotals, calculateAverages) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const year = new Date().getFullYear();
    const totals = calculateTotals(monthData);
    const averages = calculateAverages(monthData);
    
    let tableHTML = `
        <h2>Daily Transaction Log for MSW and GTW for ${monthName} ${year} - ${stationName}</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-size: 8px;">
            <thead>
                <tr style="background-color: #f0f0f0;">
                    <th rowspan="4" style="padding: 5px;">Transaction Date</th>
                    <th colspan="6" style="padding: 5px;">Publicly Collected Waste</th>
                    <th colspan="2" style="padding: 5px;">Privately Collected Waste</th>
                    <th colspan="2" style="padding: 5px;">Daily Total</th>
                    <th colspan="2" style="padding: 5px;">Grease Trap Waste</th>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <th colspan="4" style="padding: 5px;">Extended Reception Hours (0430-0730)</th>
                    <th colspan="2" style="padding: 5px;">Normal (0730-2330)</th>
                    <th colspan="2" style="padding: 5px;">Normal (0730-2330)</th>
                    <th colspan="2" style="padding: 5px;"></th>
                    <th colspan="2" style="padding: 5px;"></th>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <th colspan="2" style="padding: 5px;">Domestic Waste</th>
                    <th colspan="2" style="padding: 5px;">Gully Waste (D06)</th>
                    <th colspan="2" style="padding: 5px;"></th>
                    <th colspan="2" style="padding: 5px;"></th>
                    <th colspan="2" style="padding: 5px;"></th>
                    <th colspan="2" style="padding: 5px;"></th>
                </tr>
                <tr style="background-color: #f0f0f0;">
                    <th style="padding: 3px;">Loads</th>
                    <th style="padding: 3px;">Tonnes</th>
                    <th style="padding: 3px;">Loads</th>
                    <th style="padding: 3px;">Tonnes</th>
                    <th style="padding: 3px;">Loads</th>
                    <th style="padding: 3px;">Tonnes</th>
                    <th style="padding: 3px;">Loads</th>
                    <th style="padding: 3px;">Tonnes</th>
                    <th style="padding: 3px;">Loads</th>
                    <th style="padding: 3px;">Tonnes</th>
                    <th style="padding: 3px;">Loads</th>
                    <th style="padding: 3px;">Tonnes</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Add data rows
    monthData.forEach(day => {
        const weekendStyle = day.isWeekend ? 'color: #ff4444;' : '';
        tableHTML += `
            <tr>
                <td style="padding: 3px; ${weekendStyle}">${day.date}</td>
                <td style="padding: 3px;">${day.domesticWasteLoads}</td>
                <td style="padding: 3px;">${day.domesticWasteTonnes}</td>
                <td style="padding: 3px;">${day.gullyWasteLoads}</td>
                <td style="padding: 3px;">${day.gullyWasteTonnes}</td>
                <td style="padding: 3px;">${day.publicNormalLoads}</td>
                <td style="padding: 3px;">${day.publicNormalTonnes}</td>
                <td style="padding: 3px;">${day.privateLoads}</td>
                <td style="padding: 3px;">${day.privateTonnes}</td>
                <td style="padding: 3px;">${day.dailyTotalLoads}</td>
                <td style="padding: 3px;">${day.dailyTotalTonnes}</td>
                <td style="padding: 3px;">${day.greaseTrapLoads}</td>
                <td style="padding: 3px;">${day.greaseTrapTonnes}</td>
            </tr>
        `;
    });
    
    // Add totals and averages
    tableHTML += `
            </tbody>
            <tfoot style="background-color: #e8e8e8; font-weight: bold;">
                <tr>
                    <td style="padding: 3px;">Total</td>
                    <td style="padding: 3px;">${totals.domesticWasteLoads}</td>
                    <td style="padding: 3px;">${totals.domesticWasteTonnes}</td>
                    <td style="padding: 3px;">${totals.gullyWasteLoads}</td>
                    <td style="padding: 3px;">${totals.gullyWasteTonnes}</td>
                    <td style="padding: 3px;">${totals.publicNormalLoads}</td>
                    <td style="padding: 3px;">${totals.publicNormalTonnes}</td>
                    <td style="padding: 3px;">${totals.privateLoads}</td>
                    <td style="padding: 3px;">${totals.privateTonnes}</td>
                    <td style="padding: 3px;">${totals.dailyTotalLoads}</td>
                    <td style="padding: 3px;">${totals.dailyTotalTonnes}</td>
                    <td style="padding: 3px;">${totals.greaseTrapLoads}</td>
                    <td style="padding: 3px;">${totals.greaseTrapTonnes}</td>
                </tr>
                <tr>
                    <td style="padding: 3px;">Daily Average</td>
                    <td style="padding: 3px;">${averages.domesticWasteLoads}</td>
                    <td style="padding: 3px;">${averages.domesticWasteTonnes}</td>
                    <td style="padding: 3px;">${averages.gullyWasteLoads}</td>
                    <td style="padding: 3px;">${averages.gullyWasteTonnes}</td>
                    <td style="padding: 3px;">${averages.publicNormalLoads}</td>
                    <td style="padding: 3px;">${averages.publicNormalTonnes}</td>
                    <td style="padding: 3px;">${averages.privateLoads}</td>
                    <td style="padding: 3px;">${averages.privateTonnes}</td>
                    <td style="padding: 3px;">${averages.dailyTotalLoads}</td>
                    <td style="padding: 3px;">${averages.dailyTotalTonnes}</td>
                    <td style="padding: 3px;">${averages.greaseTrapLoads}</td>
                    <td style="padding: 3px;">${averages.greaseTrapTonnes}</td>
                </tr>
            </tfoot>
        </table>
        <p style="margin-top: 10px; font-size: 9px;">
            <strong>Note:</strong> MSW = Municipal Solid Waste, GTW = Grease Trap Waste
        </p>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Monthly Stats - ${monthName} ${year} - ${stationName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 15px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 3px; text-align: center; }
                    th { background-color: #f0f0f0; font-weight: bold; }
                    tfoot { background-color: #e8e8e8; }
                    .footer { margin-top: 20px; font-size: 10px; color: #666; }
                </style>
            </head>
            <body>
                ${tableHTML}
                <div class="footer">
                    Generated on: ${new Date().toLocaleString()}<br>
                    Station: ${stationName}
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// Function to export Monthly Table to Excel
export function exportMonthlyToExcel(month, stationName, monthData, calculateTotals, calculateAverages) {
    const monthName = month.charAt(0).toUpperCase() + month.slice(1);
    const year = new Date().getFullYear();
    const totals = calculateTotals(monthData);
    const averages = calculateAverages(monthData);
    
    let csvContent = "Daily Transaction Log for MSW and GTW," + monthName + " " + year + "," + stationName + "\r\n\r\n";
    
    // Headers
    csvContent += "Transaction Date,";
    csvContent += "Domestic Waste Loads,Domestic Waste Tonnes,";
    csvContent += "Gully Waste Loads,Gully Waste Tonnes,";
    csvContent += "Public Normal Loads,Public Normal Tonnes,";
    csvContent += "Private Loads,Private Tonnes,";
    csvContent += "Daily Total Loads,Daily Total Tonnes,";
    csvContent += "Grease Trap Loads,Grease Trap Tonnes\r\n";
    
    // Data rows
    monthData.forEach(day => {
        csvContent += `"${day.date}",`;
        csvContent += `${day.domesticWasteLoads},${day.domesticWasteTonnes},`;
        csvContent += `${day.gullyWasteLoads},${day.gullyWasteTonnes},`;
        csvContent += `${day.publicNormalLoads},${day.publicNormalTonnes},`;
        csvContent += `${day.privateLoads},${day.privateTonnes},`;
        csvContent += `${day.dailyTotalLoads},${day.dailyTotalTonnes},`;
        csvContent += `${day.greaseTrapLoads},${day.greaseTrapTonnes}\r\n`;
    });
    
    // Totals and averages
    csvContent += "\r\nTotal,";
    csvContent += `${totals.domesticWasteLoads},${totals.domesticWasteTonnes},`;
    csvContent += `${totals.gullyWasteLoads},${totals.gullyWasteTonnes},`;
    csvContent += `${totals.publicNormalLoads},${totals.publicNormalTonnes},`;
    csvContent += `${totals.privateLoads},${totals.privateTonnes},`;
    csvContent += `${totals.dailyTotalLoads},${totals.dailyTotalTonnes},`;
    csvContent += `${totals.greaseTrapLoads},${totals.greaseTrapTonnes}\r\n`;
    
    csvContent += "Daily Average,";
    csvContent += `${averages.domesticWasteLoads},${averages.domesticWasteTonnes},`;
    csvContent += `${averages.gullyWasteLoads},${averages.gullyWasteTonnes},`;
    csvContent += `${averages.publicNormalLoads},${averages.publicNormalTonnes},`;
    csvContent += `${averages.privateLoads},${averages.privateTonnes},`;
    csvContent += `${averages.dailyTotalLoads},${averages.dailyTotalTonnes},`;
    csvContent += `${averages.greaseTrapLoads},${averages.greaseTrapTonnes}\r\n\r\n`;
    
    csvContent += "Note: MSW = Municipal Solid Waste, GTW = Grease Trap Waste\r\n";
    csvContent += "Generated on: " + new Date().toLocaleString() + "\r\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Monthly_Stats_${monthName}_${year}_${stationName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}