import React from 'react';
import './style/RuleDetailsPopup.css';
import AnalyzedInfoSection from '../../data/AnalyzedInfoSection';
import { useThemeContext } from '../../context/ThemeContext';

const RuleDetailsPopup = ({ rule, dataArray, centerNode }) => {
  const { getColor } = useThemeContext();

  return (
    <div className="rule-popup-content" style={{ backgroundColor: getColor('background'), }}>
      <div className="rule-header">
        <h2 style={{ color: getColor('barText') }} >{rule.name}</h2>
      </div>

      <div className="rule-action">
        <span className={`action-badge ${rule.action.toLowerCase()}`}>
          {rule.action || 'No Action'}
        </span>
        <span className="priority-badge priority-red">
          Priority: {rule.priority}
        </span>
      </div>

      <AnalyzedInfoSection dataArray={dataArray} rule={rule.id} />

      {rule.warnings.length > 0 && (
        <section className="info-section warnings-section" style={{ backgroundColor: getColor('barBackground') }}>
          <h3 style={{ color: getColor('barText') }}>⚠️ Rule Warnings</h3>
          <div className="warnings-container">
            <ul>
              {rule.warnings.map((issue, idx) => (
                <li key={idx} className="warning-item">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="info-section" style={{ backgroundColor: getColor('barBackground') }}>
        <h3 style={{ color: getColor('barText') }}>🔗 Dependant on rules</h3>
        <div className="labels-container">
          {rule.labelState.length > 0 ? (
            rule.labelState.map(([logic, label, rules], i) => (
              <div key={i} className="logic-container" style={{ color: getColor('barText'), marginBottom: '5px' }}>
                {logic === '!' && i > 0 && rule.labelState[i - 1][0] && (
                  <span style={{ color: '#ff9800' }}>{rule.labelState[i - 1][0]} </span>
                )}
                {logic && <span style={{ color: '#ff9800' }}>{logic} </span>}
                <span>{label}</span> <br />
                <small key={i} className="rule-reference">
                  {rules.length > 0 ?
                    rules.map((rule, i) => <><span key={i} onClick={() => centerNode(rule.id)}> → {rule.name}</span><br /></>) :
                    <span onClick={() => document.querySelector('.warnings-section').scrollIntoView({ behavior: 'smooth' })}> → ⚠️</span>}
                </small>
                <br />
              </div>
            ))
          ) : (
            <p className="no-data">No label dependencies</p>
          )}
        </div>
      </section>

      <div className="rule-sections">
        <section className="info-section" style={{ backgroundColor: getColor('barBackground') }}>
          <h3 style={{ color: getColor('barText') }}>🏷️ Added Labels</h3>
          <div className="labels-container">
            {rule.ruleLabels.length > 0 ? (
              rule.ruleLabels.map(label => (
                <span key={label} className="label-chip added">{label}</span>
              ))
            ) : (
              <p className="no-data">No labels added by this rule</p>
            )}
          </div>
        </section>

        <section className="info-section" style={{ backgroundColor: getColor('barBackground') }}>
          <h3 style={{ color: getColor('barText') }}>📜 Insert Headers </h3>
          <div className="headers-container">
            {rule.insertHeaders.length > 0 ? (
              rule.insertHeaders.map(header => (
                <span key={header.name} className="header-chip">{header.name}={header.value}</span>
              ))
            ) : (
              <p className="no-data">No headers used in this rule</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RuleDetailsPopup;