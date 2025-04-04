import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CssBaseline } from '@mui/material';
import HomePage from './pages/HomePage';
import ExplorerPage from './pages/ExplorerPage';
import AboutPage from './pages/AboutPage';

export default function App() {
  
  return (
    <ThemeProvider>
      <CssBaseline />
      <div style={{ 
        height: '100vh', 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app" element={<ExplorerPage />} />
          <Route path="/about" element={<AboutPage/>} /> 
        </Routes>
      </div>
    </ThemeProvider>
  );
}