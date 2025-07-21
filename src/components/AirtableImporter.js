const { AirtableAPI } = require('../services/AirtableAPI');
const { FileManager } = require('../services/FileManager');
const { SettingsManager } = require('../services/SettingsManager');
const { UIManager } = require('../services/UIManager');
const { ImportManager } = require('../services/ImportManager');

class AirtableImporter {
    constructor() {
        this.basesData = {};
        this.tablesData = {};
        this.selectedFilePath = '';
        
        // Ініціалізація сервісів
        this.airtableAPI = new AirtableAPI();
        this.fileManager = new FileManager();
        this.settingsManager = new SettingsManager();
        this.uiManager = new UIManager();
        this.importManager = new ImportManager();
        
        this.initialize();
    }

    initialize() {
        this.uiManager.initializeElements();
        this.bindEvents();
        this.settingsManager.loadSettings(this.uiManager);
    }

    bindEvents() {
        // API Token зміна
        this.uiManager.apiTokenInput.addEventListener('input', () => {
            this.onApiTokenChanged();
        });

        // Кнопка оновлення баз
        this.uiManager.refreshBasesBtn.addEventListener('click', () => {
            this.refreshBases();
        });

        // Зміна вибраної бази
        this.uiManager.baseIdSelect.addEventListener('change', () => {
            this.onBaseChanged();
        });

        // Вибор файлу
        this.uiManager.selectFileBtn.addEventListener('click', () => {
            this.uiManager.fileInput.click();
        });

        this.uiManager.fileInput.addEventListener('change', (e) => {
            this.onFileSelected(e);
        });

        // Кнопка імпорту
        this.uiManager.importBtn.addEventListener('click', () => {
            this.startImport();
        });
    }

    onApiTokenChanged() {
        const apiToken = this.uiManager.apiTokenInput.value.trim();
        console.log('API Token changed:', apiToken ? '***' : 'empty');
        
        if (apiToken.length > 10) {
            this.loadBases(apiToken);
        } else {
            this.uiManager.resetBaseSelection();
            this.uiManager.resetTableSelection();
        }
    }

    async loadBases(apiToken) {
        console.log('Loading bases with API token');
        
        this.uiManager.setBaseLoading(true);
        
        try {
            const bases = await this.airtableAPI.getBases(apiToken);
            this.onBasesLoaded(bases);
        } catch (error) {
            console.error('Error loading bases:', error);
            this.uiManager.showMessage('Помилка завантаження баз', 'error');
            this.uiManager.setBaseLoading(false);
        }
    }

    onBasesLoaded(bases) {
        console.log('Bases loaded:', bases);
        
        this.uiManager.setBaseLoading(false);
        this.basesData = {};
        
        if (bases.length === 0) {
            this.uiManager.setNoBasesFound();
            return;
        }
        
        bases.forEach(base => {
            const displayText = `${base.name} (${base.id})`;
            this.uiManager.addBaseOption(displayText);
            this.basesData[displayText] = base.id;
        });
    }

    onBaseChanged() {
        const selectedBase = this.uiManager.baseIdSelect.value;
        console.log('Base changed:', selectedBase);
        
        if (this.basesData[selectedBase]) {
            const baseId = this.basesData[selectedBase];
            this.loadTables(baseId);
        } else {
            this.uiManager.resetTableSelection();
        }
    }

    async loadTables(baseId) {
        console.log('Loading tables for base:', baseId);
        
        this.uiManager.setTableLoading(true);
        
        try {
            const apiToken = this.uiManager.apiTokenInput.value.trim();
            const tables = await this.airtableAPI.getTables(apiToken, baseId);
            this.onTablesLoaded(tables);
        } catch (error) {
            console.error('Error loading tables:', error);
            this.uiManager.showMessage('Помилка завантаження таблиць', 'error');
            this.uiManager.setTableLoading(false);
        }
    }

    onTablesLoaded(tables) {
        console.log('Tables loaded:', tables);
        
        this.uiManager.setTableLoading(false);
        this.tablesData = {};
        
        if (tables.length === 0) {
            this.uiManager.setNoTablesFound();
            return;
        }
        
        tables.forEach(table => {
            this.uiManager.addTableOption(table.name);
            this.tablesData[table.name] = table.name;
        });
    }

    refreshBases() {
        const apiToken = this.uiManager.apiTokenInput.value.trim();
        console.log('Manual refresh bases');
        
        if (apiToken && apiToken.length > 10) {
            this.loadBases(apiToken);
        } else {
            this.uiManager.showMessage('Спочатку введіть API Token', 'error');
        }
    }

    onFileSelected(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            this.selectedFilePath = file.path;
            this.uiManager.setSelectedFile(file.path);
        }
    }

    async startImport() {
        console.log('Starting import process');
        
        // Перевірка валідації
        if (!this.validateImport()) {
            return;
        }
        
        // Збереження налаштувань
        this.settingsManager.saveSettings(this.uiManager);
        
        // Отримання вибраних значень
        const baseId = this.basesData[this.uiManager.baseIdSelect.value];
        const tableName = this.tablesData[this.uiManager.tableNameSelect.value];
        const uploadMethod = this.uiManager.uploadMethodSelect.value;
        
        console.log('Import settings:', {
            baseId,
            tableName,
            uploadMethod,
            filePath: this.selectedFilePath
        });
        
        // Блокування інтерфейсу
        this.uiManager.setInterfaceLocked(true);
        
        // Запуск імпорту
        await this.importManager.startImport(
            this.selectedFilePath,
            this.uiManager.apiTokenInput.value,
            baseId,
            tableName,
            uploadMethod,
            this.uiManager
        );
    }

    validateImport() {
        if (!this.uiManager.apiTokenInput.value.trim()) {
            this.uiManager.showMessage('Введіть API Token', 'error');
            return false;
        }
        
        if (!this.uiManager.baseIdSelect.value || !this.basesData[this.uiManager.baseIdSelect.value]) {
            this.uiManager.showMessage('Виберіть базу даних', 'error');
            return false;
        }
        
        if (!this.uiManager.tableNameSelect.value || !this.tablesData[this.uiManager.tableNameSelect.value]) {
            this.uiManager.showMessage('Виберіть таблицю', 'error');
            return false;
        }
        
        if (!this.selectedFilePath) {
            this.uiManager.showMessage('Виберіть ZIP файл', 'error');
            return false;
        }
        
        return true;
    }
}

module.exports = { AirtableImporter }; 