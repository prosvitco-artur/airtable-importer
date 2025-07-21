const fs = require('fs');
const path = require('path');

class SettingsManager {
    constructor() {
        this.settingsPath = path.join(__dirname, '../../settings.json');
    }

    saveSettings(uiManager) {
        console.log('SettingsManager: Saving settings');
        
        const settings = {
            apiToken: uiManager.apiTokenInput.value,
            baseId: uiManager.baseIdSelect.value,
            tableName: uiManager.tableNameSelect.value,
            uploadMethod: uiManager.uploadMethodSelect.value,
            lastSaved: new Date().toISOString()
        };
        
        try {
            fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
            console.log('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            throw new Error('Помилка збереження налаштувань');
        }
    }

    loadSettings(uiManager) {
        console.log('SettingsManager: Loading settings');
        
        try {
            if (fs.existsSync(this.settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
                
                // Встановлення значень в UI
                if (settings.apiToken) {
                    uiManager.apiTokenInput.value = settings.apiToken;
                }
                
                if (settings.uploadMethod) {
                    uiManager.uploadMethodSelect.value = settings.uploadMethod;
                }
                
                console.log('Settings loaded successfully');
                return settings;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        
        return null;
    }

    getSetting(key) {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
                return settings[key];
            }
        } catch (error) {
            console.error('Error getting setting:', error);
        }
        
        return null;
    }

    setSetting(key, value) {
        try {
            let settings = {};
            
            if (fs.existsSync(this.settingsPath)) {
                settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            }
            
            settings[key] = value;
            settings.lastModified = new Date().toISOString();
            
            fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
            console.log(`Setting '${key}' updated`);
        } catch (error) {
            console.error('Error setting setting:', error);
            throw new Error(`Помилка встановлення налаштування: ${key}`);
        }
    }

    clearSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                fs.unlinkSync(this.settingsPath);
                console.log('Settings cleared');
            }
        } catch (error) {
            console.error('Error clearing settings:', error);
        }
    }

    exportSettings(exportPath) {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const settings = fs.readFileSync(this.settingsPath, 'utf8');
                fs.writeFileSync(exportPath, settings);
                console.log('Settings exported to:', exportPath);
            }
        } catch (error) {
            console.error('Error exporting settings:', error);
            throw new Error('Помилка експорту налаштувань');
        }
    }

    importSettings(importPath) {
        try {
            if (fs.existsSync(importPath)) {
                const settings = fs.readFileSync(importPath, 'utf8');
                fs.writeFileSync(this.settingsPath, settings);
                console.log('Settings imported from:', importPath);
            }
        } catch (error) {
            console.error('Error importing settings:', error);
            throw new Error('Помилка імпорту налаштувань');
        }
    }
}

module.exports = { SettingsManager }; 