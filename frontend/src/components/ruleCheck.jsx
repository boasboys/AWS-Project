import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import RuleDetailsPopup from './RuleDetailsPopup'; // Our popup component

// Import helper functions from external modules
import { measureNodes, drawGraph as drawGraphHelper, getNodeColor, highlightParentsAndChildren } from './functions/treeFunctions.js';
import { extractAllLabelKeys, ruleInsertsHeader, layoutWithElk } from './functions/functions1';
import validateRules from './functions/validateRules';

// MUI imports
import {
  Box,
  Stack,
  Typography,
  Button,
  Paper,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import appsflyerRules from '../data/appsflyerRules.json';

const WAFRuleTree = () => {
  const svgRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [darkTheme, setDarkTheme] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [errorNodeIds, setErrorNodeIds] = useState(new Set());
  const [showWarnings, setShowWarnings] = useState(false);
  const errorPanelRef = useRef(null);

  const diagramWidth = 1200;
  const diagramHeight = 1000;
  const zoomScale = 1.5;

  // Zoom to center on a node.
  const zoomToNode = node => {
    const svg = d3.select(svgRef.current);
    const translateX = diagramWidth / 2 - zoomScale * (node.x + node.width / 2);
    const translateY = diagramHeight / 2 - zoomScale * (node.y + node.height / 2);
    if (zoomBehaviorRef.current) {
      svg.transition().duration(750)
         .call(
           zoomBehaviorRef.current.transform,
           d3.zoomIdentity.translate(translateX, translateY).scale(zoomScale)
         );
    }
  };

  useEffect(() => {
    const data = appsflyerRules.LibRules || [];
    const { errors, errorNodes } = validateRules(data);
    setValidationErrors(errors);
    setErrorNodeIds(errorNodes);

    const allNodes = data.map((rule, idx) => {
      const action = rule.Action ? Object.keys(rule.Action)[0] : 'None';
      const generatedLabels = Array.isArray(rule.RuleLabels) ? rule.RuleLabels.map(l => l.Name) : [];
      return {
        id: idx,
        name: rule.Name || `Rule_${idx}`,
        priority: rule.Priority,
        action,
        generatedLabels,
        dependsOn: [],
        rawRule: { ...rule, id: idx, issues: validationErrors.filter(error => (error.rules || []).includes(idx)).map(err => err.message) },
        width: 0,
        height: 0,
        x: 0,
        y: 0
      };
    });

    // Build dependency links.
    const allLinks = [];
    allNodes.forEach(node => {
      const needed = extractAllLabelKeys(node.rawRule.Statement);
      needed.forEach(labelKey => {
        allNodes.forEach(n => {
          if (n.id !== node.id && n.generatedLabels.includes(labelKey)) {
            node.dependsOn.push(n.id);
            allLinks.push({ source: n.id, target: node.id });
          }
        });
      });
    });

    const lower = searchTerm.trim().toLowerCase();
    const filteredNodes = lower
      ? allNodes.filter(n =>
          n.name.toLowerCase().includes(lower) ||
          n.generatedLabels.join(' ').toLowerCase().includes(lower) ||
          n.dependsOn.join(' ').toLowerCase().includes(lower)
        )
      : allNodes;
    const filteredIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = allLinks.filter(link => filteredIds.has(link.source) && filteredIds.has(link.target));

    // Measure nodes.
    measureNodes(filteredNodes);

    // Layout using Elk.
    (async () => {
      const layoutData = await layoutWithElk(filteredNodes, filteredLinks);
      if (layoutData.children) {
        layoutData.children.forEach(child => {
          const nd = filteredNodes.find(n => n.id === parseInt(child.id, 10));
          if (nd && child.x != null && child.y != null) {
            nd.x = child.x;
            nd.y = child.y;
          }
        });
      }
      if (layoutData.edges) {
        layoutData.edges.forEach((e, i) => {
          const link = filteredLinks[i];
          link.points = [];
          if (e.sections) {
            e.sections.forEach(sec => {
              link.points.push(sec.startPoint);
              if (sec.bendPoints) link.points.push(...sec.bendPoints);
              link.points.push(sec.endPoint);
            });
          }
        });
      }
      // Note: We are not aligning top-level nodes anymore.
      drawGraph(filteredNodes, filteredLinks);
    })();
  }, [darkTheme, searchTerm]);

  function drawGraph(nodes, links) {
    const minWidth = 0; // Set minimum width for nodes
    
    // Ensure every node has at least the minimum width.
    nodes.forEach(n => {
      n.width = Math.max(n.width, minWidth);
    });
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', diagramWidth)
       .attr('height', diagramHeight)
       .style('border', '1px solid #ddd')
       .style('background-color', darkTheme ? '#222' : '#f5f5f5');
  
    const defs = svg.append('defs');
    defs.append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 12)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', darkTheme ? '#bbb' : '#999');
  
    zoomBehaviorRef.current = d3.zoom()
      .scaleExtent([0.1, 2])
      .on('zoom', e => {
        gContainer.attr('transform', e.transform);
      });
    svg.call(zoomBehaviorRef.current);
    const gContainer = svg.append('g');
    const edgesLayer = gContainer.append('g').attr('class', 'edges-layer');
    const nodesLayer = gContainer.append('g').attr('class', 'nodes-layer');
  
    const linkSel = edgesLayer.selectAll('path.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', darkTheme ? '#bbb' : '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('d', d => {
        if (!d.points) {
          const sx = nodes.find(n => n.id === d.source)?.x || 0;
          const sy = nodes.find(n => n.id === d.source)?.y || 0;
          const tx = nodes.find(n => n.id === d.target)?.x || 0;
          const ty = nodes.find(n => n.id === d.target)?.y || 0;
          return d3.line()([[sx, sy], [tx, ty]]);
        }
        const lineGen = d3.line().x(p => p.x).y(p => p.y).curve(d3.curveLinear);
        return lineGen(d.points);
      });
  
    // Create node groups.
    const nodeSel = nodesLayer.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .on('click', (evt, d) => {
        evt.stopPropagation();
        highlightParentsAndChildren(d, { nodeSel, linkSel, darkTheme, links, errorNodeIds });
        setSelectedNode(d);
      });
  
    // Append rectangle to each node (using minimum width).
    nodeSel.append('rect')
      .attr('width', d => Math.max(d.width, minWidth))
      .attr('height', d => d.height)
      .attr('fill', d => getNodeColor(d))
      .attr('stroke', d => errorNodeIds.has(d.id) ? 'red' : (darkTheme ? '#eee' : '#fff'))
      .attr('stroke-width', d => errorNodeIds.has(d.id) ? 4 : 2)
      .attr('rx', 10)
      .attr('ry', 10);
  
    // Append icon texts with pointer-events disabled.
    nodeSel.each(function(d) {
      const group = d3.select(this);
      const icons = [];
      if (errorNodeIds.has(d.id)) icons.push({ symbol: '⚠', fill: 'red' });
      if (ruleInsertsHeader(d.rawRule)) icons.push({ symbol: '📰', fill: 'white' });
      if (d.generatedLabels?.length > 0) icons.push({ symbol: '🏷', fill: 'white' });
      const iconSpacing = 20;
      icons.forEach((icon, i) => {
        group.append('text')
          .attr('x', d.width - 10 - i * iconSpacing)
          .attr('y', 16)
          .attr('fill', icon.fill)
          .style('font-size', '16px')
          .style('pointer-events', 'none')
          .text(icon.symbol);
      });
    });
  
    // Append text labels for each node.
    nodeSel.each(function(d) {
      const group = d3.select(this);
      const marginX = 10;
      let nextY = 16;
      
      // Name, Priority, and Action.
      group.append('text')
        .attr('x', marginX)
        .attr('y', nextY)
        .style('font-size', '12px')
        .attr('fill', '#fff')
        .text(`Name: ${d.name}`);
      nextY += 16;
      group.append('text')
        .attr('x', marginX)
        .attr('y', nextY)
        .style('font-size', '12px')
        .attr('fill', '#fff')
        .text(`Priority: ${d.priority}`);
      nextY += 16;
      group.append('text')
        .attr('x', marginX)
        .attr('y', nextY)
        .style('font-size', '12px')
        .attr('fill', '#fff')
        .text(`Action: ${d.action}`);
      nextY += 16;
    
      // Labels, if any.
      if (d.generatedLabels.length > 0) {
        group.append('text')
          .attr('x', marginX)
          .attr('y', nextY)
          .style('font-size', '12px')
          .attr('fill', '#fff')
          .text(`Labels: ${d.generatedLabels.join(', ')}`);
        nextY += 16;
      }
    
      // "Depends On" section: show all dependency names on one line, comma-separated.
      if (d.dependsOn.length > 0) {
        group.append('text')
          .attr('x', marginX)
          .attr('y', nextY)
          .style('font-size', '12px')
          .attr('fill', '#fff')
          .text(`Depends On:`);
        nextY += 16;
        // Build a comma-separated string of dependency names.
        const dependencyNames = d.dependsOn.map(depId => {
          const depNode = nodes.find(n => n.id === depId);
          return depNode ? depNode.name : depId;
        }).join(', ');
        group.append('text')
          .attr('x', marginX + 10)
          .attr('y', nextY)
          .style('font-size', '12px')
          .attr('fill', 'white')
          .style('cursor', 'pointer')
          .style('text-decoration', 'none')
          // Adjust text length to fit inside the node.
          .attr('textLength', Math.max(d.width, minWidth) - marginX - 10)
          .attr('lengthAdjust', 'spacingAndGlyphs')
          .text(dependencyNames)
          .on('click', function(evt) {
            evt.stopPropagation();
            // Zoom to the first dependency in the list.
            const firstDepId = d.dependsOn[0];
            const depNode = nodes.find(n => n.id === firstDepId);
            if (depNode) {
              zoomToNode(depNode);
            }
          });
        nextY += 16;
      }
    });
    
    setTimeout(() => {
      const gNode = gContainer.node();
      if (gNode) {
        const gBounds = gNode.getBBox();
        const fullWidth = gBounds.width;
        const fullHeight = gBounds.height;
        const midX = gBounds.x + fullWidth / 2;
        const midY = gBounds.y + fullHeight / 2;
        const scale = Math.min(
          diagramWidth / (fullWidth * 1.2),
          diagramHeight / (fullHeight * 1.2),
          2
        );
        const translate = [
          diagramWidth / 2 - scale * midX,
          diagramHeight / 3 - scale * midY
        ];
        svg.transition()
           .duration(750)
           .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      } else {
        console.warn("gContainer.node() returned null. Skipping layout adjustments.");
      }
    }, 0);
  }
  function toggleTheme() {
    setDarkTheme(!darkTheme);
  }

  function closePanel() {
    setSelectedNode(null);
  }

  function getJsonSnippet(obj) {
    const fullStr = JSON.stringify(obj, null, 2);
    return fullStr.length <= 200 ? fullStr : fullStr.slice(0, 200) + ' ...';
  }

  const exportAsPNG = async () => {
    // Export logic here
  };

  const exportAsPDF = async () => {
    // Export logic here
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: darkTheme ? '#121212' : '#f0f0f0',
        color: darkTheme ? '#eeeeee' : '#000000',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        pb: 4,
        px: { xs: 2, md: 4 },
        pt: { xs: 2, md: 4 }
      }}
    >
      {validationErrors.length > 0 && (
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1100 }}>
          <Badge badgeContent={validationErrors.length} color="error">
            <IconButton onClick={() => setShowWarnings(!showWarnings)} color="error">
              <WarningAmberIcon sx={{ fontSize: 64 }} />
            </IconButton>
          </Badge>
        </Box>
      )}

      {showWarnings && (
        <Box
          ref={errorPanelRef}
          sx={{
            position: 'fixed',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1100,
            backgroundColor: darkTheme ? '#333' : '#f9f9f9',
            p: 2,
            borderRadius: 2,
            border: '1px solid #ccc',
            maxWidth: 350,
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <Typography variant="h6" gutterBottom>
            Validation Errors
          </Typography>
          <List>
            {validationErrors.map((err, idx) => (
              <ListItem
                key={idx}
                id={`error-${idx}`}
                button={true}
                onClick={() => {
                  // Optional: highlight node logic
                }}
                sx={{
                  backgroundColor:
                    err.severity === 'strong'
                      ? 'rgba(255, 0, 0, 0.2)'
                      : 'rgba(255, 255, 0, 0.2)',
                  mb: 1
                }}
              >
                <ListItemText primary={`${err.type}: ${err.message}`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 4 },
          mb: 3,
          borderRadius: 2
        }}
      >
        <Typography variant="h4" gutterBottom>
          WAF Explorer
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Use the WAF explorer to view the appsflyer rules tree
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={2} justifyContent="flex-start">
          <Button variant="contained" onClick={toggleTheme}>
            {darkTheme ? 'Light Theme' : 'Dark Theme'}
          </Button>
          <Button variant="outlined" onClick={exportAsPNG}>
            Export as PNG
          </Button>
          <Button variant="outlined" onClick={exportAsPDF}>
            Export as PDF
          </Button>
        </Stack>
      </Paper>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <TextField
          variant="outlined"
          placeholder="Search rules..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <Box sx={{ overflow: 'auto' }}>
        <svg ref={svgRef} />
      </Box>

      {selectedNode && (
        <RuleDetailsPopup 
          rule={selectedNode.rawRule} 
          validationErrors={validationErrors.filter(error => (error.rules || []).includes(selectedNode.id))}
          onClose={closePanel} 
          position={{ x: selectedNode.x, y: selectedNode.y }} 
        />
      )}
      {console.log(validationErrors.filter(error => (error.rules || []).includes(selectedNode?.id)))}
    </Box>
  );
};

export default WAFRuleTree;