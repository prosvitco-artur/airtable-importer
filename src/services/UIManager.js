class UIManager {
    constructor() {
        this.elements = {};
    }

    initializeElements() {
        // Основні елементи
        this.elements.apiTokenInput = document.getElementById('apiToken');
        this.elements.refreshBasesBtn = document.getElementById('refreshBasesBtn');
        this.elements.baseIdSelect = document.getElementById('baseId');
        this.elements.tableNameSelect = document.getElementById('tableName');
        this.elements.uploadMethodSelect = document.getElementById('uploadMethod');
        this.elements.selectFileBtn = document.getElementById('selectFileBtn');
        this.elements.fileInput = document.getElementById('fileInput');
        this.elements.filePathLabel = document.getElementById('filePathLabel');
        this.elements.importBtn = document.getElementById('importBtn');
        this.elements.progressBar = document.getElementById('progressBar');
        this.elements.logText = document.getElementById('logText');

        // Створюємо геттери для зручності
        Object.keys(this.elements).forEach(key => {
            Object.defineProperty(this, key, {
                get: () => this.elements[key]
            });
        });
    }

    // Base management
    setBaseLoading(loading) {
        if (loading) {
            this.baseIdSelect.innerHTML = '<option value="">Завантаження баз...</option>';
            this.baseIdSelect.disabled = true;
        } else {
            this.baseIdSelect.disabled = false;
        }
    }

    resetBaseSelection() {
        this.baseIdSelect.innerHTML = '<option value="">Введіть API Token для завантаження баз</option>';
    }

    setNoBasesFound() {
        this.baseIdSelect.innerHTML = '<option value="">Бази не знайдено</option>';
    }

    addBaseOption(displayText) {
        const option = document.createElement('option');
        option.value = displayText;
        option.textContent = displayText;
        this.baseIdSelect.appendChild(option);
    }

    // Table management
    setTableLoading(loading) {
        if (loading) {
            this.tableNameSelect.innerHTML = '<option value="">Завантаження таблиць...</option>';
            this.tableNameSelect.disabled = true;
        } else {
            this.tableNameSelect.disabled = false;
        }
    }

    resetTableSelection() {
        this.tableNameSelect.innerHTML = '<option value="">Спочатку виберіть базу</option>';
    }

    setNoTablesFound() {
        this.tableNameSelect.innerHTML = '<option value="">Таблиці не знайдено</option>';
    }

    addTableOption(tableName) {
        const option = document.createElement('option');
        option.value = tableName;
        option.textContent = tableName;
        this.tableNameSelect.appendChild(option);
    }

    // File management
    setSelectedFile(filePath) {
        this.filePathLabel.textContent = filePath;
        this.importBtn.disabled = false;
    }

    // Interface locking
    setInterfaceLocked(locked) {
        const elements = [
            this.apiTokenInput,
            this.refreshBasesBtn,
            this.baseIdSelect,
            this.tableNameSelect,
            this.uploadMethodSelect,
            this.selectFileBtn,
            this.importBtn
        ];
        
        elements.forEach(el => {
            el.disabled = locked;
        });
        
        if (locked) {
            this.progressBar.classList.remove('hidden');
        } else {
            this.progressBar.classList.add('hidden');
        }
    }

    // Progress and logging
    updateProgress(message) {
        console.log('Progress:', message);
        this.logText.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${message}</div>`;
        this.logText.scrollTop = this.logText.scrollHeight;
    }

    // Message system
    showMessage(message, type = 'info') {
        console.log(`Message (${type}):`, message);
        
        // Створення повідомлення
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 max-w-sm ${
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        
        alertDiv.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <div class="ml-auto pl-3">
                    <button class="text-sm font-medium hover:opacity-75" onclick="this.parentElement.parentElement.parentElement.remove()">
                        ✕
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Автоматичне видалення через 5 секунд
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Import finished
    importFinished(success, message) {
        console.log('Import finished:', success, message);
        
        this.setInterfaceLocked(false);
        this.updateProgress(message);
        
        if (success) {
            this.showMessage(message, 'success');
        } else {
            this.showMessage(message, 'error');
        }
    }
}

module.exports = { UIManager }; 