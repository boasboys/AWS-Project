import React, { useEffect, useState } from 'react';
import '../styles/RuleDetailsPopup.css';

const RuleDetailsPopup = ({ rule, onClose, position }) => {
  const [popupStyle, setPopupStyle] = useState({});

  useEffect(() => {
    if (position) {
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get popup dimensions (approximate)
      const popupWidth = 300; // matches CSS max-width
      const popupHeight = 400; // matches CSS max-height
      
      // Calculate initial position
      let left = position.x;
      let top = position.y + 20;
      
      // Adjust if popup would overflow right
      if (left + popupWidth > viewportWidth) {
        left = viewportWidth - popupWidth - 20;
      }
      
      // Adjust if popup would overflow bottom
      if (top + popupHeight > viewportHeight) {
        top = position.y - popupHeight - 20;
      }
      
      // Ensure popup doesn't go off-screen left or top
      left = Math.max(20, left);
      top = Math.max(20, top);
      
      setPopupStyle({
        left: `${left}px`,
        top: `${top}px`
      });
    }
  }, [position]);

  if (!rule) return null;

  const getAddedLabels = () => {
    return rule.RuleLabels?.map(label => label.Name) || [];
  };

  const getDependentLabels = (statement) => {
    const labels = new Set();

    const processStatement = (stmt) => {
      if (!stmt) return;
      if (stmt.LabelMatchStatement) {
        labels.add(stmt.LabelMatchStatement.Key);
      }
      if (stmt.RateBasedStatement?.ScopeDownStatement) {
        processStatement(stmt.RateBasedStatement.ScopeDownStatement);
      }
      if (stmt.AndStatement) {
        stmt.AndStatement.Statements.forEach(processStatement);
      }
      if (stmt.OrStatement) {
        stmt.OrStatement.Statements.forEach(processStatement);
      }
      if (stmt.NotStatement) {
        processStatement(stmt.NotStatement.Statement);
      }
    };

    processStatement(statement);
    return Array.from(labels);
  };

  const getHeaders = (statement) => {
    const headers = new Set();

    const processStatement = (stmt) => {
      if (!stmt) return;
      
      // Check for ByteMatchStatement headers
      if (stmt.ByteMatchStatement?.FieldToMatch) {
        const field = stmt.ByteMatchStatement.FieldToMatch;
        if (field.SingleHeader) {
          headers.add(`Match: ${field.SingleHeader.Name}`);
        }
        if (field.Headers) {
          headers.add(`Match: ${field.Headers.MatchPattern} (${field.Headers.MatchScope})`);
        }
      }

      // Check for Count action with CustomRequestHandling headers
      if (stmt.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
        stmt.Action.Count.CustomRequestHandling.InsertHeaders.forEach(header => {
          headers.add(`Insert: ${header.Name} = ${header.Value}`);
        });
      }

      // Check for Block action with CustomResponse headers
      if (stmt.Action?.Block?.CustomResponse?.ResponseHeaders) {
        stmt.Action.Block.CustomResponse.ResponseHeaders.forEach(header => {
          headers.add(`Response: ${header.Name} = ${header.Value}`);
        });
      }

      // Check rule-level CustomRequestHandling headers
      if (rule.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
        rule.Action.Count.CustomRequestHandling.InsertHeaders.forEach(header => {
          headers.add(`Insert: ${header.Name} = ${header.Value}`);
        });
      }

      // Recursive checks
      if (stmt.RateBasedStatement?.ScopeDownStatement) {
        processStatement(stmt.RateBasedStatement.ScopeDownStatement);
      }
      if (stmt.AndStatement) {
        stmt.AndStatement.Statements.forEach(processStatement);
      }
      if (stmt.OrStatement) {
        stmt.OrStatement.Statements.forEach(processStatement);
      }
      if (stmt.NotStatement) {
        processStatement(stmt.NotStatement.Statement);
      }
    };

    processStatement(statement);
    
    // Also check rule-level headers
    if (rule.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
      rule.Action.Count.CustomRequestHandling.InsertHeaders.forEach(header => {
        headers.add(`Insert: ${header.Name} = ${header.Value}`);
      });
    }

    return Array.from(headers);
  };

  const addedLabels = getAddedLabels();
  const dependentLabels = getDependentLabels(rule.Statement);
  const headers = getHeaders(rule.Statement);

  return (
    <div className="rule-popup-overlay" onClick={onClose}>
      <div 
        className="rule-popup-content" 
        onClick={e => e.stopPropagation()}
        style={popupStyle}
      >
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="rule-header">
          <h2>{rule.Name}</h2>
          <span className={`priority-badge priority-${Math.floor(rule.Priority / 100)}`}>
            Priority: {rule.Priority}
          </span>
        </div>

        <div className="rule-action">
          <span className={`action-badge ${Object.keys(rule.Action || rule.OverrideAction || {})[0]?.toLowerCase()}`}>
            {Object.keys(rule.Action || rule.OverrideAction || {})[0] || 'No Action'}
          </span>
        </div>

        <div className="rule-sections">
          <section className="info-section">
            <h3>🏷️ Added Labels</h3>
            <div className="labels-container">
              {addedLabels.length > 0 ? (
                addedLabels.map(label => (
                  <span key={label} className="label-chip added">
                    {label}
                  </span>
                ))
              ) : (
                <p className="no-data">No labels added by this rule</p>
              )}
            </div>
          </section>

          <section className="info-section">
            <h3>🔗 Dependent Labels</h3>
            <div className="labels-container">
              {dependentLabels.length > 0 ? (
                dependentLabels.map(label => (
                  <span key={label} className="label-chip dependent">
                    {label}
                  </span>
                ))
              ) : (
                <p className="no-data">No label dependencies</p>
              )}
            </div>
          </section>

          <section className="info-section">
            <h3>📜 Headers Used</h3>
            <div className="headers-container">
              {headers.length > 0 ? (
                headers.map(header => (
                  <span key={header} className="header-chip">
                    {header}
                  </span>
                ))
              ) : (
                <p className="no-data">No headers used in this rule</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RuleDetailsPopup;
