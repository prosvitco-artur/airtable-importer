const { AirtableAPI } = require('./AirtableAPI');
const { FileManager } = require('./FileManager');
const { FIELD_MAPPING, NUMBER_FIELDS, INTEGER_FIELDS, REQUIRED_FIELDS } = require('../utils/helpers');

class ImportManager {
    constructor() {
        this.airtableAPI = new AirtableAPI();
        this.fileManager = new FileManager();
        this._useBasicFields = false;
    }

    async startImport(zipPath, apiToken, baseId, tableName, uploadMethod, uiManager) {
        try {
            this.fileManager.validateFile(zipPath);
            uiManager.updateProgress('Файл валідовано успішно');

            uiManager.updateProgress('Починаю обробку ZIP файлу...');
            const data = await this.fileManager.processZipFile(zipPath);
            uiManager.updateProgress(`Знайдено ${data.length} записів`);

            uiManager.updateProgress('Перевірка структури таблиці...');
            const fieldsReady = await this.airtableAPI.ensureTableFields(apiToken, baseId, tableName, REQUIRED_FIELDS);
            this._useBasicFields = !fieldsReady;
            if (!fieldsReady) {
                uiManager.updateProgress('⚠️ Не всі поля створено. Буде використано базову структуру запису.');
            }

            uiManager.updateProgress('Підготовка даних для імпорту...');
            const preparedData = this.prepareDataForAirtable(data, zipPath);

            uiManager.updateProgress('Експорт в Airtable...');
            const success = await this.airtableAPI.exportDataToTable(
                apiToken, baseId, tableName, preparedData, zipPath
            );

            if (success) {
                uiManager.importFinished(true, `Успішно імпортовано ${preparedData.length} записів`);
            } else {
                uiManager.importFinished(false, 'Помилка при експорті в Airtable');
            }
        } catch (error) {
            console.error('Import error:', error);
            uiManager.importFinished(false, `Помилка: ${error.message}`);
        }
    }

    prepareDataForAirtable(data, zipPath) {
        console.log('ImportManager: Preparing data for Airtable');
        const preparedData = [];

        for (const record of data) {
            try {
                const preparedRecord = this._useBasicFields 
                    ? this.createBasicRecord(record)
                    : this.createFullRecord(record);
                
                if (preparedRecord) {
                    preparedData.push(preparedRecord);
                }
            } catch (error) {
                console.error('Error preparing record:', error);
            }
        }

        console.log(`ImportManager: Prepared ${preparedData.length} records`);
        return preparedData;
    }

    createBasicRecord(record) {
        const basicRecord = {};
        
        // Базові поля
        if (record.estate_type) basicRecord.estate_type = record.estate_type;
        if (record.price) basicRecord.price = this.convertFieldValue(record.price, 'number');
        if (record.price_currency) basicRecord.price_currency = record.price_currency;
        if (record.address) basicRecord.address = record.address;
        if (record.description_detail) basicRecord.description_detail = record.description_detail;
        
        return basicRecord;
    }

    createFullRecord(record) {
        const fullRecord = {};
        
        // Копіюємо всі поля з мапінгу
        for (const [ourField, airtableField] of Object.entries(FIELD_MAPPING)) {
            if (record[ourField] !== undefined) {
                const value = this.convertFieldValue(record[ourField], ourField);
                if (value !== null && value !== undefined) {
                    fullRecord[airtableField] = value;
                }
            }
        }
        
        // Обробляємо фото
        if (record.photos && Array.isArray(record.photos)) {
            const photoUrls = this.extractPhotos(record.photos, zipPath);
            if (photoUrls.length > 0) {
                fullRecord.photos = photoUrls;
            }
        }
        
        // Додаємо базовий опис, якщо немає детального
        if (!fullRecord.description_detail && record.description_detail) {
            fullRecord.description_detail = this.createBasicDescription(record);
        }
        
        return fullRecord;
    }

    convertFieldValue(value, fieldName) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        // Конвертуємо числа
        if (NUMBER_FIELDS.has(fieldName)) {
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
        }

        // Конвертуємо цілі числа
        if (INTEGER_FIELDS.has(fieldName)) {
            const num = parseInt(value);
            return isNaN(num) ? null : num;
        }

        // Конвертуємо булеві значення
        if (typeof value === 'string') {
            if (value.toLowerCase() === 'true' || value === '1') return true;
            if (value.toLowerCase() === 'false' || value === '0') return false;
        }

        return value;
    }

    extractPhotos(photos, zipPath) {
        const photoUrls = [];
        
        for (const photo of photos) {
            const filename = photo.filename || photo;
            if (filename) {
                // Тут можна додати логіку для завантаження фото
                photoUrls.push(filename);
            }
        }
        
        return photoUrls;
    }

    createBasicDescription(record) {
        const parts = [];
        
        if (record.estate_type) parts.push(`Тип: ${record.estate_type}`);
        if (record.price) parts.push(`Ціна: ${record.price} ${record.price_currency || 'USD'}`);
        if (record.address) parts.push(`Адреса: ${record.address}`);
        if (record.room_quantity) parts.push(`Кімнат: ${record.room_quantity}`);
        if (record.total_floor_area) parts.push(`Площа: ${record.total_floor_area} м²`);
        
        return parts.join(', ');
    }
}

module.exports = { ImportManager }; 