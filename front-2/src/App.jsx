import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WafTree from './components/WafTree';
import Home from './components/Home';
import WafTable from './components/WafTable';  // Add this import
import StatsComponent from './components/StatsComponent';

function App() {
  return (
    <Router>
      <div style={{ margin: 0, padding: 0, width: '100%', height: '100vh', overflow: 'hidden' }}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/waf-tree" element={<WafTree />} />
          <Route path="/waf-table" element={<WafTable />} />  {/* Add this route */}
          <Route path="/waf-stats" element={<StatsComponent />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
