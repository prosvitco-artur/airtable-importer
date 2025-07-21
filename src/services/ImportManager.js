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
        console.log('ImportManager: Starting import process');
        try {
            // Валідація файлу
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

            // Підготовка даних
            uiManager.updateProgress('Підготовка даних для імпорту...');
            const preparedData = this.prepareDataForAirtable(data, zipPath);

            // Експорт в Airtable
            uiManager.updateProgress('Експорт в Airtable...');
            const success = await this.airtableAPI.exportDataToTable(
                apiToken,
                baseId,
                tableName,
                preparedData,
                zipPath
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
        return data.map(record => {
            if (this._useBasicFields) {
                return this.createBasicRecord(record);
            } else {
                return this.createFullRecord(record);
            }
        });
    }

    createBasicRecord(record) {
        // Аналог _create_basic_record
        return {
            'Name': `${record['estate_type'] || 'Нерухомість'} - ${record['address'] || 'Без адреси'}`,
            'Notes': this.createBasicDescription(record),
            'Visited': false,
            'Photos': this.extractPhotos(record)
        };
    }

    createFullRecord(record) {
        // Аналог _create_full_record
        const airtableRecord = { 'Visited': false };
        for (const [xmlField, airtableField] of Object.entries(FIELD_MAPPING)) {
            if (record[xmlField]) {
                airtableRecord[airtableField] = this.convertFieldValue(xmlField, record[xmlField]);
            }
        }
        airtableRecord['Photos'] = this.extractPhotos(record);
        return airtableRecord;
    }

    convertFieldValue(fieldName, value) {
        // Аналог _convert_field_value
        try {
            if (NUMBER_FIELDS.has(fieldName)) {
                return parseFloat(value);
            } else if (INTEGER_FIELDS.has(fieldName)) {
                return parseInt(value, 10);
            } else {
                return String(value);
            }
        } catch {
            return String(value);
        }
    }

    extractPhotos(record) {
        // Аналог _extract_photos
        const photos = [];
        if (Array.isArray(record.photos)) {
            for (const photo of record.photos) {
                if (photo && photo.filename) {
                    photos.push(photo.filename);
                }
            }
        }
        return photos;
    }

    createBasicDescription(record) {
        // Аналог _create_basic_description
        const parts = [];
        const fieldsToAdd = [
            ['estate_type', 'Тип'],
            ['price', 'Ціна'],
            ['address', 'Адреса'],
            ['room_quantity', 'Кімнати'],
            ['total_floor_area', 'Площа'],
            ['owner_name', 'Власник'],
            ['owner_phone', 'Телефон'],
            ['agent_name', 'Агент'],
            ['description_detail', 'Опис']
        ];
        for (const [field, label] of fieldsToAdd) {
            const value = record[field];
            if (value) {
                if (field === 'price') {
                    const currency = record['price_currency'] || '';
                    parts.push(`${label}: ${value} ${currency}`);
                } else if (field === 'total_floor_area') {
                    parts.push(`${label}: ${value} м²`);
                } else if (field === 'floor' && record['number_of_storeys']) {
                    parts.push(`Поверх: ${value}/${record['number_of_storeys']}`);
                } else {
                    parts.push(`${label}: ${value}`);
                }
            }
        }
        return parts.join('\n');
    }
}

module.exports = { ImportManager }; 