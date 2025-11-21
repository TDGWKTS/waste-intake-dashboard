// js/DataManager.js – FIXED Recursion issue
class DataManager {
    static STATIONS = ['iets', 'iwts', 'nlts', 'nwntts', 'oitf', 'stts', 'wkts'];

    // Cache + IndexedDB fallback
    static cache = new Map();
    static lastUpdate = new Map();
    static db = null;

    // Get yearly file name: wkts2025.json
    static getYearlyFilename(stationId, year = null) {
        const targetYear = year || new Date().getFullYear();
        return `${stationId.toLowerCase()}${targetYear}.json`;
    }

    // Initialize IndexedDB with proper object store creation
    static async initDB() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const req = indexedDB.open('EPD_Dashboard', 1);
            
            req.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains('data')) {
                    db.createObjectStore('data');
                    console.log('✅ IndexedDB object store "data" created');
                }
            };
            
            req.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB connection established');
                resolve(this.db);
            };
            
            req.onerror = (event) => {
                console.error('❌ IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Load data for specific year - FIXED: No recursion
    static async loadStationData(stationId, year = null) {
        const targetYear = year || new Date().getFullYear();
        const filename = this.getYearlyFilename(stationId, targetYear);
        const cacheKey = `${stationId}_${targetYear}`;

        // Return from cache if recent
        if (this.cache.has(cacheKey)) {
            const last = this.lastUpdate.get(cacheKey);
            if (Date.now() - last < 300000) { // 5 min
                console.log(`📁 Using cached data for ${filename}`);
                return this.cache.get(cacheKey);
            }
        }

        console.log(`🔄 Loading data for ${filename}`);

        // 1. Try IndexedDB first (fast & unlimited)
        try {
            await this.initDB();
            const idbData = await this._getFromIndexedDB(filename);
            if (idbData && idbData.length > 0) {
                console.log(`✅ Loaded ${idbData.length} records from IndexedDB: ${filename}`);
                this.cache.set(cacheKey, idbData);
                this.lastUpdate.set(cacheKey, Date.now());
                return idbData;
            }
        } catch (e) { 
            console.warn('IndexedDB load failed, falling back to fetch:', e);
        }

        // 2. Try fetch from data/yearly file
        try {
            console.log(`🌐 Fetching from: data/${filename}`);
            const response = await fetch(`data/${filename}`);
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Loaded ${data.length} records from server: ${filename}`);
                
                // Cache the data
                this.cache.set(cacheKey, data);
                this.lastUpdate.set(cacheKey, Date.now());
                
                // Also save to IndexedDB for next time
                await this._saveToIndexedDB(filename, data);
                
                return data;
            } else {
                console.log(`❌ File not found: data/${filename} (${response.status})`);
            }
        } catch (e) {
            console.log(`❌ Fetch failed for data/${filename}:`, e.message);
        }

        console.log(`📭 No data available for ${filename}`);
        return []; // Fresh start
    }

    // Load data for date range - FIXED: No recursion
    static async loadStationDataForDateRange(stationId, startDate, endDate) {
        if (!startDate || !endDate) {
            console.log('📅 No date range specified, loading current year only');
            // If no date range specified, load current year directly
            return await this.loadStationData(stationId);
        }

        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();
        
        console.log(`📅 Loading data for date range: ${startDate} to ${endDate} (years: ${startYear} to ${endYear})`);
        
        const allData = [];
        const yearsToLoad = [];
        
        // Determine which years we need to load
        for (let year = startYear; year <= endYear; year++) {
            yearsToLoad.push(year);
        }
        
        console.log(`📂 Loading years: ${yearsToLoad.join(', ')}`);
        
        // Load data from each year
        for (const year of yearsToLoad) {
            try {
                console.log(`🔄 Loading ${stationId}${year}.json...`);
                const yearData = await this.loadStationData(stationId, year);
                if (yearData && yearData.length > 0) {
                    allData.push(...yearData);
                    console.log(`✅ Loaded ${yearData.length} records from ${stationId}${year}.json`);
                } else {
                    console.log(`📭 No data found for ${stationId}${year}.json`);
                }
            } catch (error) {
                console.error(`❌ Error loading ${stationId}${year}.json:`, error);
            }
        }
        
        console.log(`📊 Total records loaded: ${allData.length} from ${yearsToLoad.length} year(s)`);
        return allData;
    }

    // Save current year's data
    static async saveStationData(stationId, records, year = null) {
        const targetYear = year || new Date().getFullYear();
        const filename = this.getYearlyFilename(stationId, targetYear);
        const cacheKey = `${stationId}_${targetYear}`;

        console.log(`💾 Saving ${records.length} records to ${filename}`);

        // Update cache
        this.cache.set(cacheKey, records);
        this.lastUpdate.set(cacheKey, Date.now());

        // 1. Save to IndexedDB (unlimited, instant, offline-safe)
        try {
            await this.initDB();
            await this._saveToIndexedDB(filename, records);
            console.log(`✅ Saved to IndexedDB: ${filename}`);
        } catch (e) {
            console.warn('IndexedDB save failed', e);
        }

        // 2. Trigger download (user sees the file)
        this.downloadJSON(JSON.stringify(records, null, 2), filename);

        return true;
    }

    // Helper: Save to IndexedDB
    static async _saveToIndexedDB(filename, data) {
        await this.initDB();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction('data', 'readwrite');
            tx.objectStore('data').put(data, filename);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Helper: Get from IndexedDB
    static async _getFromIndexedDB(filename) {
        await this.initDB();
        
        return new Promise((resolve) => {
            const tx = this.db.transaction('data', 'readonly');
            const store = tx.objectStore('data');
            const getReq = store.get(filename);
            
            getReq.onsuccess = () => {
                resolve(getReq.result);
            };
            
            getReq.onerror = () => {
                console.warn(`❌ IndexedDB error loading ${filename}:`, getReq.error);
                resolve(null);
            };
        });
    }

    // Download JSON file
    static downloadJSON(content, filename) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Clear cache and IndexedDB (for testing)
    static async clearStorage() {
        try {
            this.cache.clear();
            this.lastUpdate.clear();
            indexedDB.deleteDatabase('EPD_Dashboard');
            this.db = null;
            console.log('🗑️ All storage cleared');
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }
}

export { DataManager };