const Airtable = require('airtable');
const { REQUIRED_FIELDS } = require('../utils/helpers');

class AirtableAPI {
    constructor() {
        this.metaURL = 'https://api.airtable.com/v0/meta/bases';
    }

    getApi(apiToken) {
        return new Airtable({ apiKey: apiToken });
    }

    async getBases(apiToken) {
        console.log('AirtableAPI: Getting bases with token');
        
        // Заглушка - офіційна бібліотека не дає список баз
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: 'base1', name: 'Test Base 1' },
                    { id: 'base2', name: 'Test Base 2' },
                    { id: 'base3', name: 'Production Base' }
                ]);
            }, 1000);
        });
    }

    async getTables(apiToken, baseId) {
        console.log('AirtableAPI: Getting tables for base:', baseId);
        
        // Заглушка - офіційна бібліотека не дає список таблиць
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { name: 'Products' },
                    { name: 'Customers' },
                    { name: 'Orders' },
                    { name: 'Inventory' }
                ]);
            }, 800);
        });
    }

    async getTableFields(apiToken, baseId, tableName) {
        // Заглушка - повертаємо базові поля
        return ['Name', 'Notes', 'Visited', 'Photos'];
    }

    async createTableField(apiToken, baseId, tableName, fieldName, fieldType = 'singleLineText') {
        console.log('AirtableAPI: Creating field:', fieldName, 'type:', fieldType);
        
        // Заглушка - імітація створення поля
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 500);
        });
    }

    async ensureTableFields(apiToken, baseId, tableName, requiredFields = REQUIRED_FIELDS) {
        console.log('AirtableAPI: Ensuring table fields');
        
        // Заглушка - імітація перевірки/створення полів
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, 1000);
        });
    }

    async exportDataToTable(apiToken, baseId, tableName, data, zipPath) {
        console.log('AirtableAPI: Exporting data to table:', {
            baseId,
            tableName,
            dataLength: data ? data.length : 0,
            zipPath
        });
        
        try {
            const base = this.getApi(apiToken).base(baseId);
            const table = base.table(tableName);
            let successCount = 0;
            let errorCount = 0;
            
            for (const record of data) {
                try {
                    await table.create([{ fields: record }]);
                    successCount++;
                    console.log(`Created record ${successCount}`);
                } catch (e) {
                    console.error('AirtableAPI.exportDataToTable error:', e);
                    errorCount++;
                }
            }
            
            console.log(`Export completed. Success: ${successCount}, Errors: ${errorCount}`);
            return errorCount === 0;
        } catch (e) {
            console.error('AirtableAPI.exportDataToTable fatal error:', e);
            return false;
        }
    }

    // Заглушка для upload_photos_to_airtable
    async uploadPhotosToAirtable(apiToken, baseId, recordId, photos, zipPath) {
        console.log('AirtableAPI.uploadPhotosToAirtable (stub)', { baseId, recordId, photos, zipPath });
        return true;
    }
}

module.exports = { AirtableAPI }; 