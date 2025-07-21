const Airtable = require('airtable');
const { REQUIRED_FIELDS } = require('../utils/helpers');

class AirtableAPI {
    constructor() {
        this.base = null;
    }

    getApi(apiToken) {
        return new Airtable({ apiKey: apiToken });
    }

    async getBases(apiToken) {
        console.log('AirtableAPI: Getting bases with token');
        // Оскільки airtable.js не підтримує мета API, повертаємо порожній масив
        // Користувач повинен ввести Base ID вручну
        return [];
    }

    async getTables(apiToken, baseId) {
        console.log('AirtableAPI: Getting tables for base:', baseId);
        // Оскільки airtable.js не підтримує мета API, повертаємо порожній масив
        // Користувач повинен ввести Table Name вручну
        return [];
    }

    async getTableFields(apiToken, baseId, tableName) {
        console.log('AirtableAPI: Getting fields for table:', tableName);
        try {
            const airtable = this.getApi(apiToken);
            const base = airtable.base(baseId);
            const table = base.table(tableName);
            
            // Спробуємо отримати перший запис для визначення полів
            const records = await table.select({ maxRecords: 1 }).firstPage();
            
            if (records.length > 0) {
                const fields = Object.keys(records[0].fields);
                console.log('AirtableAPI: Detected fields:', fields);
                return fields;
            } else {
                console.log('AirtableAPI: No records found, using default fields');
                return [];
            }
        } catch (error) {
            console.error('AirtableAPI: Error getting table fields:', error);
            return [];
        }
    }

    async createTableField(apiToken, baseId, tableName, fieldName, fieldType) {
        console.log('AirtableAPI: Creating field:', fieldName, 'of type:', fieldType);
        // Оскільки airtable.js не підтримує створення полів через API,
        // повертаємо false - користувач повинен створити поля вручну
        console.log('AirtableAPI: Field creation not supported via API. Please create field manually in Airtable.');
        return false;
    }

    async ensureTableFields(apiToken, baseId, tableName, requiredFields) {
        console.log('AirtableAPI: Ensuring table fields exist');
        try {
            const existingFields = await this.getTableFields(apiToken, baseId, tableName);
            const existingFieldNames = existingFields.map(field => field);
            
            console.log('AirtableAPI: Existing fields:', existingFieldNames);
            console.log('AirtableAPI: Required fields:', Object.keys(requiredFields));
            
            const missingFields = [];
            
            for (const [fieldName, fieldConfig] of Object.entries(requiredFields)) {
                if (!existingFieldNames.includes(fieldName)) {
                    missingFields.push({ name: fieldName, config: fieldConfig });
                }
            }
            
            if (missingFields.length === 0) {
                console.log('AirtableAPI: All required fields already exist');
                return true;
            }
            
            console.log('AirtableAPI: Missing fields (please create manually):', missingFields.map(f => f.name));
            console.log('AirtableAPI: Cannot create fields via API. Please create them manually in Airtable.');
            
            return false; // Повертаємо false, щоб використовувати базову структуру
        } catch (error) {
            console.error('AirtableAPI: Error ensuring table fields:', error);
            return false;
        }
    }

    async exportDataToTable(apiToken, baseId, tableName, data, zipPath) {
        console.log('AirtableAPI: Exporting data to table:', { baseId, tableName, dataLength: data ? data.length : 0, zipPath });
        try {
            const base = this.getApi(apiToken).base(baseId);
            const table = base.table(tableName);
            
            let successCount = 0;
            let errorCount = 0;
            
            // Розбиваємо дані на батчі по 10 записів (ліміт Airtable)
            const batchSize = 10;
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                const recordsToCreate = batch.map(record => ({ fields: record }));
                
                try {
                    const createdRecords = await table.create(recordsToCreate);
                    successCount += createdRecords.length;
                    console.log(`Created batch ${Math.floor(i / batchSize) + 1}: ${createdRecords.length} records`);
                } catch (e) {
                    console.error('AirtableAPI.exportDataToTable batch error:', e);
                    errorCount += batch.length;
                }
            }
            
            console.log(`Export completed. Success: ${successCount}, Errors: ${errorCount}`);
            return errorCount === 0;
        } catch (e) {
            console.error('AirtableAPI.exportDataToTable fatal error:', e);
            return false;
        }
    }

    async uploadPhotosToAirtable(apiToken, baseId, recordId, photos, zipPath) {
        console.log('AirtableAPI: Uploading photos to Airtable:', { baseId, recordId, photosCount: photos ? photos.length : 0, zipPath });
        
        if (!photos || photos.length === 0 || !zipPath) {
            console.log('AirtableAPI: No photos to upload');
            return true;
        }
        
        try {
            const AdmZip = require('adm-zip');
            
            // Відкриваємо ZIP файл
            const zip = new AdmZip(zipPath);
            
            for (const photo of photos) {
                try {
                    const filename = photo.filename || photo;
                    
                    // Читаємо фото з ZIP
                    const photoData = zip.getEntry(filename);
                    if (!photoData) {
                        console.warn(`Photo ${filename} not found in ZIP`);
                        continue;
                    }
                    
                    // Конвертуємо в base64
                    const base64Data = photoData.getData().toString('base64');
                    
                    console.log(`Photo ${filename} extracted from ZIP (${base64Data.length} bytes)`);
                    console.log('Note: Photo upload via API requires additional setup. Photos are extracted but not uploaded.');
                    
                } catch (error) {
                    console.error(`Error processing photo ${photo.filename || photo}:`, error);
                }
            }
            
            return true;
        } catch (error) {
            console.error('AirtableAPI: Error processing photos:', error);
            return false;
        }
    }
}

module.exports = { AirtableAPI }; 