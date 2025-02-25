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

// Add this function after the existing helper functions
const calculateDependencyLevels = (rules, labelMap) => {
  const levels = new Map();
  const processed = new Set();

  const getDependencyLevel = (rule) => {
    if (processed.has(rule.Name)) {
      return levels.get(rule.Name);
    }

    let maxDependencyLevel = 0;
    const dependencies = new Set();

    // Helper function to check statements for label dependencies
    const checkStatementsForLabels = (statements) => {
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
      checkStatementsForLabels([rule.Statement]);
    }

    if (dependencies.size === 0) {
      levels.set(rule.Name, 0);
      processed.add(rule.Name);
      return 0;
    }

    dependencies.forEach(depLabel => {
      const sourceRules = labelMap.get(depLabel) || [];
      sourceRules.forEach(sourceRule => {
        const sourceRuleObj = rules.find(r => r.Name === sourceRule);
        if (sourceRuleObj) {
          const level = getDependencyLevel(sourceRuleObj);
          maxDependencyLevel = Math.max(maxDependencyLevel, level + 1);
        }
      });
    });

    levels.set(rule.Name, maxDependencyLevel);
    processed.add(rule.Name);
    return maxDependencyLevel;
  };

  rules.forEach(rule => {
    getDependencyLevel(rule);
  });

  return levels;
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

// Update the processWafRules function
const processWafRules = (data) => {
  const rules = data[0].Rules;
  const nodes = [];
  const edges = [];
  const labelMap = new Map();

  // First pass: track all labels
  rules.forEach((rule) => {
    if (rule.RuleLabels) {
      rule.RuleLabels.forEach(label => {
        if (!labelMap.has(label.Name)) {
          labelMap.set(label.Name, []);
        }
        labelMap.get(label.Name).push(rule.Name);
      });
    }
  });

  // Get set of labels that are actually used in dependencies
  const usedLabels = getUsedLabels(rules);

  // Separate independent rules (including those that add unused labels)
  const independentRules = rules.filter(rule => isIndependentRule(rule, usedLabels));
  const dependentRules = rules.filter(rule => !isIndependentRule(rule, usedLabels));

  // Calculate dependency levels for dependent rules
  const dependencyLevels = calculateDependencyLevels(dependentRules, labelMap);

  // Group dependent nodes by level
  const nodesByLevel = new Map();
  nodesByLevel.set(-1, independentRules); // Put independent rules at level -1 (top)

  dependentRules.forEach((rule) => {
    const level = dependencyLevels.get(rule.Name);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level).push(rule);
  });

  // Calculate positions and create nodes
  const levelHeight = 200;
  const horizontalGap = 50;

  // Sort levels to ensure independent rules are processed first
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((level) => {
    const levelRules = nodesByLevel.get(level);
    const y = (level + 1) * levelHeight; // Add 1 to shift everything down
    const totalWidth = levelRules.length * (nodeWidth + horizontalGap);
    const startX = (window.innerWidth - totalWidth) / 2;

    levelRules.forEach((rule, index) => {
      const x = startX + index * (nodeWidth + horizontalGap);
      const dependencies = new Set();

      // Check for label dependencies
      const checkStatementsForLabels = (statements) => {
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
        checkStatementsForLabels([rule.Statement]);
      }

      const action = rule.Action ? Object.keys(rule.Action)[0] :
        rule.OverrideAction ? Object.keys(rule.OverrideAction)[0] : 'None';

      const label = formatRuleInfo(rule, Array.from(dependencies));
      const calculatedHeight = calculateTextHeight(label, nodeWidth);
      const finalHeight = Math.max(nodeHeight, calculatedHeight);

      nodes.push({
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
      });

      // Create edges for dependencies
      dependencies.forEach(depLabel => {
        const sources = labelMap.get(depLabel) || [];
        sources.forEach(source => {
          edges.push({
            id: `${source}-${rule.Name}`,
            source,
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
          });
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
      // If clicking the same node again, remove highlighting
      setClickedNode(null);
      highlightConnectedEdges(null, false);
    } else {
      // Highlight new clicked node
      setClickedNode(node.id);
      highlightConnectedEdges(node.id, true);
    }
  }, [clickedNode, highlightConnectedEdges]);

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
      const response = await fetch('http://localhost:5000/api/waf-acls');
      const data = await response.json();
      const { nodes: layoutedNodes, edges: layoutedEdges } = processWafRules(data);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } catch (err) {
      console.error('Failed to fetch WAF rules:', err);
    }
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/waf-acls')
      .then(res => res.json())
      .then(data => {
        const { nodes: layoutedNodes, edges: layoutedEdges } = processWafRules(data);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      cursor: isDarkMode ? 'white' : 'black',
    }}>
      <ReactFlow
        ref={flowRef}
        nodes={nodes.map(node => ({
          ...node,
          style: {
            ...node.style,
            // Add subtle highlight effect for clicked nodes
            boxShadow: node.id === clickedNode ?
              '0 0 0 4px rgba(255, 255, 255, 0.8), 0 4px 6px rgba(0, 0, 0, 0.3)' :
              node.style.boxShadow
          }
        }))}
        edges={edges}
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
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        minZoom={0.2}
        maxZoom={1.5}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
      >
        <Background />
        <Controls style={{ color: 'black' }} />
        {/* Center title panel */}
        <Panel position="top-center" style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
        }}>
          <h2 style={{
            color: isDarkMode ? 'white' : 'black',
            margin: 0,
            padding: '10px',
            textAlign: 'center',
          }}>
            AWS WAF Rules Dependency Graph
          </h2>
        </Panel>

        {/* Left panel with home button and theme toggle */}
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => navigate('/home')}
              style={buttonStyle}
            >
              Back to Home
            </button>
            <button
              onClick={toggleTheme}
              style={{
                ...buttonStyle,
                background: isDarkMode ? '#f8f9fa' : '#1a1a1a',
                color: isDarkMode ? '#1a1a1a' : '#f8f9fa',
              }}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </Panel>

        {/* Right panel with upload and export controls */}
        <Panel position="top-right">
          <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => document.getElementById('fileInput').click()}
                style={buttonStyle}
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
              style={buttonStyle}
            >
              Fetch Server Rules
            </button>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={buttonStyle}
              >
                Export
              </button>
              {showExportMenu && (
                <div style={exportMenuStyle}>
                  <button onClick={() => downloadImage('pdf')} style={exportOptionStyle}>
                    PDF
                  </button>
                  <button onClick={() => downloadImage('png')} style={exportOptionStyle}>
                    PNG
                  </button>
                  <button onClick={() => downloadImage('jpg')} style={exportOptionStyle}>
                    JPG
                  </button>
                  <button onClick={() => downloadImage('svg')} style={exportOptionStyle}>
                    SVG
                  </button>
                </div>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Add new styles before existing styles
const exportMenuStyle = {
  position: 'absolute',
  top: '100%',
  right: 0,
  backgroundColor: 'white',
  border: '1px solid #ccc',
  borderRadius: '4px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  zIndex: 1000,
  marginTop: '5px',
  minWidth: '120px',
};

const exportOptionStyle = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  color: '#000',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: '#f0f0f0',
  },
};

// Add styles
const buttonStyle = {
  padding: '0.5rem 1rem',
  background: '#1565c0',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
  '&:hover': {
    background: '#1976d2',
  },
};

export default WafTree;