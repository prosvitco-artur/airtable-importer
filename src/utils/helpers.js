/**
 * Допоміжні функції для застосунку
 */

// Валідація API Token
function validateApiToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    
    // Мінімальна довжина для Airtable API Token
    if (token.length < 10) {
        return false;
    }
    
    // Перевірка формату (базова)
    if (!token.startsWith('pat') && !token.startsWith('key')) {
        return false;
    }
    
    return true;
}

// Форматування розміру файлу
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Форматування часу
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

// Генерація унікального ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Перевірка чи є об'єкт порожнім
function isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string') return obj.trim().length === 0;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
}

// Безпечне отримання значення з об'єкта
function get(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return defaultValue;
        }
    }
    
    return result;
}

// Дебаунс функція
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle функція
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Копіювання в буфер обміну
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
}

// Експорт об'єкта як JSON файл
function exportAsJson(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Санітизація імені файлу
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Перевірка підтримуваних форматів файлів
function isSupportedFileType(filename, supportedTypes = ['.zip', '.xml']) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return supportedTypes.includes(ext);
}

// Airtable field requirements and mapping
const REQUIRED_FIELDS = {
    'Property Type': 'singleLineText',
    'Price': 'number',
    'Location': 'multilineText',
    'Description': 'multilineText',
    'Visited': 'checkbox',
    'Rooms': 'number',
    'Floor': 'number',
    'Area': 'number',
    'City': 'singleLineText',
    'District': 'singleLineText',
    'Street': 'singleLineText',
    'House Number': 'singleLineText',
    'Apartment Number': 'singleLineText',
    'Owner Name': 'singleLineText',
    'Owner Phone': 'singleLineText',
    'Agent Name': 'singleLineText',
    'Property Code': 'singleLineText',
    'Subject ID': 'singleLineText',
    'Operation Type': 'singleLineText',
    'Status': 'singleLineText',
    'Currency': 'singleLineText',
    'Total Floors': 'number',
    'Kitchen Area': 'number',
    'Wall Type': 'singleLineText',
    'Room Layout': 'singleLineText',
    'Heating': 'singleLineText',
    'Bathroom': 'singleLineText',
    'Balcony': 'singleLineText',
    'Condition': 'singleLineText',
    'Window Location': 'singleLineText',
    'Registration Date': 'singleLineText',
    'Last Modified': 'singleLineText',
    'Region': 'singleLineText',
    'Country': 'singleLineText',
    'Images': 'multipleAttachments'
};

const FIELD_MAPPING = {
    'estate_type': 'Property Type',
    'price': 'Price',
    'address': 'Location',
    'description_detail': 'Description',
    'room_quantity': 'Rooms',
    'floor': 'Floor',
    'total_floor_area': 'Area',
    'city': 'City',
    'district': 'District',
    'street': 'Street',
    'house_no': 'House Number',
    'flat_no': 'Apartment Number',
    'owner_name': 'Owner Name',
    'owner_phone': 'Owner Phone',
    'agent_name': 'Agent Name',
    'code': 'Property Code',
    'subject_id': 'Subject ID',
    'operation': 'Operation Type',
    'status': 'Status',
    'price_currency': 'Currency',
    'number_of_storeys': 'Total Floors',
    'kitchen_floor_area': 'Kitchen Area',
    'walling_type': 'Wall Type',
    'room_layout': 'Room Layout',
    'heat_supply': 'Heating',
    'bathroom': 'Bathroom',
    'balcony': 'Balcony',
    'condition': 'Condition',
    'window_location': 'Window Location',
    'registration_date': 'Registration Date',
    'date_change': 'Last Modified',
    'region': 'Region',
    'country': 'Country'
};

const NUMBER_FIELDS = new Set(['price', 'total_floor_area', 'kitchen_floor_area']);
const INTEGER_FIELDS = new Set(['room_quantity', 'floor', 'number_of_storeys']);

module.exports = {
    validateApiToken,
    formatFileSize,
    formatTime,
    generateId,
    isEmpty,
    get,
    debounce,
    throttle,
    copyToClipboard,
    exportAsJson,
    sanitizeFilename,
    isSupportedFileType,
    REQUIRED_FIELDS,
    FIELD_MAPPING,
    NUMBER_FIELDS,
    INTEGER_FIELDS
}; 