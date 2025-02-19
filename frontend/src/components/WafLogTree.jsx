import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import layoutGraph from "./layoutGraph";

const WafLogTree = () => {
  const [limit, setLimit] = useState(10);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [acls, setAcls] = useState([]);

  // Fetch ACLs on mount
  useEffect(() => {
    axios.get("http://localhost:5000/api/waf-acls")
      .then(res => setAcls(res.data))
      .catch(err => console.error("Error fetching WAF ACLs:", err));
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/logs?logGroupName=aws-waf-logs-mywaf&logStreamName=cloudfront_demo_0&limit=${limit}`
      );
      
      const processedLogs = response.data.events.map(event => {
        const logData = JSON.parse(event.message);
        return {
          timestamp: event.timestamp,
          aclId: logData.webaclId.split('/').pop(),
          request: {
            method: logData.httpRequest.httpMethod,
            uri: logData.httpRequest.uri,
            clientIp: logData.httpRequest.clientIp,
            args: logData.httpRequest.args,
            headers: logData.httpRequest.headers
          },
          blocked: logData.action === "BLOCK",
          terminatingRuleId: logData.terminatingRuleId,
          terminatingRuleMatchDetails: logData.terminatingRuleMatchDetails,
          ruleGroupList: logData.ruleGroupList
        };
      });

      setLogs(processedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    }
  };

  const generateTreeFromLog = (log, acl) => {
    const mainNodes = [];
    const mainEdges = [];
    const blockingNotes = [];
    const blockingEdges = [];
    
    const blockingRuleId = log.terminatingRuleId;
    
    // Generate the tree structure
    const startId = `start-acl-${acl.Id}`;
    mainNodes.push({
      id: startId,
      data: { 
        label: `ACL: ${acl.Name}\nDefaultAction: ${Object.keys(acl.DefaultAction)[0]}` 
      },
      position: { x: 0, y: 0 },
      style: {
        background: "#4682B4",
        padding: 10,
        borderRadius: 8,
        color: "#fff",
        width: "auto",
        minWidth: 250,
        textAlign: "center",
        whiteSpace: "pre-wrap"
      }
    });

    let currentNodeId = startId;

    // Process each rule
    acl.Rules?.sort((a, b) => a.Priority - b.Priority).forEach((rule, index) => {
      const ruleId = `rule-${acl.Id}-${index}`;
      const isBlockingRule = rule.Name === blockingRuleId;
      const wasEvaluated = log.ruleGroupList?.some(group => 
        group.terminatingRule?.ruleId === rule.Name ||
        group.nonTerminatingMatchingRules?.some(r => r.ruleId === rule.Name)
      );

      const yPos = (index + 1) * 150;
      
      // Add rule node
      mainNodes.push({
        id: ruleId,
        data: {
          label: `Rule: ${rule.Name}\nPriority: ${rule.Priority}\nAction: ${Object.keys(rule.Action || rule.OverrideAction)[0]}`
        },
        position: { x: 0, y: yPos },
        style: {
          background: wasEvaluated ? (isBlockingRule ? "#ef4444" : "#93c5fd") : "#fff",
          color: wasEvaluated ? "#fff" : "#000",
          padding: 10,
          borderRadius: 8,
          border: wasEvaluated ? "3px solid #3b82f6" : "1px solid #999",
          boxShadow: wasEvaluated ? "0 0 10px rgba(59,130,246,0.5)" : "none",
          width: "auto",
          minWidth: 250,
          textAlign: "center",
          whiteSpace: "pre-wrap"
        }
      });

      // Add edge to rule
      mainEdges.push({
        id: `edge-${currentNodeId}-${ruleId}`,
        source: currentNodeId,
        target: ruleId,
        animated: wasEvaluated,
        style: { 
          stroke: wasEvaluated ? "#3b82f6" : "#999",
          strokeWidth: wasEvaluated ? 3 : 1
        }
      });

      // Add blocking note if this is the blocking rule
      if (isBlockingRule) {
        const reasonId = `block-reason-${ruleId}`;
        blockingNotes.push({
          id: reasonId,
          data: {
            label: (
              <>
                <Typography variant="h6" sx={{ color: '#ef4444', fontWeight: 'bold', mb: 1 }}>
                  Blocked Request
                </Typography>
                <Typography variant="body1" sx={{ mb: 0.5 }}>
                  Rule: {rule.Name}
                </Typography>
                {log.terminatingRuleMatchDetails?.[0]?.matchedData && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Matched Data:
                    <br />
                    {log.terminatingRuleMatchDetails[0].matchedData}
                  </Typography>
                )}
                {log.terminatingRuleMatchDetails?.[0]?.location && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Location:
                    <br />
                    {log.terminatingRuleMatchDetails[0].location}
                  </Typography>
                )}
                {log.terminatingRuleMatchDetails?.[0]?.conditionType && (
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Condition:
                    <br />
                    {log.terminatingRuleMatchDetails[0].conditionType}
                  </Typography>
                )}
              </>
            )
          },
          position: { x: -400, y: yPos },
          style: {
            background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)",
            padding: 15,
            border: "2px solid #ef4444",
            borderRadius: 8,
            width: "auto",
            minWidth: 300,
            boxShadow: "0 4px 6px -1px rgb(239 68 68 / 0.3)",
            textAlign: "left"
          }
        });
        
        blockingEdges.push({
          id: `edge-${ruleId}-${reasonId}`,
          source: ruleId,
          target: reasonId,
          type: 'straight',
          animated: true,
          style: { stroke: "#ef4444", strokeWidth: 2 }
        });
      }

      currentNodeId = ruleId;
    });

    // Add final allow node if not blocked
    if (!log.blocked) {
      const allowId = "final-allow";
      mainNodes.push({
        id: allowId,
        data: {
          label: (
            <>
              <CheckCircleIcon color="success" />
              <Typography>Request Allowed</Typography>
            </>
          )
        },
        position: { x: 0, y: (acl.Rules?.length + 1) * 150 },
        style: {
          background: "#bbf7d0",
          padding: 10,
          borderRadius: 8,
          border: "2px solid #22c55e"
        }
      });

      mainEdges.push({
        id: `edge-${currentNodeId}-${allowId}`,
        source: currentNodeId,
        target: allowId,
        animated: true,
        style: { stroke: "#22c55e", strokeWidth: 2 }
      });
    }

    const allNodes = [...mainNodes, ...blockingNotes];
    const allEdges = [...mainEdges, ...blockingEdges];

    const { nodes: layoutedNodes, edges: layoutedEdges } = layoutGraph(allNodes, allEdges, "TB");
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  };

  const handleLogClick = (log) => {
    console.log('Log clicked:', log);
    setSelectedLog(log);
    const matchingAcl = acls.find(acl => acl.Id === log.aclId);
    console.log('Matching ACL:', matchingAcl);
    
    if (matchingAcl) {
      generateTreeFromLog(log, matchingAcl);
    } else {
      console.error('No matching ACL found for ID:', log.aclId);
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom align="center">
        WAF Logs Analysis
      </Typography>

      <Box sx={{ mb: 4, display: "flex", gap: 2 }}>
        <TextField
          type="number"
          label="Limit"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={fetchLogs}>
          Fetch Logs
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Paper sx={{ width: 300, maxHeight: 600, overflow: "auto" }}>
          <List>
            {Array.isArray(logs) && logs.length > 0 ? (
              logs.map((log, index) => (
                <ListItem
                  component="div"
                  key={index}
                  selected={selectedLog === log}
                  onClick={() => handleLogClick(log)}
                  sx={{ cursor: 'pointer' }}
                >
                  <ListItemText
                    primary={`Request ${index + 1}`}
                    secondary={`${log.request.method} ${log.request.uri}`}
                  />
                  {log.blocked && <ErrorIcon color="error" />}
                  {!log.blocked && <CheckCircleIcon color="success" />}
                </ListItem>
              ))
            ) : (
              <ListItem component="div">
                <ListItemText primary="No logs available" />
              </ListItem>
            )}
          </List>
        </Paper>

        <Paper sx={{ flex: 1, height: 600 }}>
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </Paper>
      </Box>
    </Container>
  );
};

export default WafLogTree;
