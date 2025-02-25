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

// Add custom edge type with better routing
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

  // Create curved path that goes around nodes using quadratic curves
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

// Layout configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 350;  // Increased width for more content
const nodeHeight = 150; // Increased height for more content

// Helper function to format rule information
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

// Update the function to properly handle nested statements including RateBasedStatement
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

// Replace the existing calculateDependencyLevels function with this updated version
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

    // Process each dependency – skip if the label is provided by the same rule
    dependencies.forEach(depLabel => {
      const sourceRules = labelMap.get(depLabel) || [];
      sourceRules.forEach(sourceRule => {
        if (sourceRule === rule.Name) return; // skip self-dependency
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

    // If no dependencies, set level to 0 so the rule appears in the first row
    if (dependencies.size === 0) {
      levels.set(rule.Name, 0);
    } else {
      levels.set(rule.Name, maxDependencyLevel);
    }
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

// Add after the existing helper functions
const calculateTextHeight = (text, width, fontSize = 14, padding = 15) => {
  // Create temporary DOM element to measure text
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

  // Add padding and some buffer space
  return height + (padding * 2) + 10;
};

// Add this function before isIndependentRule
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
      if (rule.Statement.AndStatement) checkStatementsForLabels(rule.Statement.AndStatement.Statements);
      else if (rule.Statement.OrStatement) checkStatementsForLabels(rule.Statement.OrStatement.Statements);
      else if (rule.Statement.NotStatement) checkStatementsForLabels([rule.Statement.NotStatement.Statement]);
      else checkStatementsForLabels([rule.Statement]);
    }
  });

  return usedLabels;
};

// Update isIndependentRule to accept usedLabels parameter
const isIndependentRule = (rule, usedLabels) => {
  // If rule adds labels that no one uses, it's still independent
  if (rule.RuleLabels && rule.RuleLabels.length > 0) {
    const addsUnusedLabelsOnly = rule.RuleLabels.every(label => !usedLabels.has(label.Name));
    if (!addsUnusedLabelsOnly) {
      return false;
    }
  }

  // Check if rule depends on any labels
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
    if (rule.Statement.AndStatement) {
      return !hasLabelDependency(rule.Statement.AndStatement.Statements);
    }
    if (rule.Statement.OrStatement) {
      return !hasLabelDependency(rule.Statement.OrStatement.Statements);
    }
    if (rule.Statement.NotStatement) {
      return !hasLabelDependency([rule.Statement.NotStatement.Statement]);
    }
    return !hasLabelDependency([rule.Statement]);
  }

  return true;
};

