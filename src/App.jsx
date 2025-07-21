import React from 'react';
import { AirtableImporter } from './components/AirtableImporter';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <AirtableImporter />
      </div>
    </div>
  );
}

export default App; 