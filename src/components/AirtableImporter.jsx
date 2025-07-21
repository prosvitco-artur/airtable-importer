import React, { useState, useRef } from 'react';
import { AirtableAPI } from '../services/AirtableAPI';
import { FileManager } from '../services/FileManager';
import { ImportManager } from '../services/ImportManager';

export function AirtableImporter() {
  const [apiToken, setApiToken] = useState('');
  const [baseId, setBaseId] = useState('');
  const [tableName, setTableName] = useState('');
  const [uploadMethod, setUploadMethod] = useState('airtable');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [logs, setLogs] = useState(['Готово до імпорту...']);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const fileInputRef = useRef();
  const airtableAPI = new AirtableAPI();
  const fileManager = new FileManager();
  const importManager = new ImportManager();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      addLog(`Файл вибрано: ${file.name}`, 'success');
    }
  };

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const updateProgress = (text) => {
    setProgress(text);
    addLog(text);
  };

  const importFinished = (success, message) => {
    setIsImporting(false);
    setProgress('');
    if (success) {
      addLog(`✅ ${message}`, 'success');
      showMessage(message, 'success');
    } else {
      addLog(`❌ ${message}`, 'error');
      showMessage(message, 'error');
    }
  };

  const handleImport = async () => {
    if (!apiToken || !baseId || !tableName || !selectedFile) {
      showMessage('Будь ласка, заповніть всі поля та виберіть файл', 'error');
      return;
    }

    setIsImporting(true);
    setProgress('Починаю імпорт...');
    addLog('Починаю імпорт...');

    try {
      await importManager.startImport(
        selectedFile.path,
        apiToken,
        baseId,
        tableName,
        uploadMethod,
        { updateProgress, importFinished, addLog }
      );
    } catch (error) {
      console.error('Import error:', error);
      importFinished(false, `Помилка імпорту: ${error.message}`);
    }
  };

  const handleRefreshBases = async () => {
    if (!apiToken) {
      showMessage('Спочатку введіть API Token', 'error');
      return;
    }

    try {
      const bases = await airtableAPI.getBases(apiToken);
      if (bases.length === 0) {
        showMessage('API Token валідний. Тепер введіть Base ID та Table Name вручну.', 'info');
      } else {
        showMessage(`Знайдено ${bases.length} баз. Введіть Base ID та Table Name.`, 'success');
      }
    } catch (error) {
      showMessage(`Помилка: ${error.message}`, 'error');
    }
  };

  const isImportDisabled = !apiToken || !baseId || !tableName || !selectedFile || isImporting;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Airtable Importer</h1>
        <p className="text-gray-600">Імпорт даних з ZIP файлів в Airtable</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Settings */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Налаштування</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Token
            </label>
            <div className="flex">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Введіть ваш Airtable API Token"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleRefreshBases}
                disabled={!apiToken}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-l-0 border-gray-300 rounded-r-md transition duration-200 disabled:opacity-50"
                title="Перевірити API Token"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Base ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base ID
            </label>
            <input
              type="text"
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
              placeholder="Введіть Base ID (наприклад: appXXXXXXXXXXXXXX)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Base ID можна знайти в URL Airtable: https://airtable.com/appXXXXXXXXXXXXXX/...
            </p>
          </div>

          {/* Table Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table Name
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Введіть назву таблиці"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Назва таблиці в Airtable (наприклад: "Нерухомість", "Properties")
            </p>
          </div>

          {/* Upload Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Method
            </label>
            <select
              value={uploadMethod}
              onChange={(e) => setUploadMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="airtable">airtable</option>
              <option value="local">local</option>
              <option value="temp">temp</option>
            </select>
          </div>
        </div>
      </div>

      {/* File Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Файли</h2>
        <div className="space-y-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Вибрати ZIP файл
          </button>
          <div className="text-gray-600">
            {selectedFile ? `Вибрано: ${selectedFile.name}` : 'Файл не вибрано'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Import Button */}
      <div className="mb-6">
        <button
          onClick={handleImport}
          disabled={isImportDisabled}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isImporting ? 'Імпортується...' : 'Почати імпорт'}
        </button>
      </div>

      {/* Progress Bar */}
      {isImporting && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
          </div>
          {progress && (
            <p className="text-sm text-gray-600 mt-2">{progress}</p>
          )}
        </div>
      )}

      {/* Logs */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Лог</h2>
        <div className="bg-gray-50 rounded-md p-4 h-48 overflow-y-auto font-mono text-sm text-gray-800">
          {logs.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 