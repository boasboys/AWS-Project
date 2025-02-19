import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer 
} from 'recharts';
import { 
  Paper, 
  Typography, 
  Box,
  CircularProgress,
  Grid
} from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const WafStatistics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    allowed: 0,
    blocked: 0,
    blockReasons: {}
  });

  useEffect(() => {
    fetchAndProcessLogs();
  }, []);

  const fetchAndProcessLogs = async () => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/logs?logGroupName=aws-waf-logs-mywaf&logStreamName=cloudfront_demo_0'
      );
      const data = await response.json();

      processLogs(data.events);
    } catch (err) {
      setError('Failed to fetch WAF logs');
      setLoading(false);
    }
  };

  const processLogs = (events) => {
    const stats = events.reduce((acc, event) => {
      const logData = JSON.parse(event.message);
      
      // Count total requests
      acc.total++;

      // Count allowed vs blocked
      if (logData.action === 'ALLOW') {
        acc.allowed++;
      } else if (logData.action === 'BLOCK') {
        acc.blocked++;
        
        // Count block reasons
        const reason = logData.terminatingRuleId;
        acc.blockReasons[reason] = (acc.blockReasons[reason] || 0) + 1;
      }

      return acc;
    }, { total: 0, allowed: 0, blocked: 0, blockReasons: {} });

    setStats(stats);
    setLoading(false);
  };

  const prepareBlockReasonData = () => {
    return Object.entries(stats.blockReasons).map(([reason, count]) => ({
      name: reason,
      value: count
    }));
  };

  const calculatePercentage = (value) => {
    return ((value / stats.total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom align="center">
        WAF Traffic Analysis
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom align="center">
            Traffic Distribution
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Allowed', value: stats.allowed },
                  { name: 'Blocked', value: stats.blocked }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#00C49F" />
                <Cell fill="#FF8042" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom align="center">
            Block Reasons
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={prepareBlockReasonData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#FF8042" name="Blocked Requests" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>

        <Grid item xs={12}>
          <Box textAlign="center" mt={2}>
            <Typography variant="body1">
              Total Requests: {stats.total} | 
              Allowed: {stats.allowed} ({calculatePercentage(stats.allowed)}%) | 
              Blocked: {stats.blocked} ({calculatePercentage(stats.blocked)}%)
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default WafStatistics;
