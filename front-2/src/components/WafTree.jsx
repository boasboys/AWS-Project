import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  BaseEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useNavigate } from 'react-router-dom';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import jsPDF from 'jspdf';
import '../styles/WafTree.css';
import { fetchWafRules } from '../utils/api';
import RuleDetailsPopup from './RuleDetailsPopup';

// ---------------------------
// Custom Node Component
// ---------------------------
const CustomNode = ({ id, data, selected, dragging, style }) => {
  return (
    <div className="custom-node" style={style}>
      {data.issues && data.issues.length > 0 && (
        <div className="node-warning-icon" title="This rule has issues">⚠️</div>
      )}
      <pre className="node-label">{data.label}</pre>
    </div>
  );
};

// ---------------------------
// Custom Edge Component
// ---------------------------
const CustomEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data
}) => {
  const xOffset = Math.abs(targetX - sourceX) * 0.4; // Dynamic offset based on distance
  const isTargetLeft = targetX < sourceX;

  // Create curved path using quadratic curves
  const path = `M ${sourceX} ${sourceY}
                Q ${sourceX + (isTargetLeft ? -xOffset : xOffset)} ${sourceY},
                  ${sourceX + (isTargetLeft ? -xOffset : xOffset)} ${(sourceY + targetY) / 2}
                Q ${sourceX + (isTargetLeft ? -xOffset : xOffset)} ${targetY},
                  ${targetX} ${targetY}`;

  const isHighlighted = data?.isHighlighted;

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth: isHighlighted ? 4 : 2,
        stroke: isHighlighted ? '#ff3d00' : style.stroke,
        transition: 'all 0.3s ease-in-out',
        opacity: isHighlighted ? 1 : 0.5,
      }}
    />
  );
};

// ---------------------------
// Layout & Helper Functions
// ---------------------------
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 350;  // Increased width for more content
const nodeHeight = 150; // Increased height for more content

// Format rule information for node labels
const formatRuleInfo = (rule, dependencies = []) => {
  const parts = [
    `${rule.Name}`,
    `Priority: ${rule.Priority}`,
    `Action: ${rule.Action ? Object.keys(rule.Action)[0] :
      rule.OverrideAction ? Object.keys(rule.OverrideAction)[0] : 'None'}`
  ];

  if (rule.RuleLabels?.length > 0) {
    parts.push(`Adds Labels: ${rule.RuleLabels.map(l => l.Name).join(', ')}`);
  }

  if (dependencies.length > 0) {
    parts.push(`Depends on: ${dependencies.join(', ')}`);
  }

  return parts.join('\n');
};

