const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');
const iconv = require('iconv-lite');

class FileManager {
    constructor() {
        this.supportedFormats = ['.zip'];
    }

    validateFile(filePath) {
        console.log('FileManager: Validating file:', filePath);
        
        if (!filePath) {
            throw new Error('Файл не вибрано');
        }

        if (!fs.existsSync(filePath)) {
            throw new Error('Файл не існує');
        }

        const ext = path.extname(filePath).toLowerCase();
        if (!this.supportedFormats.includes(ext)) {
            throw new Error(`Непідтримуваний формат файлу: ${ext}`);
        }

        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            throw new Error('Файл порожній');
        }

        return true;
    }

    async processZipFile(zipPath) {
        console.log('FileManager: Processing ZIP file:', zipPath);
        
        try {
            // Розпаковуємо ZIP файл
            const extractPath = this.createTempDirectory();
            await this.extractZipFile(zipPath, extractPath);
            
            // Знаходимо XML файли
            const xmlFiles = this.findXmlFiles(extractPath);
            console.log('Found XML files:', xmlFiles);
            
            if (xmlFiles.length === 0) {
                throw new Error('XML файли не знайдено в архіві');
            }
            
            // Обробляємо кожен XML файл
            const allData = [];
            for (const xmlFile of xmlFiles) {
                const data = await this.readXmlFile(xmlFile);
                console.log('data', data);
                if (data && data.length > 0) {
                    allData.push(...data);
                }
            }
            
            // Очищаємо тимчасову папку
            this.cleanupTempDirectory(extractPath);
            
            console.log(`Processed ${allData.length} records from XML files`);
            return allData;
            
        } catch (error) {
            console.error('Error processing ZIP file:', error);
            throw error;
        }
    }

    async extractZipFile(zipPath, extractPath) {
        console.log('FileManager: Extracting ZIP file:', zipPath, 'to:', extractPath);
        
        try {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);
            console.log('ZIP extracted successfully');
        } catch (error) {
            console.error('Error extracting ZIP:', error);
            throw new Error('Помилка розпакування ZIP файлу');
        }
    }

    findXmlFiles(directory) {
        const xmlFiles = [];
        
        function scanDirectory(dir) {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (path.extname(item).toLowerCase() === '.xml') {
                    xmlFiles.push(fullPath);
                }
            }
        }
        
        scanDirectory(directory);
        return xmlFiles;
    }

    detectEncoding(xmlData) {
        // Спробуємо визначити кодування з XML декларації
        const encodingMatch = xmlData.match(/encoding\s*=\s*["']([^"']+)["']/i);
        if (encodingMatch) {
            const detectedEncoding = encodingMatch[1].toLowerCase();
            console.log('Detected encoding from XML declaration:', detectedEncoding);
            return detectedEncoding;
        }
        
        // Якщо не знайшли в XML декларації, спробуємо визначити автоматично
        // Перевіряємо наявність кириличних символів
        const hasCyrillic = /[а-яёіїєґ]/i.test(xmlData);
        if (hasCyrillic) {
            console.log('Detected Cyrillic characters, assuming Windows-1251');
            return 'windows-1251';
        }
        
        // Перевіряємо наявність латинських символів з діакритичними знаками
        const hasLatinExtended = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(xmlData);
        if (hasLatinExtended) {
            console.log('Detected Latin extended characters, assuming ISO-8859-1');
            return 'iso-8859-1';
        }
        
        console.log('No encoding detected, using UTF-8');
        return 'utf8';
    }

    convertToUtf8(xmlData, encoding) {
        if (encoding === 'utf8' || encoding === 'utf-8') {
            console.log('File is already UTF-8, no conversion needed');
            return xmlData;
        }
        
        try {
            console.log(`Converting from ${encoding} to UTF-8...`);
            // Конвертуємо з визначеного кодування в UTF-8
            const buffer = Buffer.from(xmlData, 'binary');
            const converted = iconv.decode(buffer, encoding);
            console.log('Conversion successful');
            return converted;
        } catch (error) {
            console.warn(`Failed to convert from ${encoding}, trying UTF-8:`, error.message);
            return xmlData;
        }
    }

    async readXmlFile(xmlPath) {
        console.log('FileManager: Reading XML file:', xmlPath);
        
        try {
            // Читаємо файл як бінарні дані
            const xmlData = fs.readFileSync(xmlPath);
            console.log('XML data length:', xmlData.length);
            
            // Конвертуємо в рядок для визначення кодування
            const xmlString = xmlData.toString('binary');
            const detectedEncoding = this.detectEncoding(xmlString);
            console.log('Detected encoding:', detectedEncoding);
            
            // Конвертуємо в UTF-8
            const utf8XmlData = this.convertToUtf8(xmlString, detectedEncoding);
            
            // Парсимо XML
            const parser = new xml2js.Parser({ 
                explicitArray: false,
                ignoreAttrs: false,
                mergeAttrs: true
            });
            const result = await parser.parseStringPromise(utf8XmlData);
            
            // Витягуємо дані з різних можливих структур
            const records = this.extractRecordsFromXml(result);
            
            console.log(`Extracted ${records.length} records from XML`);
            
            return records;
            
        } catch (error) {
            console.error('Error reading XML file:', error);
            throw new Error(`Помилка читання XML файлу: ${error.message}`);
        }
    }

    extractRecordsFromXml(xmlResult) {
        console.log('FileManager: Extracting records from XML structure');
        const records = [];
        
        // Спробуємо різні можливі структури XML
        const possiblePaths = [
            // Нова структура з REALTYXML
            'REALTYXML.BLOCK.SALE.OBJECT',
            'BLOCK.SALE.OBJECT',
            'SALE.OBJECT',
            'OBJECT',
            // Стара структура
            'realty_feed.offer',
            'realty_feed.offers.offer',
            'offers.offer',
            'offer',
            'data.offer',
            'root.offer',
            'feed.offer',
            'realty.offer',
            'property.offer',
            'estate.offer'
        ];
        
        for (const path of possiblePaths) {
            const data = this.getNestedValue(xmlResult, path);
            if (data) {
                console.log(`Found data at path: ${path}`);
                const offers = Array.isArray(data) ? data : [data];
                console.log(`Processing ${offers.length} offers`);
                
                for (const offer of offers) {
                    const record = this.parseOfferToRecord(offer);
                    if (record) {
                        records.push(record);
                        console.log('Added record:', record.estate_type || 'Unknown', record.address || 'No address');
                    }
                }
                break; // Знайшли дані, виходимо
            }
        }
        
        // Якщо не знайшли за стандартними шляхами, спробуємо знайти будь-які записи
        if (records.length === 0) {
            console.log('No records found with standard paths, trying to find any data...');
            const allData = this.searchForAnyRecords(xmlResult);
            console.log('Found additional data:', allData.length, 'items');
            records.push(...allData);
        }
        
        console.log(`Total records extracted: ${records.length}`);
        return records;
    }

    searchForAnyRecords(xmlResult) {
        const records = [];
        
        // Рекурсивно шукаємо будь-які об'єкти, що можуть бути записами
        function searchRecursively(obj, path = '') {
            if (typeof obj === 'object' && obj !== null) {
                // Перевіряємо, чи це може бути запис нерухомості
                if (obj.type || obj.price || obj.address || obj.estate_type) {
                    console.log(`Found potential record at path: ${path}`);
                    const record = this.parseOfferToRecord(obj);
                    if (record) {
                        records.push(record);
                    }
                }
                
                // Рекурсивно обходимо всі властивості
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'object' && value !== null) {
                        searchRecursively(value, path ? `${path}.${key}` : key);
                    }
                }
            }
        }
        
        searchRecursively.bind(this)(xmlResult);
        return records;
    }


    getNestedValue(obj, path) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return null;
            }
        }
        
        return current;
    }

    parseOfferToRecord(offer) {
        if (!offer || typeof offer !== 'object') {
            console.log('Invalid offer object:', offer);
            return null;
        }
        
        const record = {};
        
        // Мапінг полів з XML до наших полів (оновлений для нової структури)
        const fieldMapping = {
            // Основні поля
            'ESTATE_TYPE': 'estate_type',
            'PRICE': 'price',
            'PRICE_CURRENCY': 'price_currency',
            'ADDRESS': 'address',
            'DESCRIPTION_DETAIL': 'description_detail',
            'ROOM_QUANTITY': 'room_quantity',
            'FLOOR': 'floor',
            'NUMBER_OF_STOREYS': 'number_of_storeys',
            'TOTAL_FLOOR_AREA': 'total_floor_area',
            'KITCHEN_FLOOR_AREA': 'kitchen_floor_area',
            'CITY': 'city',
            'DISTRICT': 'district',
            'STREET': 'street',
            'CODE': 'code',
            'SUBJECT_ID': 'subject_id',
            'REGION': 'region',
            'COUNTRY': 'country',
            
            // Додаткові поля
            'HOUSE_TYPE': 'house_type',
            'INFO_SOURCE': 'info_source',
            'CITY_ID': 'city_id',
            'DISTRICT_REGION': 'district_region',
            'PRICE_OWNER_CURRENCY': 'price_owner_currency',
            'MULTIMEDIA_LINK_1': 'multimedia_link',
            'SOURCE_NUM': 'source_num',
            'BASE_PRICE_CURRENCY': 'base_price_currency',
            'PIPE_ITEM': 'pipe_item',
            'PIPE_AGENT_ID': 'pipe_agent_id',
            'PIPE_AGENT_NAME': 'pipe_agent_name',
            
            // Старі поля (для зворотної сумісності)
            'type': 'estate_type',
            'price': 'price',
            'currency': 'price_currency',
            'description': 'description_detail',
            'rooms': 'room_quantity',
            'floor': 'floor',
            'floors': 'number_of_storeys',
            'area': 'total_floor_area',
            'kitchen_area': 'kitchen_floor_area',
            'city': 'city',
            'district': 'district',
            'street': 'street',
            'house': 'house_no',
            'apartment': 'flat_no',
            'owner': 'owner_name',
            'phone': 'owner_phone',
            'agent': 'agent_name',
            'code': 'code',
            'id': 'subject_id',
            'operation': 'operation',
            'status': 'status',
            'wall_type': 'walling_type',
            'room_layout': 'room_layout',
            'heating': 'heat_supply',
            'bathroom': 'bathroom',
            'balcony': 'balcony',
            'condition': 'condition',
            'windows': 'window_location',
            'date': 'registration_date',
            'modified': 'date_change',
            'region': 'region',
            'country': 'country'
        };
        
        // Спочатку обробляємо основні поля з offer
        for (const [xmlField, ourField] of Object.entries(fieldMapping)) {
            if (offer[xmlField] !== undefined) {
                record[ourField] = offer[xmlField];
            }
        }
        
        // Обробляємо вкладені поля з DESCRIPTION, якщо є
        if (offer.DESCRIPTION) {
            for (const [xmlField, ourField] of Object.entries(fieldMapping)) {
                if (offer.DESCRIPTION[xmlField] !== undefined) {
                    record[ourField] = offer.DESCRIPTION[xmlField];
                }
            }
        }
        
        // Обробляємо власника, якщо є
        if (offer.OWNER) {
            if (offer.OWNER.NAME) record.owner_name = offer.OWNER.NAME;
            if (offer.OWNER.PHONE) record.owner_phone = offer.OWNER.PHONE;
            if (offer.OWNER.CLIENT_ID) record.owner_id = offer.OWNER.CLIENT_ID;
        }
        
        // Обробляємо дати з DESCRIPTION
        if (offer.DESCRIPTION && offer.DESCRIPTION.REGISTRATION_DATE) {
            const regDate = offer.DESCRIPTION.REGISTRATION_DATE;
            if (regDate.YEAR && regDate.MONTH && regDate.DAY) {
                record.registration_date = `${regDate.YEAR}-${regDate.MONTH.padStart(2, '0')}-${regDate.DAY.padStart(2, '0')}`;
            }
        }
        
        if (offer.DESCRIPTION && offer.DESCRIPTION.DATE_CHANGE) {
            const changeDate = offer.DESCRIPTION.DATE_CHANGE;
            if (changeDate.YEAR && changeDate.MONTH && changeDate.DAY) {
                record.date_change = `${changeDate.YEAR}-${changeDate.MONTH.padStart(2, '0')}-${changeDate.DAY.padStart(2, '0')}`;
            }
        }
        
        // Обробляємо фото
        if (offer.PHOTO && offer.PHOTO.ITEM) {
            const photos = Array.isArray(offer.PHOTO.ITEM) ? offer.PHOTO.ITEM : [offer.PHOTO.ITEM];
            record.photos = photos.map(photo => ({
                filename: typeof photo === 'string' ? photo : photo._,
                index: photo.index,
                note: photo.note,
                is_first: photo.is_first
            }));
            console.log(`Found ${record.photos.length} photos`);
        } else if (offer.photos && Array.isArray(offer.photos.photo)) {
            record.photos = offer.photos.photo.map(photo => ({
                filename: photo.url || photo.filename || photo
            }));
            console.log(`Found ${record.photos.length} photos`);
        } else if (offer.photo) {
            record.photos = [{
                filename: offer.photo.url || offer.photo.filename || offer.photo
            }];
            console.log('Found 1 photo');
        }
        
        // Додаємо базові поля, якщо їх немає
        if (!record.estate_type) {
            record.estate_type = 'Нерухомість';
        }
        
        if (!record.address) {
            const addressParts = [];
            if (record.city) addressParts.push(record.city);
            if (record.street) addressParts.push(record.street);
            if (record.house_no) addressParts.push(record.house_no);
            record.address = addressParts.join(', ');
        }
        
        return record;
    }

    createTempDirectory() {
        const tempDir = path.join(__dirname, '../../temp', Date.now().toString());
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        return tempDir;
    }

    cleanupTempDirectory(tempDir) {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

module.exports = { FileManager }; 