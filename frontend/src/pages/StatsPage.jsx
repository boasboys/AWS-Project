import React from 'react';
import { useNavigate } from 'react-router-dom';
import WafStatistics from '../components/WafStatistics';
import { Button, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const StatsPage = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Box mb={2}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Back to Visualization
        </Button>
      </Box>
      <WafStatistics />
    </Box>
  );
};

export default StatsPage;
