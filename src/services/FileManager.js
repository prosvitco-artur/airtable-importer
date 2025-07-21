const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

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

    async readXmlFile(xmlPath) {
        console.log('FileManager: Reading XML file:', xmlPath);
        
        try {
            const xmlData = fs.readFileSync(xmlPath, 'utf8');
            console.log('XML data length:', xmlData.length);
            
            // Парсимо XML
            const parser = new xml2js.Parser({ explicitArray: false });
            const result = await parser.parseStringPromise(xmlData);
            
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
        const records = [];
        
        // Спробуємо різні можливі структури XML
        const possiblePaths = [
            'realty_feed.offer',
            'offer',
            'realty_feed.offers.offer',
            'offers.offer',
            'data.offer',
            'root.offer'
        ];
        
        for (const path of possiblePaths) {
            const data = this.getNestedValue(xmlResult, path);
            if (data) {
                const offers = Array.isArray(data) ? data : [data];
                for (const offer of offers) {
                    const record = this.parseOfferToRecord(offer);
                    if (record) {
                        records.push(record);
                    }
                }
                break; // Знайшли дані, виходимо
            }
        }
        
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
            return null;
        }
        
        const record = {};
        
        // Мапінг полів з XML до наших полів
        const fieldMapping = {
            'type': 'estate_type',
            'price': 'price',
            'currency': 'price_currency',
            'address': 'address',
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
        
        // Копіюємо значення згідно з мапінгом
        for (const [xmlField, ourField] of Object.entries(fieldMapping)) {
            if (offer[xmlField] !== undefined) {
                record[ourField] = offer[xmlField];
            }
        }
        
        // Обробляємо фото, якщо є
        if (offer.photos && Array.isArray(offer.photos.photo)) {
            record.photos = offer.photos.photo.map(photo => ({
                filename: photo.url || photo.filename || photo
            }));
        } else if (offer.photo) {
            record.photos = [{
                filename: offer.photo.url || offer.photo.filename || offer.photo
            }];
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