import React, { useEffect, useState, useMemo } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
  ReactFlowProvider  // Add this import
} from "reactflow";
import "reactflow/dist/style.css";
import "../styles/WafTree.css";

const getIcon = (type) => {
  switch (type) {
    case 'acl':
      return 'fa-shield-alt';
    case 'rule':
      return 'fa-filter';
    default:
      return 'fa-code-branch';
  }
};

// Custom Node Component
const CustomNode = ({ data }) => {
  const isAclNode = data.type === 'acl';
  const generatesLabels = data.generatesLabels?.length > 0;
  
  const nodeType = isAclNode ? 'acl' : (generatesLabels ? 'generator' : 'rule');
  
  const [title, ...details] = data.label.split('\n');

  return (
    <div className="node-container">
      <Handle
        type="source"
        position={Position.Bottom}
        id="source"
        style={{ 
          bottom: -8,
          background: '#555',
          width: '8px',
          height: '8px',
          border: '2px solid white'
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        style={{ 
          top: -8,
          background: '#555',
          width: '8px',
          height: '8px',
          border: '2px solid white'
        }}
      />
      
      <div className={`node-status node-status-${nodeType}`}>
        {title}
      </div>

      <div style={{ fontSize: '12px', color: '#475569' }}>
        {details.map((detail, i) => (
          <div key={`detail-${i}`}>{detail}</div>  // Added unique key
        ))}
      </div>

      {data.generatesLabels && (
        <div className="node-metrics">
          <div className="node-metric">
            <i className="fas fa-tags" style={{ color: '#047857' }}></i>
            {data.generatesLabels.length} Labels
          </div>
          <div className="node-metric">
            <i className="fas fa-code-branch" style={{ color: '#0369a1' }}></i>
            {data.dependentCount || 0} Dependencies
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getGeneratedLabels(rule) {
  return (rule.RuleLabels || []).map(label => label.Name);
}

function getLabelDependencies(rule) {
  if (!rule.Statement) return [];
  
  const deps = [];
  
  if (rule.Statement.LabelMatchStatement) {
    deps.push(rule.Statement.LabelMatchStatement.Key);
  }
  
  if (rule.Statement.AndStatement) {
    rule.Statement.AndStatement.Statements.forEach(stmt => {
      if (stmt.LabelMatchStatement) {
        deps.push(stmt.LabelMatchStatement.Key);
      }
    });
  }
  
  return deps;
}

function organizeRulesByDependency(rules) {
  const rulesByLevel = [];
  const processed = new Map();
  const labelToRule = new Map();

  rules.forEach(rule => {
    getGeneratedLabels(rule).forEach(label => {
      labelToRule.set(label, rule);
    });
  });

  const getMaxDependencyLevel = (rule) => {
    const deps = getLabelDependencies(rule);
    if (deps.length === 0) return -1;

    let maxLevel = -1;
    deps.forEach(dep => {
      const sourceRule = labelToRule.get(dep);
      if (sourceRule && processed.has(sourceRule.Name)) {
        maxLevel = Math.max(maxLevel, processed.get(sourceRule.Name));
      }
    });
    return maxLevel;
  };

  const canAddToLevel = (rule, currentLevel) => {
    const deps = getLabelDependencies(rule);
    if (deps.length === 0) return currentLevel === 0;

    const maxDependencyLevel = getMaxDependencyLevel(rule);
    return maxDependencyLevel !== -1 && currentLevel > maxDependencyLevel;
  };

  let remainingRules = [...rules];
  let currentLevel = 0;
  
  while (remainingRules.length > 0) {
    const levelRules = [];
    const nextRemainingRules = [];

    remainingRules.forEach(rule => {
      if (canAddToLevel(rule, currentLevel)) {
        levelRules.push(rule);
        processed.set(rule.Name, currentLevel);
      } else {
        nextRemainingRules.push(rule);
      }
    });

    if (levelRules.length > 0) {
      rulesByLevel.push(levelRules);
      currentLevel++;
    } else if (nextRemainingRules.length > 0) {
      rulesByLevel.push(nextRemainingRules);
      break;
    }

    remainingRules = nextRemainingRules;
  }

  return rulesByLevel;
}

// Update generateFlowDiagram function
function generateFlowDiagram(acl) {
  const nodes = [];
  const edges = [];
  const nodeMap = new Map();

  const aclNodeId = `acl-${acl.Id}`;
  nodes.push({
    id: aclNodeId,
    type: 'custom',
    data: { 
      label: `ACL: ${acl.Name}\nDefaultAction: ${Object.keys(acl.DefaultAction)[0]}`,
      type: 'acl'
    },
    position: { x: 400, y: 50 },
    style: { zIndex: 1000 }
  });

  const ruleLevels = organizeRulesByDependency(acl.Rules || []);
  const VERTICAL_SPACING = 300;
  const HORIZONTAL_SPACING = 400;

  // Create reusable edge configuration
  const createEdge = (source, target, label = null) => ({
    id: `e-${source}-${target}${label ? `-${label}` : ''}`,
    source,
    target,
    sourceHandle: 'source',
    targetHandle: 'target',
    type: 'step',  // Changed from smoothstep
    animated: true,
    label,
    style: { stroke: '#555', strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#555',
    }
  });

  // Create nodes with correct dependency count
  ruleLevels.forEach((levelRules, levelIndex) => {
    const y = (levelIndex + 1) * VERTICAL_SPACING + 50;
    
    levelRules.forEach((rule, ruleIndex) => {
      const centerOffset = (levelRules.length - 1) / 2;
      const x = ((ruleIndex - centerOffset) * HORIZONTAL_SPACING) + 400;
      const ruleNodeId = `rule-${rule.Name}`;
      const action = rule.Action ? Object.keys(rule.Action)[0] : 
                    rule.OverrideAction ? Object.keys(rule.OverrideAction)[0] : 'None';

      const generatedLabels = getGeneratedLabels(rule);
      const dependentLabels = getLabelDependencies(rule);  // Get labels this rule depends on
      
      const labelText = [
        `Rule: ${rule.Name}`,
        `Priority: ${rule.Priority}`,
        `Action: ${action}`,
        generatedLabels.length > 0 ? `Generates Labels: ${generatedLabels.join(", ")}` : null,
        dependentLabels.length > 0 ? `Depends on Labels: ${dependentLabels.join(", ")}` : null
      ].filter(Boolean).join("\n");

      nodes.push({
        id: ruleNodeId,
        type: 'custom',
        data: { 
          label: labelText,
          generatesLabels: generatedLabels,
          dependentCount: dependentLabels.length,  // Use number of labels this rule depends on
          type: 'rule'
        },
        position: { x, y },
      });

      nodeMap.set(rule.Name, ruleNodeId);
    });
  });

  // Second pass: Create edges based on dependencies
  acl.Rules.forEach(rule => {
    const targetNodeId = nodeMap.get(rule.Name);
    const deps = getLabelDependencies(rule);
    
    // Connect first level rules to ACL
    if (ruleLevels[0].includes(rule)) {
      edges.push(createEdge(aclNodeId, targetNodeId));
    }

    // Connect dependent rules
    deps.forEach(dep => {
      const sourceRules = acl.Rules.filter(r => 
        getGeneratedLabels(r).includes(dep)
      );
      
      sourceRules.forEach(sourceRule => {
        const sourceNodeId = nodeMap.get(sourceRule.Name);
        if (sourceNodeId && sourceNodeId !== targetNodeId) {
          edges.push(createEdge(sourceNodeId, targetNodeId, `Uses ${dep}`));
        }
      });
    });
  });

  return {
    nodes,
    edges,
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.6  // Reduced zoom to show more
    }
  };
}

const WafTree = () => {
  const [wafAcls, setWafAcls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Move useMemo before any conditional returns
  const nodeTypes = useMemo(() => ({
    custom: CustomNode
  }), []);

  useEffect(() => {
    const fetchWafAcls = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/waf-acls");
        setWafAcls(response.data);
      } catch (error) {
        console.error("Error fetching WAF ACLs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWafAcls();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }
  if (!wafAcls?.length) {
    return (
      <Typography variant="h6" color="error">
        No ACLs found
      </Typography>
    );
  }

  return (
    <Container maxWidth={false} style={{ padding: 0 }}>
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF ACL Flow
      </Typography>

      {wafAcls.map((acl, index) => {
        const { nodes, edges, viewport } = generateFlowDiagram(acl);
        return (
          <React.Fragment key={acl.Id || `acl-${index}`}>
            <Typography variant="h6" gutterBottom>
              ACL Name: {acl.Name}
            </Typography>
            <div style={{ height: '800px', width: '100%' }}>
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  fitView
                  defaultViewport={viewport}
                  defaultEdgeOptions={{
                    type: 'step',
                    animated: true
                  }}
                  fitViewOptions={{
                    padding: 0.5,
                    includeHiddenNodes: true,
                    minZoom: 0.2,
                    maxZoom: 1.5
                  }}
                  minZoom={0.1}
                  maxZoom={2}
                  style={{ background: '#fafafa' }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                >
                  <Background color="#f1f5f9" gap={16} />
                  <Controls />
                  <MiniMap 
                    style={{ height: 120 }} 
                    zoomable 
                    pannable 
                    nodeColor="#555"
                  />
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          </React.Fragment>
        );
      })}
    </Container>
  );
};

// Add these styles to your CSS
const styles = `
.custom-node {
  transition: all 0.2s ease;
}

.custom-node:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.node-content {
  transition: all 0.2s ease;
}

.node-content:hover {
  filter: brightness(110%);
}
`;

export default WafTree;
