class DataManager {
    static STATIONS = ['iets', 'iwts', 'nlts', 'nwntts', 'oitf', 'stts', 'wkts'];
    
    // Cache for instant access
    static cache = new Map();
    static lastUpdate = new Map();

    static async loadStationData(stationId) {
        // Return from cache if recent (5 minutes)
        if (this.cache.has(stationId)) {
            const lastUpdate = this.lastUpdate.get(stationId);
            if (Date.now() - lastUpdate < 300000) { // 5 minutes
                return this.cache.get(stationId);
            }
        }

        try {
            const response = await fetch(`data/${stationId}.json?t=${Date.now()}`);
            if (!response.ok) throw new Error('File not found');
            
            const data = await response.json();
            
            // Cache the data
            this.cache.set(stationId, data);
            this.lastUpdate.set(stationId, Date.now());
            
            return data;
        } catch (error) {
            console.log(`No data file for ${stationId}, returning empty array`);
            return [];
        }
    }

    static async saveStationData(stationId, records) {
        const data = JSON.stringify(records, null, 2);
        
        // Update cache
        this.cache.set(stationId, records);
        this.lastUpdate.set(stationId, Date.now());
        
        // For web environment, we can't directly save to server files
        // But we can provide download and use localStorage as backup
        this.downloadJSON(data, `${stationId}.json`);
        
        // Also save to localStorage as backup
        localStorage.setItem(`epd-${stationId}-backup`, data);
        
        return true;
    }

    static downloadJSON(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    static async getFilteredData(stationId, filters = {}) {
        const records = await this.loadStationData(stationId);
        
        return records.filter(record => {
            if (filters.startDate && record.日期 < filters.startDate) return false;
            if (filters.endDate && record.日期 > filters.endDate) return false;
            if (filters.status && record.交收狀態 !== filters.status) return false;
            if (filters.wasteType && record.廢物類別 !== filters.wasteType) return false;
            if (filters.vehicleTask && record.車輛任務 !== filters.vehicleTask) return false;
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                return Object.values(record).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                );
            }
            return true;
        });
    }

    static async getStats(stationId) {
        const records = await this.loadStationData(stationId);
        
        const total = records.length;
        const completed = records.filter(r => r.交收狀態 === '完成').length;
        const totalWeight = records.reduce((sum, r) => sum + (parseFloat(r.物料重量) || 0), 0);
        
        // Waste type distribution
        const wasteTypes = {};
        records.forEach(record => {
            const type = record.廢物類別 || 'Unknown';
            wasteTypes[type] = (wasteTypes[type] || 0) + 1;
        });

        // Daily stats (last 7 days)
        const last7Days = this.getLast7Days();
        const dailyStats = {};
        last7Days.forEach(day => {
            dailyStats[day] = records.filter(r => r.日期 === day).length;
        });

        return {
            totalRecords: total,
            completedDeliveries: completed,
            totalWeight: totalWeight,
            wasteTypeDistribution: wasteTypes,
            dailyStats: dailyStats,
            completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
        };
    }

    static getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        return days;
    }

    // Real-time data updates (no API calls needed)
    static subscribeToUpdates(stationId, callback) {
        // Simulate real-time updates by checking cache periodically
        setInterval(async () => {
            const data = await this.loadStationData(stationId);
            callback(data);
        }, 30000); // Check every 30 seconds
    }
}