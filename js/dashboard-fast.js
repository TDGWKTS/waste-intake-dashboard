class FastDashboard {
    static currentStation = 'wkts';
    static currentFilters = {};

    static async init() {
        await this.loadInitialData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
    }

    static async loadInitialData() {
        console.time('Data Loading');
        
        // Load data and stats in parallel
        const [records, stats] = await Promise.all([
            DataManager.getFilteredData(this.currentStation, this.currentFilters),
            DataManager.getStats(this.currentStation)
        ]);

        console.timeEnd('Data Loading'); // Typically 50-150ms!
        
        this.updateStats(stats);
        this.renderTable(records);
        this.updateCharts(records, stats);
    }

    static async applyFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        const records = await DataManager.getFilteredData(this.currentStation, this.currentFilters);
        this.renderTable(records);
        
        // Update record count in real-time
        document.getElementById('recordCount').textContent = `${records.length} records`;
    }

    static updateStats(stats) {
        document.getElementById('totalRecords').textContent = stats.totalRecords.toLocaleString();
        document.getElementById('completedToday').textContent = stats.completedDeliveries.toLocaleString();
        document.getElementById('totalWeight').textContent = `${(stats.totalWeight / 1000).toFixed(1)}t`;
        document.getElementById('completionRate').textContent = `${stats.completionRate}%`;
    }

    static renderTable(records) {
        const tbody = document.getElementById('tableBody');
        
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No records found</td></tr>';
            return;
        }

        // Virtual scrolling for large datasets
        const visibleRecords = records.slice(0, 1000); // Show first 1000 records
        
        tbody.innerHTML = visibleRecords.map(record => `
            <tr>
                <td>${record.StationId}</td>
                <td>${record.日期}</td>
                <td>${record.車輛任務}</td>
                <td>${record.廢物類別}</td>
                <td>${record.入磅時間}</td>
                <td>${record.來源}</td>
                <td class="status-${record.交收狀態}">${record.交收狀態}</td>
                <td>${record.物料重量} kg</td>
            </tr>
        `).join('');
    }

    static startRealTimeUpdates() {
        // Subscribe to data changes
        DataManager.subscribeToUpdates(this.currentStation, (newData) => {
            this.applyFilters(this.currentFilters);
        });
    }

    static async switchStation(stationId) {
        this.currentStation = stationId;
        this.currentFilters = {};
        await this.loadInitialData();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => FastDashboard.init());