const { AirtableImporter } = require('./src/components/AirtableImporter');

// Ініціалізація при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    new AirtableImporter();
}); 