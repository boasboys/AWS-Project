import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import WafTreeDagreDetailed from "./components/WafTreeDagreDetailed";
import WafTreeIfElseDetailed from "./components/WafTreeIfElseDetailed";
import WafTree from "./components/WafTree";
import NavigationMenu from "./components/NavigationMenu";
import StatsPage from "./pages/StatsPage";
import { Container } from '@mui/material';
import WafLogTree from "./components/WafLogTree";

export default function App() {
  const [selectedView, setSelectedView] = useState('dagre');

  return (
    <BrowserRouter>
      <Container>
        <NavigationMenu selectedView={selectedView} setSelectedView={setSelectedView} />
        
        <Routes>
          <Route path="/statistics" element={<StatsPage />} />
          <Route path="/" element={
            <>
              {selectedView === 'dagre' && <WafTreeDagreDetailed />}
              {selectedView === 'ifelse' && <WafTreeIfElseDetailed />}
              {selectedView === 'simple' && <WafTree />}
            </>
          } />
          <Route path="/waf-logs" element={<WafLogTree />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
