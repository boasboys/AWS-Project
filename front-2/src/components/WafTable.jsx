import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/WafTable.css';

function WafTable() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'Priority', direction: 'asc' });
  const navigate = useNavigate();

  const fetchServerRules = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/waf-acls');
      const data = await response.json();
      if (data && data[0] && data[0].Rules) {
        setRules(data[0].Rules);
        setError(null);
      }
    } catch (err) {
      console.error('Server not available');
    }
  }, []);

  useEffect(() => {
    // Try to fetch from server in background
    fetchServerRules();
  }, [fetchServerRules]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          // Handle both direct Rules array or nested structure
          const rulesData = jsonData.Rules || (jsonData[0] && jsonData[0].Rules) || [];
          setRules(rulesData);
          setError(null);
        } catch (error) {
          setError('Invalid JSON file format');
          console.error('JSON parsing error:', error);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === 'asc'
          ? 'desc'
          : 'asc',
    });
  };

  const sortedRules = [...rules].sort((a, b) => {
    if (sortConfig.key === 'Priority') {
      return sortConfig.direction === 'asc'
        ? a.Priority - b.Priority
        : b.Priority - a.Priority;
    }
    if (sortConfig.key === 'Name') {
      return sortConfig.direction === 'asc'
        ? a.Name.localeCompare(b.Name)
        : b.Name.localeCompare(a.Name);
    }
    return 0;
  });

  const getActionText = (rule) => {
    if (rule.Action) return Object.keys(rule.Action)[0];
    if (rule.OverrideAction) return `Override: ${Object.keys(rule.OverrideAction)[0]}`;
    return 'None';
  };

  const findLabelDependencies = (rule) => {
    const dependencies = new Set();
    
    const checkStatementsForLabels = (statements) => {
      if (!statements) return;
      statements.forEach(stmt => {
        if (stmt.LabelMatchStatement) {
          dependencies.add(stmt.LabelMatchStatement.Key);
        } else if (stmt.AndStatement) {
          checkStatementsForLabels(stmt.AndStatement.Statements);
        } else if (stmt.OrStatement) {
          checkStatementsForLabels(stmt.OrStatement.Statements);
        } else if (stmt.NotStatement) {
          checkStatementsForLabels([stmt.NotStatement.Statement]);
        }
      });
    };

    if (rule.Statement) {
      if (Array.isArray(rule.Statement)) {
        checkStatementsForLabels(rule.Statement);
      } else {
        checkStatementsForLabels([rule.Statement]);
      }
    }

    return Array.from(dependencies);
  };

  return (
    <div className="waf-table-container">
      <div className="waf-table-header">
        <div className="waf-table-controls">
          <button onClick={() => navigate('/home')} className="back-button">
            Back to Home
          </button>
          <div>
            <button
              onClick={() => document.getElementById('tableFileInput').click()}
              className="back-button" // Using same style as back-button
            >
              Upload JSON
            </button>
            <input
              id="tableFileInput"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
          <button
            onClick={fetchServerRules}
            className="back-button"
          >
            Fetch Server Rules
          </button>
        </div>
        <h2>WAF Rules Table</h2>
        {error && <div className="waf-table-error">{error}</div>}
        {rules.length === 0 && !error && !loading && (
          <div className="waf-table-message">
            Please upload a JSON file with WAF rules
          </div>
        )}
        {loading && <div className="waf-table-loading">Loading...</div>}
      </div>

      {rules.length > 0 && (
        <div className="table-wrapper">
          <table className="waf-table">
            <thead>
              <tr>
                <th className="priority-column" onClick={() => handleSort('Priority')}>
                  Priority
                  {sortConfig.key === 'Priority' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th className="name-column" onClick={() => handleSort('Name')}>
                  Name
                  {sortConfig.key === 'Name' && (
                    <span>{sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th className="action-column">Action</th>
                <th className="labels-column">Adds Labels</th>
                <th className="depends-column">Depends on Labels</th>
                <th className="statement-column">Statement Type</th>
              </tr>
            </thead>
            <tbody>
              {sortedRules.map((rule) => (
                <tr key={rule.Name} className={`action-${getActionText(rule).toLowerCase()}`}>
                  <td className="priority-column">{rule.Priority}</td>
                  <td className="name-column">{rule.Name}</td>
                  <td className="action-column">{getActionText(rule)}</td>
                  <td className="labels-column">
                    {rule.RuleLabels
                      ? rule.RuleLabels.map((label) => label.Name).join(', ')
                      : '-'}
                  </td>
                  <td className="depends-column">
                    {findLabelDependencies(rule).length > 0
                      ? findLabelDependencies(rule).join(', ')
                      : '-'}
                  </td>
                  <td className="statement-column">
                    {rule.Statement
                      ? Object.keys(rule.Statement)[0].replace('Statement', '')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default WafTable;