// Update the processWafRules function to properly create edges
const processWafRules = (data) => {
  const rules = data[0].Rules;
  const nodes = [];
  const edges = [];
  const labelMap = new Map();
  const labelProviders = new Map(); // Map to track which rules provide which labels
  const ruleDependencies = new Map(); // Map to track direct dependencies between rules

  // First pass: track all labels and their source rules
  rules.forEach((rule) => {
    if (rule.RuleLabels) {
      rule.RuleLabels.forEach(label => {
        if (!labelMap.has(label.Name)) {
          labelMap.set(label.Name, []);
        }
        labelMap.get(label.Name).push(rule.Name);
        
        // Track which rule provides this label
        labelProviders.set(label.Name, rule.Name);
      });
    }
  });

  // Second pass: build direct rule dependencies
  rules.forEach((rule) => {
    const dependencies = new Set();
    const processStatement = (stmt) => {
      if (!stmt) return;

      if (stmt.LabelMatchStatement) {
        const labelProvider = labelProviders.get(stmt.LabelMatchStatement.Key);
        // אם התווית מסופקת על ידי אותו חוק – דלג
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

  // Calculate levels ensuring dependent rules are below their dependencies
  const levels = new Map();
  const calculateLevel = (ruleName, visited = new Set()) => {
    if (levels.has(ruleName)) return levels.get(ruleName);
    if (visited.has(ruleName)) return 0;

    visited.add(ruleName);
    const dependencies = ruleDependencies.get(ruleName) || [];
    
    if (dependencies.length === 0) {
      levels.set(ruleName, 0);
      return 0;
    }

    let maxLevel = -1;
    dependencies.forEach(dep => {
      const depLevel = calculateLevel(dep, new Set(visited));
      maxLevel = Math.max(maxLevel, depLevel + 1);
    });

    levels.set(ruleName, maxLevel);
    return maxLevel;
  };

  rules.forEach(rule => calculateLevel(rule.Name));

  // Group rules by level
  const nodesByLevel = new Map();
  rules.forEach(rule => {
    const level = levels.get(rule.Name);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level).push(rule);
  });

  // Calculate positions and create nodes
  const levelHeight = 200;
  const horizontalGap = 50;
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((level) => {
    const levelRules = nodesByLevel.get(level);
    const y = (level + 1) * levelHeight; // Add 1 to shift everything down
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

      const newNode = {
        id: rule.Name,
        data: { label },
        position: { x, y },
        style: {
          ...getNodeStyle(action),
          padding: 15,
          borderRadius: 10,
          width: nodeWidth,
          height: finalHeight,
          fontSize: '14px',
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
        },
        sourcePosition: 'bottom',
        targetPosition: 'top',
        rule: rule, // store the full rule data
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

// Define edgeTypes outside of the component
const edgeTypes = {
  'custom-edge': CustomEdge,
};

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
    if (!clickedNode) {  // Only highlight on hover if no node is clicked
      highlightConnectedEdges(node.id, true);
      setHighlightedNode(node.id);
    }
  }, [highlightConnectedEdges, clickedNode]);

  const onNodeMouseLeave = useCallback(() => {
    if (!clickedNode) {  // Only remove highlight on leave if no node is clicked
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

    // Find and set the selected rule
    const rule = nodes.find(n => n.id === node.id)?.rule;
    setSelectedRule(rule);
  }, [clickedNode, highlightConnectedEdges, nodes]);

  // Add file upload handler
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
  }, []);

  const downloadImage = useCallback(async (format) => {
    if (!flowRef.current) return;
    const element = flowRef.current.querySelector('.react-flow__viewport');
    if (!element) return;

    try {
      let dataUrl;
      const options = {
        backgroundColor: '#f8f9fa',
        scale: 4, // Increased scale for better quality
        pixelRatio: 3, // Increased pixel ratio for better sharpness
        useCORS: true // Enable cross-origin resource sharing
      };

      if (format === 'pdf') {
        // Create high-quality JPEG first
        const jpegUrl = await toJpeg(element, {
          ...options,
          quality: 1.0
        });

        // Load image to get dimensions
        const img = new Image();
        img.src = jpegUrl;
        await new Promise(resolve => {
          img.onload = resolve;
        });

        // Create PDF with proper dimensions
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height],
          compress: false // Disable compression for better quality
        });

        // Add image with high quality
        pdf.addImage(
          jpegUrl,
          'JPEG',
          0,
          0,
          img.width,
          img.height,
          undefined,
          'NONE' // No compression
        );

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
        // Add more fields to search through if needed
      ].join(' ');

      return nodeText.includes(term);
    });

    const matchingNodeIds = new Set(matchingNodes.map(node => node.id));

    // Keep edges that connect matching nodes
    const relevantEdges = edges.filter(edge => 
      matchingNodeIds.has(edge.source) && matchingNodeIds.has(edge.target)
    );

    setFilteredNodes(matchingNodes);
    setFilteredEdges(relevantEdges);
  }, [nodes, edges]);

  useEffect(() => {
    filterGraph(searchText);
  }, [searchText, filterGraph]);

  useEffect(() => {
    fetchServerRules();
  }, [fetchServerRules]);

  return (
    <div className={`waf-container ${isDarkMode ? 'dark' : 'light'}`}>
      <ReactFlow
        ref={flowRef}
        nodes={filteredNodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            // Add subtle highlight effect for clicked nodes
            boxShadow: node.id === clickedNode ?
              '0 0 0 4px rgba(255, 255, 255, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3)' :
              node.style.boxShadow
          }
        }))}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        edgeTypes={edgeTypes}  // Use the constant defined outside
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
        // Allow further zooming out by lowering the minimum zoom
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
            <button
              onClick={() => navigate('/home')}
              className="waf-button"
            >
              Back to Home
            </button>
            <button
              onClick={toggleTheme}
              className={`theme-button ${isDarkMode ? 'dark' : 'light'}`}
            >
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
              <button
                onClick={() => setSearchText('')}
                className="clear-search"
              >
                ×
              </button>
            )}
          </div>
        </Panel>

        <Panel position="top-right">
          <div className="button-container">
            <div>
              <button
                onClick={() => document.getElementById('fileInput').click()}
                className="waf-button"
              >
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
            
            <button
              onClick={fetchServerRules}
              className="waf-button"
            >
              Fetch Server Rules
            </button>

            <div>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="waf-button"
              >
                Export
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button onClick={() => downloadImage('pdf')} className="export-option">
                    PDF
                  </button>
                  <button onClick={() => downloadImage('png')} className="export-option">
                    PNG
                  </button>
                  <button onClick={() => downloadImage('jpg')} className="export-option">
                    JPG
                  </button>
                  <button onClick={() => downloadImage('svg')} className="export-option">
                    SVG
                  </button>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>
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