// Recursively extract label dependencies from rule statements
const checkStatementsForLabels = (statement) => {
  const dependencies = new Set();

  const processStatement = (stmt) => {
    if (!stmt) return;
    if (stmt.LabelMatchStatement) {
      dependencies.add(stmt.LabelMatchStatement.Key);
    }
    if (stmt.RateBasedStatement && stmt.RateBasedStatement.ScopeDownStatement) {
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
  return dependencies;
};

// ---------------------------
// Rule Validation Function
// ---------------------------
const validateRule = (rule, labelMap, allRules, ruleDependencies) => {
  const issues = [];
  const usedLabels = checkStatementsForLabels(rule.Statement);

  // Issue 1: Self dependency – rule depends on a label it creates
  if (rule.RuleLabels) {
    rule.RuleLabels.forEach(label => {
      if (usedLabels.has(label.Name)) {
        issues.push(`Rule depends on the label it creates: "${label.Name}".`);
      }
    });
  }

  // Issue 2: Non-existent dependency – rule depends on a label that no rule provides
  usedLabels.forEach(label => {
    if (!labelMap.has(label)) {
      issues.push(`Depends on non-existent label: "${label}".`);
    }
  });

  // Determine if the rule is a blocking rule
  const isBlock = (rule.Action && Object.keys(rule.Action)[0] === 'Block') ||
                  (rule.OverrideAction && Object.keys(rule.OverrideAction)[0] === 'Block');

  // NEW ISSUE: Flag all blocking rules as problematic.
  if (isBlock) {
    issues.push("Blocking rule detected. Blocking rules can lead to unintended side effects.");
  }

  // Issue 3: Blocking rule providing labels used by other rules
  if (isBlock && rule.RuleLabels) {
    rule.RuleLabels.forEach(label => {
      allRules.forEach(otherRule => {
        if (otherRule.Name === rule.Name) return;
        const otherUsedLabels = checkStatementsForLabels(otherRule.Statement);
        if (otherUsedLabels.has(label.Name)) {
          issues.push(`Blocking rule provides label "${label.Name}" which is used by rule "${otherRule.Name}".`);
        }
      });
    });
  }

  // Issue 4: Circular dependency detection using DFS on ruleDependencies
  let hasCycle = false;
  const visited = new Set();
  const stack = new Set();

  const dfs = (ruleName) => {
    if (stack.has(ruleName)) {
      if (ruleName === rule.Name) {
        hasCycle = true;
      }
      return;
    }
    if (visited.has(ruleName)) return;
    visited.add(ruleName);
    stack.add(ruleName);
    const deps = ruleDependencies.get(ruleName) || [];
    deps.forEach(depRuleName => {
      dfs(depRuleName);
    });
    stack.delete(ruleName);
  };
  dfs(rule.Name);
  if (hasCycle) {
    issues.push('Circular dependency detected.');
  }

  return issues;
};

// Calculate dependency levels for layout purposes
const calculateDependencyLevels = (rules, labelMap) => {
  const levels = new Map();
  const dependenciesMap = new Map();
  const processed = new Set();
  const visiting = new Set();

  const getDependencyLevel = (rule, path = new Set()) => {
    if (processed.has(rule.Name)) {
      return levels.get(rule.Name);
    }
    if (visiting.has(rule.Name)) {
      return 0; // Break circular dependencies
    }
    visiting.add(rule.Name);
    let maxDependencyLevel = 0;
    const dependencies = new Set();

    // Get direct dependencies from statements
    const labels = checkStatementsForLabels(rule.Statement);
    labels.forEach(depLabel => dependencies.add(depLabel));

    // Store dependencies for the rule
    dependenciesMap.set(rule.Name, Array.from(dependencies));

    // Process each dependency – skip if provided by the same rule
    dependencies.forEach(depLabel => {
      const sourceRules = labelMap.get(depLabel) || [];
      sourceRules.forEach(sourceRule => {
        if (sourceRule === rule.Name) return;
        if (!path.has(sourceRule)) {
          const sourceRuleObj = rules.find(r => r.Name === sourceRule);
          if (sourceRuleObj) {
            const newPath = new Set(path);
            newPath.add(rule.Name);
            const level = getDependencyLevel(sourceRuleObj, newPath);
            maxDependencyLevel = Math.max(maxDependencyLevel, level + 1);
          }
        }
      });
    });

    levels.set(rule.Name, dependencies.size === 0 ? 0 : maxDependencyLevel);
    processed.add(rule.Name);
    visiting.delete(rule.Name);
    return levels.get(rule.Name);
  };

  rules.forEach(rule => {
    if (!processed.has(rule.Name)) {
      getDependencyLevel(rule, new Set());
    }
  });

  return { levels, dependenciesMap };
};

// Utility to calculate text height for node sizing
const calculateTextHeight = (text, width, fontSize = 14, padding = 15) => {
  const temp = document.createElement('div');
  temp.style.width = `${width - (padding * 2)}px`;
  temp.style.fontSize = `${fontSize}px`;
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  temp.style.whiteSpace = 'pre-wrap';
  temp.innerHTML = text;
  document.body.appendChild(temp);
  const height = temp.offsetHeight;
  document.body.removeChild(temp);
  return height + (padding * 2) + 10;
};

const getUsedLabels = (rules) => {
  const usedLabels = new Set();
  rules.forEach(rule => {
    const checkStatementsForLabels = (statements) => {
      if (!statements) return;
      statements.forEach(stmt => {
        if (stmt.LabelMatchStatement) {
          usedLabels.add(stmt.LabelMatchStatement.Key);
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
      if (rule.Statement.AndStatement)
        checkStatementsForLabels(rule.Statement.AndStatement.Statements);
      else if (rule.Statement.OrStatement)
        checkStatementsForLabels(rule.Statement.OrStatement.Statements);
      else if (rule.Statement.NotStatement)
        checkStatementsForLabels([rule.Statement.NotStatement.Statement]);
      else checkStatementsForLabels([rule.Statement]);
    }
  });
  return usedLabels;
};

const isIndependentRule = (rule, usedLabels) => {
  if (rule.RuleLabels && rule.RuleLabels.length > 0) {
    const addsUnusedLabelsOnly = rule.RuleLabels.every(label => !usedLabels.has(label.Name));
    if (!addsUnusedLabelsOnly) {
      return false;
    }
  }
  const hasLabelDependency = (statements) => {
    if (!statements) return false;
    return statements.some(stmt => {
      if (stmt.LabelMatchStatement) return true;
      if (stmt.AndStatement) return hasLabelDependency(stmt.AndStatement.Statements);
      if (stmt.OrStatement) return hasLabelDependency(stmt.OrStatement.Statements);
      if (stmt.NotStatement) return hasLabelDependency([stmt.NotStatement.Statement]);
      return false;
    });
  };
  if (rule.Statement) {
    if (rule.Statement.AndStatement)
      return !hasLabelDependency(rule.Statement.AndStatement.Statements);
    if (rule.Statement.OrStatement)
      return !hasLabelDependency(rule.Statement.OrStatement.Statements);
    if (rule.Statement.NotStatement)
      return !hasLabelDependency([rule.Statement.NotStatement.Statement]);
    return !hasLabelDependency([rule.Statement]);
  }
  return true;
};

// ---------------------------
// Process & Layout WAF Rules
// ---------------------------
const processWafRules = (data) => {
  const rules = data[0].Rules;
  const nodes = [];
  const edges = [];
  const labelMap = new Map();
  const labelProviders = new Map();
  const ruleDependencies = new Map();

  // First pass: Build label map and providers.
  rules.forEach((rule) => {
    if (rule.RuleLabels) {
      rule.RuleLabels.forEach(label => {
        if (!labelMap.has(label.Name)) {
          labelMap.set(label.Name, []);
        }
        labelMap.get(label.Name).push(rule.Name);
        labelProviders.set(label.Name, rule.Name);
      });
    }
  });

  // Second pass: Build direct rule dependencies.
  rules.forEach((rule) => {
    const dependencies = new Set();
    const processStatement = (stmt) => {
      if (!stmt) return;
      if (stmt.LabelMatchStatement) {
        const labelProvider = labelProviders.get(stmt.LabelMatchStatement.Key);
        if (labelProvider && labelProvider !== rule.Name) {
          dependencies.add(labelProvider);
        }
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
    processStatement(rule.Statement);
    ruleDependencies.set(rule.Name, Array.from(dependencies));
  });

  // Calculate levels for layout
  const { levels } = calculateDependencyLevels(rules, labelMap);

  // Group rules by level
  const nodesByLevel = new Map();
  rules.forEach(rule => {
    const level = levels.get(rule.Name);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level).push(rule);
  });

  // Validate each rule and store issues
  const ruleIssuesMap = new Map();
  rules.forEach(rule => {
    const issues = validateRule(rule, labelMap, rules, ruleDependencies);
    ruleIssuesMap.set(rule.Name, issues);
  });

  // Layout the nodes
  const levelHeight = 200;
  const horizontalGap = 50;
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((level) => {
    const levelRules = nodesByLevel.get(level);
    const y = (level + 1) * levelHeight; // shift down a bit
    const totalWidth = levelRules.length * (nodeWidth + horizontalGap);
    const startX = (window.innerWidth - totalWidth) / 2;

    levelRules.forEach((rule, index) => {
      const x = startX + index * (nodeWidth + horizontalGap);
      const dependencies = checkStatementsForLabels(rule.Statement);
      const action = rule.Action ? Object.keys(rule.Action)[0] :
                     rule.OverrideAction ? Object.keys(rule.OverrideAction)[0] : 'None';
      const label = formatRuleInfo(rule, Array.from(dependencies));
      const calculatedHeight = calculateTextHeight(label, nodeWidth);
      const finalHeight = Math.max(nodeHeight, calculatedHeight);
      const issues = ruleIssuesMap.get(rule.Name) || [];
      const baseStyle = getNodeStyle(action);
      let nodeStyle = {
        ...baseStyle,
        padding: 15,
        borderRadius: 10,
        width: nodeWidth,
        height: finalHeight,
        fontSize: '14px',
        whiteSpace: 'pre-wrap',
        textAlign: 'left',
      };
      // Add a red frame if there are issues.
      if (issues.length > 0) {
        nodeStyle = { ...nodeStyle, border: '4px solid red' };
      }
      const newNode = {
        id: rule.Name,
        type: 'custom-node', // Use our custom node type
        data: { label, issues },
        position: { x, y },
        style: nodeStyle,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        rule: { ...rule, issues },
      };
      nodes.push(newNode);

      // Create edges for dependencies
      dependencies.forEach(depLabel => {
        const sources = labelMap.get(depLabel) || [];
        sources.forEach(source => {
          if (source === rule.Name) return;
          const newEdge = {
            id: `${source}-${rule.Name}`,
            source: source,
            target: rule.Name,
            type: 'custom-edge',
            animated: true,
            data: { isHighlighted: false },
            style: {
              stroke: '#888',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          };
          edges.push(newEdge);
        });
      });
    });
  });

  return { nodes, edges };
};

const getNodeStyle = (action) => {
  switch (action) {
    case 'Block':
      return {
        background: 'linear-gradient(45deg, #d32f2f 30%, #ef5350 90%)',
        color: 'white',
        border: '2px solid #b71c1c',
        boxShadow: '0 4px 6px rgba(183, 28, 28, 0.3)',
        fontWeight: 'bold',
      };
    case 'Count':
      return {
        background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
        color: 'white',
        border: '2px solid #1b5e20',
        boxShadow: '0 4px 6px rgba(27, 94, 32, 0.3)',
        fontWeight: 'bold',
      };
    default:
      return {
        background: 'linear-gradient(45deg, #1565c0 30%, #42a5f5 90%)',
        color: 'white',
        border: '2px solid #0d47a1',
        boxShadow: '0 4px 6px rgba(13, 71, 161, 0.3)',
        fontWeight: 'bold',
      };
  }
};

// Define node and edge types
const nodeTypes = {
  'custom-node': CustomNode,
};

const edgeTypes = {
  'custom-edge': CustomEdge,
};

// ---------------------------
// Main WafTree Component
// ---------------------------
function WafTree() {
  const navigate = useNavigate();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const flowRef = useRef(null);
  const [highlightedNode, setHighlightedNode] = useState(null);
  const [clickedNode, setClickedNode] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [popupPosition, setPopupPosition] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filteredNodes, setFilteredNodes] = useState([]);
  const [filteredEdges, setFilteredEdges] = useState([]);
  const [showGlobalProblems, setShowGlobalProblems] = useState(false);

  const highlightConnectedEdges = useCallback((nodeId, shouldHighlight) => {
    const connectedEdges = edges.map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        isHighlighted: shouldHighlight && (edge.source === nodeId || edge.target === nodeId)
      }
    }));
    setEdges(connectedEdges);
  }, [edges, setEdges]);

  const onNodeMouseEnter = useCallback((event, node) => {
    if (!clickedNode) {  
      highlightConnectedEdges(node.id, true);
      setHighlightedNode(node.id);
    }
  }, [highlightConnectedEdges, clickedNode]);

  const onNodeMouseLeave = useCallback(() => {
    if (!clickedNode) {  
      highlightConnectedEdges(null, false);
      setHighlightedNode(null);
    }
  }, [highlightConnectedEdges, clickedNode]);

  const onNodeClick = useCallback((event, node) => {
    if (clickedNode === node.id) {
      setClickedNode(null);
      highlightConnectedEdges(null, false);
      setPopupPosition(null);
    } else {
      setClickedNode(node.id);
      highlightConnectedEdges(node.id, true);
      const rect = event.currentTarget.getBoundingClientRect();
      setPopupPosition({
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY
      });
    }
    const rule = nodes.find(n => n.id === node.id)?.rule;
    setSelectedRule(rule);
  }, [clickedNode, highlightConnectedEdges, nodes]);

  // Handle file upload to load JSON data
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          const { nodes: layoutedNodes, edges: layoutedEdges } = processWafRules([jsonData]);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setFilteredNodes(layoutedNodes);
          setFilteredEdges(layoutedEdges);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Invalid JSON file format');
        }
      };
      reader.readAsText(file);
    }
  }, [setNodes, setEdges]);

  const downloadImage = useCallback(async (format) => {
    if (!flowRef.current) return;
    const element = flowRef.current.querySelector('.react-flow__viewport');
    if (!element) return;

    try {
      let dataUrl;
      const options = {
        backgroundColor: '#f8f9fa',
        scale: 4,
        pixelRatio: 3,
        useCORS: true
      };

      if (format === 'pdf') {
        const jpegUrl = await toJpeg(element, { ...options, quality: 1.0 });
        const img = new Image();
        img.src = jpegUrl;
        await new Promise(resolve => { img.onload = resolve; });
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height],
          compress: false
        });
        pdf.addImage(jpegUrl, 'JPEG', 0, 0, img.width, img.height, undefined, 'NONE');
        pdf.save('waf-rules.pdf');
      } else {
        switch (format) {
          case 'png':
            dataUrl = await toPng(element, options);
            break;
          case 'jpg':
            dataUrl = await toJpeg(element, options);
            break;
          case 'svg':
            dataUrl = await toSvg(element, options);
            break;
          default:
            return;
        }
        const link = document.createElement('a');
        link.download = `waf-rules.${format}`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    setShowExportMenu(false);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const fetchServerRules = useCallback(async () => {
    try {
      const data = await fetchWafRules();
      const { nodes: layoutedNodes, edges: layoutedEdges } = processWafRules(data);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setFilteredNodes(layoutedNodes);
      setFilteredEdges(layoutedEdges);
    } catch (err) {
      console.error('Failed to fetch WAF rules:', err);
    }
  }, []);

  const filterGraph = useCallback((searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredNodes(nodes);
      setFilteredEdges(edges);
      return;
    }
    const term = searchTerm.toLowerCase();
    const matchingNodes = nodes.filter(node => {
      const rule = node.rule;
      const nodeText = [
        node.data.label.toLowerCase(),
        rule.Name.toLowerCase(),
        rule.RuleLabels?.map(l => l.Name.toLowerCase()).join(' ') || '',
      ].join(' ');
      return nodeText.includes(term);
    });
    const matchingNodeIds = new Set(matchingNodes.map(node => node.id));
    const relevantEdges = edges.filter(edge => 
      matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)
    );
    setFilteredNodes(matchingNodes);
    setFilteredEdges(relevantEdges);
  }, [nodes, edges]);

  useEffect(() => { filterGraph(searchText); }, [searchText, filterGraph]);
  useEffect(() => { fetchServerRules(); }, [fetchServerRules]);

  // Global list of nodes with issues (for the global warning indicator)
  const problemNodes = nodes.filter(node => node.data.issues && node.data.issues.length > 0);

  return (
    <div className={`waf-container ${isDarkMode ? 'dark' : 'light'}`}>
      <ReactFlow
        ref={flowRef}
        nodes={filteredNodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            boxShadow: node.id === clickedNode ?
              '0 0 0 4px rgba(255, 255, 255, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3)' :
              node.style.boxShadow
          }
        }))}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'custom-edge',
          animated: true,
        }}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: true,
        }}
        defaultViewport={{ zoom: 0.7, x: 0, y: 0 }}
        style={{
          background: isDarkMode ? '#1a1a1a' : '#f8f9fa',
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.1}
        maxZoom={1.5}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
      >
        <Background />
        <Controls style={{ color: 'black' }} />
        
        <Panel position="top-center" className="center-panel">
          <h2 className={`waf-title ${isDarkMode ? 'dark' : 'light'}`}>
            AWS WAF Rules Dependency Graph
          </h2>
        </Panel>

        <Panel position="top-left">
          <div className="button-container">
            <button onClick={() => navigate('/home')} className="waf-button">
              Back to Home
            </button>
            <button onClick={toggleTheme} className={`theme-button ${isDarkMode ? 'dark' : 'light'}`}>
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </Panel>

        <Panel position="top-left" className="search-panel">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search rules and labels..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="clear-search">
                ×
              </button>
            )}
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="button-container">
            <div>
              <button onClick={() => document.getElementById('fileInput').click()} className="waf-button">
                Upload JSON
              </button>
              <input
                id="fileInput"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>
            <button onClick={fetchServerRules} className="waf-button">
              Fetch Server Rules
            </button>
            <div>
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="waf-button">
                Export
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button onClick={() => downloadImage('pdf')} className="export-option">PDF</button>
                  <button onClick={() => downloadImage('png')} className="export-option">PNG</button>
                  <button onClick={() => downloadImage('jpg')} className="export-option">JPG</button>
                  <button onClick={() => downloadImage('svg')} className="export-option">SVG</button>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Global Warning Triangle with Count Badge (Bottom Right) */}
      {problemNodes.length > 0 && (
        <div className="global-warning" onClick={() => setShowGlobalProblems(!showGlobalProblems)}>
          <span role="img" aria-label="warning">⚠️</span>
          <span className="global-warning-count">{problemNodes.length}</span>
        </div>
      )}

      {/* Global Problems Popup */}
      {showGlobalProblems && (
        <div className="global-problems-popup">
          <h3>Rules with Issues</h3>
          <ul>
            {problemNodes.map(node => (
              <li key={node.id}>
                <strong>{node.id}</strong>
                <ul>
                  {node.data.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <button onClick={() => setShowGlobalProblems(false)}>Close</button>
        </div>
      )}

      {selectedRule && (
        <RuleDetailsPopup
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
          position={popupPosition}
        />
      )}
    </div>
  );
}

export default WafTree;
