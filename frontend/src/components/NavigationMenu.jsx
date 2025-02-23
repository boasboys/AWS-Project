import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ButtonGroup, Button, Paper, Box } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ForestIcon from '@mui/icons-material/Forest';  // Add this import

const NavigationMenu = ({ selectedView, setSelectedView }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isStatsPage = location.pathname === '/statistics';
  const isLogTreePage = location.pathname === '/waf-logs';

  return (
    <Box display="flex" justifyContent="center" width="100%" flexDirection="column" alignItems="center">
      {!isStatsPage && !isLogTreePage && (
        <Paper 
          elevation={1} 
          sx={{ 
            padding: 2, 
            marginBottom: 2,
            display: 'inline-flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <ButtonGroup 
            variant="contained" 
            aria-label="view selection button group"
            sx={{ 
              '& .MuiButton-root': {
                minWidth: '160px',
                padding: '10px 20px'
              }
            }}
          >
            <Button 
              onClick={() => setSelectedView('dagre')}
              variant={selectedView === 'dagre' ? 'contained' : 'outlined'}
            >
              Dagre Detailed View
            </Button>
            <Button 
              onClick={() => setSelectedView('ifelse')}
              variant={selectedView === 'ifelse' ? 'contained' : 'outlined'}
            >
              If-Else Detailed View
            </Button>
            <Button 
              onClick={() => setSelectedView('simple')}
              variant={selectedView === 'simple' ? 'contained' : 'outlined'}
            >
              Simple Tree View
            </Button>
          </ButtonGroup>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AssessmentIcon />}
              onClick={() => navigate('/statistics')}
            >
              View Statistics
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<ForestIcon />}
              onClick={() => navigate('/waf-logs')}
            >
              WAF Log Tree
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default NavigationMenu;
