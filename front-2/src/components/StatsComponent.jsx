import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StatsComponent.css';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];

function StatsComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    blockRate: 0,
    ruleStats: {},
    countryStats: {},
    attackTypes: {},
    timeDistribution: [],
    ruleChartData: [],
    countryChartData: [],
    attackChartData: [],
    timeChartData: []
  });

  useEffect(() => {
    fetchAndProcessLogs();
    const interval = setInterval(fetchAndProcessLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAndProcessLogs = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/logs?logGroupName=aws-waf-logs-mywaf&logStreamName=cloudfront_demo_0');
      const data = await response.json();
      
      const processedStats = processLogs(data.events);
      setStats(processedStats);
    } catch (err) {
      console.error('Failed to fetch WAF logs:', err);
      // Don't set error state, just log it
    }
  };

  const processLogs = (events) => {
    const stats = {
      totalRequests: 0,
      blocked: 0,
      ruleStats: {},
      countryStats: {},
      attackTypes: {},
      timeDistribution: {},
    };

    events.forEach(event => {
      const log = JSON.parse(event.message);
      
      // Count total requests
      stats.totalRequests++;
      
      // Count blocked requests
      if (log.action === 'BLOCK') {
        stats.blocked++;
      }

      // Count rules triggered
      if (log.terminatingRuleId) {
        stats.ruleStats[log.terminatingRuleId] = (stats.ruleStats[log.terminatingRuleId] || 0) + 1;
      }

      // Count countries
      if (log.httpRequest?.country) {
        stats.countryStats[log.httpRequest.country] = (stats.countryStats[log.httpRequest.country] || 0) + 1;
      }

      // Count attack types
      if (log.terminatingRuleMatchDetails) {
        log.terminatingRuleMatchDetails.forEach(detail => {
          if (detail.conditionType) {
            stats.attackTypes[detail.conditionType] = (stats.attackTypes[detail.conditionType] || 0) + 1;
          }
        });
      }

      // Time distribution (by hour)
      const hour = new Date(log.timestamp).getHours();
      stats.timeDistribution[hour] = (stats.timeDistribution[hour] || 0) + 1;
    });

    // Convert to percentage for block rate
    stats.blockRate = (stats.blocked / stats.totalRequests) * 100;

    // Convert objects to arrays for charts
    stats.ruleChartData = Object.entries(stats.ruleStats).map(([name, value]) => ({
      name: name.replace('AWS-AWSManagedRules', ''),
      value
    }));

    stats.countryChartData = Object.entries(stats.countryStats).map(([name, value]) => ({
      name,
      value
    }));

    stats.attackChartData = Object.entries(stats.attackTypes).map(([name, value]) => ({
      name,
      value
    }));

    stats.timeChartData = Object.entries(stats.timeDistribution).map(([hour, count]) => ({
      name: `${hour}:00`,
      requests: count
    }));

    return stats;
  };

  const handleCsvUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const lines = content.split('\n');
          
          // Verify header row format
          const headerRow = lines[0].trim();
          if (headerRow !== 'timestamp,message') {
            throw new Error('Header row must be exactly: timestamp,message');
          }

          const events = lines
            .slice(1) // Skip header
            .filter(line => line.trim())
            .map(line => {
              try {
                // Split only on first comma
                const firstCommaIndex = line.indexOf(',');
                if (firstCommaIndex === -1) return null;

                // Get the JSON part (everything after first comma)
                let jsonPart = line.slice(firstCommaIndex + 1).trim();
                
                // Remove outer quotes if present
                if (jsonPart.startsWith('"') && jsonPart.endsWith('"')) {
                  jsonPart = jsonPart.slice(1, -1);
                }
                
                // Replace double double-quotes with single double-quotes
                jsonPart = jsonPart.replace(/""/g, '"');

                // Parse the cleaned JSON
                const parsedJson = JSON.parse(jsonPart);
                
                return {
                  message: JSON.stringify(parsedJson)
                };
              } catch (error) {
                console.error('Error parsing line:', line);
                console.error('Parse error:', error);
                return null;
              }
            })
            .filter(event => event !== null);

          if (events.length === 0) {
            throw new Error('No valid entries found in file');
          }

          const processedStats = processLogs(events);
          setStats(processedStats);
        } catch (error) {
          console.error('Error processing file:', error);
          alert(
`Error: File must be in CSV format:

First line must be:
timestamp,message

Following lines must be:
1.73989E+12,"{"timestamp":1739886625135,...}"

Note: JSON in message column may be escaped with double quotes`
          );
        }
      };
      reader.readAsText(file);
    }
  }, []);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box 
      sx={{ 
        p: 3, 
        height: '100vh', 
        overflow: 'auto',
        background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/')}
          className="back-button"
        >
          Back to Home
        </button>
        
        <div>
          <input
            id="csvInput"
            type="file"
            onChange={handleCsvUpload}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => document.getElementById('csvInput').click()}
            className="back-button"
          >
            Upload WAF Logs
          </button>
        </div>

        <button 
          onClick={fetchAndProcessLogs}
          className="back-button"
        >
          Fetch Server Logs
        </button>
      </div>

      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          top: 0, 
          background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef)',
          zIndex: 1, 
          py: 2,
          color: '#1a237e',
          fontWeight: 600,
          textAlign: 'center', // Add this line
          width: '100%',      // Add this line
          mb: 4              // Add this line for better spacing
        }}
      >
        WAF Traffic Statistics
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)', color: 'white' }}>
            <CardContent>
              <Typography color="white" gutterBottom>
                Total Requests
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.totalRequests}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)', color: 'white' }}>
            <CardContent>
              <Typography color="white" gutterBottom>
                Block Rate
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {stats.blockRate.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)', borderRadius: '16px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1a237e', fontWeight: 600 }}>
                Traffic by Country
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.countryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {stats.countryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)', borderRadius: '16px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1a237e', fontWeight: 600 }}>
                Attack Types Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.attackChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#3f51b5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Add this new Grid item just before the last Grid item (Traffic Over Time) */}
        <Grid item xs={12}>
          <Card sx={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)', borderRadius: '16px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1a237e', fontWeight: 600 }}>
                Most Triggered WAF Rules
              </Typography>
              <ResponsiveContainer width="100%" height={500}>  {/* Increased height from 300 to 400 */}
                <BarChart 
                  data={stats.ruleChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }} 
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={120}      
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }}
                    formatter={(value, name) => [`Requests: ${value}`, 'Triggered']}
                  />
                  <Bar dataKey="value" fill="#9c27b0" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* The existing Traffic Over Time Grid item continues here */}
        <Grid item xs={12}>
          <Card sx={{ boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)', borderRadius: '16px' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: '#1a237e', fontWeight: 600 }}>
                Traffic Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.timeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                  <Bar dataKey="requests" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default StatsComponent;
