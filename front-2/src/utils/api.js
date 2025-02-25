const API_BASE_URL = 'http://localhost:5000/api';

export const fetchWafRules = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/waf-acls`);
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch WAF rules:', err);
    throw err;
  }
};

export const fetchWafLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/logs?logGroupName=aws-waf-logs-mywaf&logStreamName=cloudfront_demo_0`);
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch WAF logs:', err);
    throw err;
  }
};
