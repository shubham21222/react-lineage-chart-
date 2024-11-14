import React from 'react';
import LineageGraph from './components/LineageGraph';
import sampleData from './assets/nifi.test.json';

function App() {
  return (
    <div className="w-full h-screen overflow-hidden">
      <div className="w-full h-full">
        <LineageGraph data={sampleData} />
      </div>
    </div>
  );
}

export default App;