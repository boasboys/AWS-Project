import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  Handle,
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
// Custom Node Component (with default handles)
// ---------------------------
import CustomNode from './component2/Customnode';

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
  data,
}) => {
  const offset = data?.offset || 0;
  const midY = (sourceY + targetY) / 2 + offset;
  // נתיב קובטי (Cubic Bezier) עם אופסט לעקיפת נודים
  const path = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
  
  const isHighlighted = data?.isHighlighted;
  const strokeColor = data?.permanentIssue 
    ? '#ff0000' 
    : (isHighlighted ? '#00FF00' : (style.stroke || '#888'));
  
  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={{
        ...style,
        strokeWidth: isHighlighted ? 4 : 2,
        stroke: strokeColor,
        transition: 'all 0.3s ease-in-out',
        opacity: 1,
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

// בודק את ההצהרה ומחזיר סט של תוויות בהן נעשה שימוש
const checkStatementsForLabels = (statement) => {
  const dependencies = new Set();

  const processStatement = (stmt) => {
    if (!stmt) return;
    if (stmt.LabelMatchStatement) {
      dependencies.add(stmt.LabelMatchStatement.Key);
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
  return dependencies;
};

// פונקציה לאימות חוק יחיד לפי כללי התקינות
const validateRule = (rule, labelMap, allRules, ruleDependencies) => {
  const issues = [];
  
  // בדיקת שדות חובה
  if (!rule.Name) {
    issues.push('Missing required field: Name.');
  }
  if (!rule.Action) {
    issues.push('Missing required field: Action.');
  }

  const usedLabels = checkStatementsForLabels(rule.Statement);

  // בדיקה של תלות עצמית - אם החוק מייצר תווית ומשתמש בה
  if (rule.RuleLabels) {
    rule.RuleLabels.forEach(label => {
      if (usedLabels.has(label.Name)) {
        issues.push(`Rule "${rule.Name}" depends on the label it creates: "${label.Name}".`);
      }
    });
  }

  // בדיקת תלות חסרה - אם החוק מתייחס לתווית שלא נוצרת על ידי אף חוק
  usedLabels.forEach(label => {
    if (!labelMap.has(label)) {
      issues.push(`Rule "${rule.Name}" depends on non-existent label: "${label}".`);
    }
  });

  // בדיקת תלות לא תקינה - אם החוק תלוי בחוק שמבצע Block או Allow
  const dependencies = ruleDependencies.get(rule.Name) || [];
  dependencies.forEach(depRuleName => {
    const depRule = allRules.find(r => r.Name === depRuleName);
    if (depRule && depRule.Action) {
      const depAction = Object.keys(depRule.Action)[0];
      if (depAction === 'Block' || depAction === 'Allow') {
        issues.push(`Rule "${rule.Name}" depends on "${depRuleName}" which has action "${depAction}".`);
      }
    }
  });

  // בדיקת עדיפות - אם חוק תלוי בחוק שיש לו עדיפות גבוהה יותר (מספר עדיפות גבוה יותר)
  dependencies.forEach(depRuleName => {
    const depRule = allRules.find(r => r.Name === depRuleName);
    if (depRule && rule.Priority < depRule.Priority) {
      issues.push(`Priority error: Rule "${rule.Name}" (priority ${rule.Priority}) depends on "${depRuleName}" (priority ${depRule.Priority}).`);
    }
  });

  // בדיקת מעגליות (תלות מעגלית)
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
    issues.push(`Circular dependency detected in rule "${rule.Name}".`);
  }

  // בדיקת כלל מיותר - אם לכלל יש את אותה פעולה והתוויות שלו הן תת-קבוצה של כלל אחר עם עדיפות גבוהה יותר
  allRules.forEach(otherRule => {
    if (otherRule.Name === rule.Name) return;
    const action1 = rule.Action ? Object.keys(rule.Action)[0] : 'None';
    const action2 = otherRule.Action ? Object.keys(otherRule.Action)[0] : 'None';
    if (action1 === action2) {
      const ruleLabels = rule.RuleLabels ? rule.RuleLabels.map(l => l.Name) : [];
      const otherLabels = otherRule.RuleLabels ? otherRule.RuleLabels.map(l => l.Name) : [];
      const isSubset = ruleLabels.every(lbl => otherLabels.includes(lbl));
      if (isSubset && rule.Priority < otherRule.Priority) {
        issues.push(`Redundant rule: "${rule.Name}" is redundant due to higher priority rule "${otherRule.Name}".`);
      }
    }
  });

  // בדיקת שכפול תוויות - אם אותה תווית נוצרת על ידי מספר חוקים
  if (rule.RuleLabels) {
    rule.RuleLabels.forEach(label => {
      const providers = labelMap.get(label.Name) || [];
      if (providers.length > 1) {
        issues.push(`Duplicate label: Label "${label.Name}" is produced by multiple rules: ${providers.join(', ')}.`);
      }
    });
  }

  // הודעה על חוק חסום (Block)
  const isBlock = (rule.Action && Object.keys(rule.Action)[0] === 'Block') ||
                  (rule.OverrideAction && Object.keys(rule.OverrideAction)[0] === 'Block');
  if (isBlock) {
    issues.push("Blocking rule detected. Blocking rules can lead to unintended side effects.");
  }

  return issues;
};

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
      return 0;
    }
    visiting.add(rule.Name);
    let maxDependencyLevel = 0;
    const dependencies = new Set();
    const labels = checkStatementsForLabels(rule.Statement);
    labels.forEach(depLabel => dependencies.add(depLabel));
    dependenciesMap.set(rule.Name, Array.from(dependencies));
    dependencies.forEach(depLabel => {
      const sourceRules = labelMap.get(depLabel) || [];
      sourceRules.forEach(sourceRuleName => {
        if (sourceRuleName === rule.Name) return;
        if (!path.has(sourceRuleName)) {
          const sourceRuleObj = rules.find(r => r.Name === sourceRuleName);
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
    const checkStatementsForLabelsLocal = (statements) => {
      if (!statements) return;
      statements.forEach(stmt => {
        if (stmt.LabelMatchStatement) {
          usedLabels.add(stmt.LabelMatchStatement.Key);
        } else if (stmt.AndStatement) {
          checkStatementsForLabelsLocal(stmt.AndStatement.Statements);
        } else if (stmt.OrStatement) {
          checkStatementsForLabelsLocal(stmt.OrStatement.Statements);
        } else if (stmt.NotStatement) {
          checkStatementsForLabelsLocal([stmt.NotStatement.Statement]);
        }
      });
    };
    if (rule.Statement) {
      if (rule.Statement.AndStatement)
        checkStatementsForLabelsLocal(rule.Statement.AndStatement.Statements);
      else if (rule.Statement.OrStatement)
        checkStatementsForLabelsLocal(rule.Statement.OrStatement.Statements);
      else if (rule.Statement.NotStatement)
        checkStatementsForLabelsLocal([rule.Statement.NotStatement.Statement]);
      else checkStatementsForLabelsLocal([rule.Statement]);
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
  // labelMap: label name => array of rule names that produce it
  const labelMap = new Map();
  const labelProviders = new Map();
  const ruleDependencies = new Map();

  // בניית מפת תוויות
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

  // בניית מפת תלות בין חוקים
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

  const { levels } = calculateDependencyLevels(rules, labelMap);
  const nodesByLevel = new Map();
  rules.forEach(rule => {
    const level = levels.get(rule.Name);
    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }
    nodesByLevel.get(level).push(rule);
  });

  const ruleIssuesMap = new Map();
  rules.forEach(rule => {
    const issues = validateRule(rule, labelMap, rules, ruleDependencies);
    ruleIssuesMap.set(rule.Name, issues);
  });

  const levelHeight = 200;
  const horizontalGap = 50;
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);

  sortedLevels.forEach((level) => {
    const levelRules = nodesByLevel.get(level);
    const y = (level + 1) * levelHeight;
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
      if (issues.length > 0) {
        nodeStyle = { ...nodeStyle, border: '4px solid red' };
      }
      const newNode = {
        id: rule.Name,
        type: 'custom-node',
        data: { label, issues },
        position: { x, y },
        style: nodeStyle,
        sourcePosition: 'bottom',
        targetPosition: 'top',
        rule: { ...rule, issues },
      };
      nodes.push(newNode);

      dependencies.forEach(depLabel => {
        const sources = labelMap.get(depLabel) || [];
        sources.forEach(source => {
          if (source === rule.Name) return;
          const newEdge = {
            id: `${source}-${rule.Name}`,
            source: source,
            target: rule.Name,
            sourceHandle: 'source',
            targetHandle: 'target',
            type: 'custom-edge',
            animated: true,
            data: { isHighlighted: false, offset: 0 },
            style: {
              stroke: '#888',
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          };
          const sourceRule = rules.find(r => r.Name === source);
          const currentRule = rule;
          const isBlocking = (r) => {
            return (r.Action && Object.keys(r.Action)[0] === 'Block') ||
                   (r.OverrideAction && Object.keys(r.OverrideAction)[0] === 'Block');
          };
          if (sourceRule && isBlocking(sourceRule) && isBlocking(currentRule)) {
            newEdge.data.permanentIssue = true;
            newEdge.style.stroke = '#ff0000';
            newEdge.style.opacity = 1;
          }
          edges.push(newEdge);
        });
      });
    });
  });

  // קיבוץ קווים לפי מקור-יעד ומתן אופסט לכל קו במידה ויש יותר מקו אחד באותו זוג
  const edgeGroups = {};
  edges.forEach(edge => {
    const key = `${edge.source}-${edge.target}`;
    if (!edgeGroups[key]) {
      edgeGroups[key] = [];
    }
    edgeGroups[key].push(edge);
  });
  Object.values(edgeGroups).forEach(group => {
    if (group.length > 1) {
      const count = group.length;
      group.forEach((edge, index) => {
        edge.data.offset = (index - (count - 1) / 2) * 15;
      });
    } else {
      group[0].data.offset = 0;
    }
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

      {problemNodes.length > 0 && (
        <div className="global-warning" onClick={() => setShowGlobalProblems(!showGlobalProblems)}>
          <span role="img" aria-label="warning">⚠️</span>
          <span className="global-warning-count">{problemNodes.length}</span>
        </div>
      )}

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
