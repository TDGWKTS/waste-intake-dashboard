// export.js - Export functionality for monthly stats

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