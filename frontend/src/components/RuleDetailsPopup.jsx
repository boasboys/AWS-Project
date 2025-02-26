import React, { useEffect, useState } from 'react';
import './RuleDetailsPopup.css';

const RuleDetailsPopup = ({ rule, validationErrors, onClose, position }) => {
  const [popupStyle, setPopupStyle] = useState({});
  const [viewMode, setViewMode] = useState("details");
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  console.log("RuleDetailsPopup props:", { rule, validationErrors, position });

  useEffect(() => {
    if (position) {
      // Offset to make the popup appear next to the node
      const offsetX = 20;
      const offsetY = 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = 300;
      const popupHeight = 400;
      let left = position.x + offsetX;
      let top = position.y + offsetY;
      if (left + popupWidth > viewportWidth) left = viewportWidth - popupWidth - 20;
      if (top + popupHeight > viewportHeight) top = viewportHeight - popupHeight - 20;
      left = Math.max(20, left);
      top = Math.max(20, top);
      setPopupStyle({ left: `${left}px`, top: `${top}px` });
      console.log("Popup style set:", { left, top });
    }
  }, [position]);

  // Draggable handlers
  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPopupStyle(prev => {
      const currentLeft = parseFloat(prev.left);
      const currentTop = parseFloat(prev.top);
      return { left: `${currentLeft + dx}px`, top: `${currentTop + dy}px` };
    });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, dragStart]);

  if (!rule) return null;

  const formatIssue = (issue) => {
    if (typeof issue === 'string') return issue;
    try {
      return JSON.stringify(issue);
    } catch (e) {
      return String(issue);
    }
  };

  const warningsFromIssues = Array.isArray(rule.issues)
    ? rule.issues.map(issue => formatIssue(issue))
    : [];
  const warningsFromValidation = validationErrors && validationErrors.length > 0
    ? validationErrors.map(err => `${err.type}: ${err.message}`)
    : [];
  const warnings = warningsFromIssues.concat(warningsFromValidation);
  console.log("Combined warnings:", warnings);

  const getAddedLabels = () => {
    const labels = rule.RuleLabels?.map(label => label.Name) || [];
    console.log("Added labels:", labels);
    return labels;
  };

  const getDependentLabels = (statement) => {
    const labels = new Set();
    const processStatement = (stmt) => {
      if (!stmt) return;
      if (stmt.LabelMatchStatement) labels.add(stmt.LabelMatchStatement.Key);
      if (stmt.RateBasedStatement?.ScopeDownStatement)
        processStatement(stmt.RateBasedStatement.ScopeDownStatement);
      if (stmt.AndStatement) stmt.AndStatement.Statements.forEach(processStatement);
      if (stmt.OrStatement) stmt.OrStatement.Statements.forEach(processStatement);
      if (stmt.NotStatement) processStatement(stmt.NotStatement.Statement);
    };
    processStatement(statement);
    const depLabels = Array.from(labels);
    console.log("Dependent labels:", depLabels);
    return depLabels;
  };

  const getHeaders = (statement) => {
    const headers = new Set();
    const processStatement = (stmt) => {
      if (!stmt) return;
      if (stmt.ByteMatchStatement?.FieldToMatch) {
        const field = stmt.ByteMatchStatement.FieldToMatch;
        if (field.SingleHeader)
          headers.add(`Match: ${field.SingleHeader.Name}`);
        if (field.Headers)
          headers.add(`Match: ${field.Headers.MatchPattern} (${field.Headers.MatchScope})`);
      }
      if (stmt.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
        stmt.Action.Count.CustomRequestHandling.InsertHeaders.forEach(header => {
          headers.add(`Insert: ${header.Name} = ${header.Value}`);
        });
      }
      if (stmt.Action?.Block?.CustomResponse?.ResponseHeaders) {
        stmt.Action.Block.CustomResponse.ResponseHeaders.forEach(header => {
          headers.add(`Response: ${header.Name} = ${header.Value}`);
        });
      }
      if (stmt.RateBasedStatement?.ScopeDownStatement)
        processStatement(stmt.RateBasedStatement.ScopeDownStatement);
      if (stmt.AndStatement) stmt.AndStatement.Statements.forEach(processStatement);
      if (stmt.OrStatement) stmt.OrStatement.Statements.forEach(processStatement);
      if (stmt.NotStatement) processStatement(stmt.NotStatement.Statement);
    };
    processStatement(statement);
    if (rule.Action?.Count?.CustomRequestHandling?.InsertHeaders) {
      rule.Action.Count.CustomRequestHandling.InsertHeaders.forEach(header => {
        headers.add(`Insert: ${header.Name} = ${header.Value}`);
      });
    }
    const headerArr = Array.from(headers);
    console.log("Headers used:", headerArr);
    return headerArr;
  };

  const addedLabels = getAddedLabels();
  const dependentLabels = getDependentLabels(rule.Statement);
  const headers = getHeaders(rule.Statement);

  return (
    <div className="rule-popup-overlay" onClick={onClose}>
      <div 
        className="rule-popup-content" 
        onClick={e => e.stopPropagation()}
        style={{ ...popupStyle, maxHeight: '400px', overflowY: 'auto' }}
        onMouseDown={handleMouseDown}
      >
        <button className="close-button" onClick={onClose}>×</button>
        
        {/* Sticky toggle buttons */}
        <div
          className="popup-menu"
          style={{ position: 'sticky', top: 0, zIndex: 10, background: 'inherit', padding: '8px 0' }}
        >
          <button 
            className={viewMode === "details" ? "active" : ""}
            onClick={() => {
              console.log("Switched to details view");
              setViewMode("details");
            }}
          >
            Details
          </button>
          <button 
            className={viewMode === "json" ? "active" : ""}
            onClick={() => {
              console.log("Switched to JSON view");
              setViewMode("json");
            }}
          >
            JSON
          </button>
        </div>

        {viewMode === "details" ? (
          <>
            <div className="rule-header">
              <h2>{rule.Name}</h2>
              <span className="priority-badge priority-red">
                Priority: {rule.Priority}
              </span>
              
            </div>

            <div className="rule-action">
              <span className={`action-badge ${Object.keys(rule.Action || rule.OverrideAction || {})[0]?.toLowerCase()}`}>
                {Object.keys(rule.Action || rule.OverrideAction || {})[0] || 'No Action'}
              </span>
            </div>

            {warnings.length > 0 && (
              <section className="info-section">
                <h3>⚠️ Warnings</h3>
                <div className="warnings-container">
                  <ul>
                    {warnings.map((issue, idx) => {
                      console.log(`Warning ${idx}:`, issue);
                      return (
                        <li key={idx} className="warning-item">{issue}</li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}

            <div className="rule-sections">
              <section className="info-section">
                <h3>🏷️ Added Labels</h3>
                <div className="labels-container">
                  {addedLabels.length > 0 ? (
                    addedLabels.map(label => (
                      <span key={label} className="label-chip added">{label}</span>
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
                      <span key={label} className="label-chip dependent">{label}</span>
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
                      <span key={header} className="header-chip">{header}</span>
                    ))
                  ) : (
                    <p className="no-data">No headers used in this rule</p>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <div className="json-view">
            <pre>{JSON.stringify(rule, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleDetailsPopup;