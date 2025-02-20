``import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import './WafDiagram.css';

const WafDiagram = () => {
  const cyRef = useRef(null);
  const cyInstanceRef = useRef(null);
  const modalRef = useRef(null);
  const modalBodyRef = useRef(null);
  const modalCloseRef = useRef(null);

  useEffect(() => {
    // ---------------------------------------------------
    // Define 7 ACL Customized Rules (simplified) from JSON
    // ---------------------------------------------------
    const rules = [
      // Level 1: Basic Path Rules
      {
        id: "PathRule1",
        label: "Matches /api/admin/",
        action: "Count", // Action from JSON (Count)
        level: 1
      },
      {
        id: "PathRule2",
        label: "Matches /api/users/",
        action: "Count", // Action from JSON (Count)
        level: 1
      },
      // Level 2: Rate Limits
      {
        id: "AdminRateLimit",
        label: "Rate limit admin requests",
        action: "Block", // Action.Block from JSON
        level: 2,
        dependsOn: ["PathRule1"] // uses label "admin_path"
      },
      {
        id: "UserRateLimit",
        label: "Rate limit user requests",
        action: "Block", // Action.Block from JSON
        level: 2,
        dependsOn: ["PathRule2"] // uses label "user_path"
      },
      // Level 3: Advanced Blocking Decisions
      {
        id: "BlockRateLimitedUsers",
        label: "Block rate-limited users",
        action: "Block", // Action.Block from JSON
        level: 3,
        dependsOn: ["AdminRateLimit", "UserRateLimit"]
      },
      {
        id: "HighRiskAccess",
        label: "Block high-risk access (RU, CN, KP)",
        action: "Block", // Action.Block from JSON
        level: 3,
        dependsOn: ["PathRule1"] // uses admin_path
      },
      // Level 4: Logging Rule
      {
        id: "LogBlocked",
        label: "Log blocked requests (insert X-Block-Reason)",
        action: "Count", // Action.Count from JSON (with custom handling)
        level: 4,
        dependsOn: ["BlockRateLimitedUsers", "HighRiskAccess"]
      }
    ];

    // ---------------------------------------------------
    // Final Outcome Nodes (Level 5)
    // ---------------------------------------------------
    const finalBlock = { 
      id: "FINAL_BLOCK", 
      label: "⛔ FINAL BLOCK ⛔", 
      action: "Block", 
      level: 5 
    };
    const finalPass  = { 
      id: "FINAL_PASS", 
      label: "✅ FINAL PASS ✅", 
      action: "Pass", 
      level: 5 
    };

    // ---------------------------------------------------
    // Group rules (and final outcomes) by level.
    // ---------------------------------------------------
    const levels = {};
    [...rules, finalBlock, finalPass].forEach(rule => {
      if (!levels[rule.level]) levels[rule.level] = [];
      levels[rule.level].push(rule);
    });

    // ---------------------------------------------------
    // Compute positions manually (preset layout)
    // ---------------------------------------------------
    const horizontalSpacing = 220; // space between nodes horizontally
    const verticalSpacing = 180;   // space between levels
    const offsetX = 100;           // left offset
    const offsetY = 100;           // top offset
    const cyNodes = [];

    Object.keys(levels).forEach(lvl => {
      const levelNum = parseInt(lvl, 10);
      const nodesInLevel = levels[lvl];
      nodesInLevel.forEach((node, i) => {
        const x = offsetX + i * horizontalSpacing;
        const y = offsetY + (levelNum - 1) * verticalSpacing;
        node.position = { x, y };
        cyNodes.push({
          data: {
            id: node.id,
            label: `${node.id}: ${node.label} (${node.action})`,
            action: node.action
          },
          position: { x, y }
        });
      });
    });

    // ---------------------------------------------------
    // Build edges based on dependencies.
    // ---------------------------------------------------
    const cyEdges = [];
    rules.forEach(rule => {
      if (rule.dependsOn) {
        rule.dependsOn.forEach(depId => {
          cyEdges.push({ data: { source: depId, target: rule.id } });
        });
      }
    });
    // Connect final outcome nodes:
    // Let FINAL_BLOCK be triggered by BlockRateLimitedUsers (Level 3)
    // Let FINAL_PASS be triggered by LogBlocked (Level 4)
    cyEdges.push({ data: { source: "BlockRateLimitedUsers", target: finalBlock.id, direct: true } });
    cyEdges.push({ data: { source: "LogBlocked", target: finalPass.id, direct: true } });

    // ---------------------------------------------------
    // Initialize Cytoscape with "preset" layout.
    // ---------------------------------------------------
    const cy = cytoscape({
      container: cyRef.current,
      elements: { nodes: cyNodes, edges: cyEdges },
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '110px',
            'width': '100px',
            'height': '40px',
            'border-color': '#888',
            'border-width': 2,
            'font-size': '10px',
            'shape': 'round-rectangle'
          }
        },
        { selector: 'node[action="Label"]', style: { 'background-color': '#f8bbd0' } },
        { selector: 'node[action="Count"]', style: { 'background-color': '#dcedc8' } },
        { selector: 'node[action="Block"]', style: { 'background-color': '#ff6b6b' } },
        { selector: 'node[action="Pass"]',  style: { 'background-color': '#00aa44' } },
        {
          selector: '#FINAL_BLOCK',
          style: {
            'background-color': '#cc0000',
            'border-color': '#990000',
            'font-weight': 'bold',
            'width': '70px',
            'height': '70px'
          }
        },
        {
          selector: '#FINAL_PASS',
          style: {
            'background-color': '#00aa44',
            'border-color': '#008833',
            'font-weight': 'bold',
            'width': '70px',
            'height': '70px'
          }
        },
        {
          selector: 'edge[direct]',
          style: {
            'line-color': '#ff0000',
            'width': 3,
            'target-arrow-color': '#ff0000',
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#555',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#555',
            'curve-style': 'bezier'
          }
        }
      ],
      layout: { name: 'preset' }
    });

    cyInstanceRef.current = cy;
    cy.fit(undefined, 50);
    cy.center();

    // ---------------------------------------------------
    // Modal Popup Logic (Card-Inspired)
    // ---------------------------------------------------
    const modal = modalRef.current;
    const modalBody = modalBodyRef.current;
    const closeModal = () => { modal.style.display = "none"; };

    cy.on("tap", "node", (evt) => {
      const data = evt.target.data();
      modalBody.innerHTML = `
        <div class="modal-card">
          <div class="modal-card-header">
            <h3>${data.id}</h3>
            <span class="modal-close">&times;</span>
          </div>
          <div class="modal-card-body">
            <p><strong>Type:</strong> ${data.action}</p>
            <p><strong>Details:</strong></p>
            <pre>${data.label}</pre>
          </div>
        </div>
      `;
      modal.style.display = "block";
      const closeButton = modal.querySelector(".modal-close");
      if (closeButton) closeButton.onclick = closeModal;
    });

    window.onclick = (event) => { if (event.target === modal) closeModal(); };

  }, []);

  return (
    <div className="diagram-wrapper">
      <header>
        <h1>ACL Customized Rules</h1>
      </header>

      <div id="legend">
        <strong>Legend:</strong>
        <span style={{ backgroundColor: "#f8bbd0" }}>Label</span>
        <span style={{ backgroundColor: "#dcedc8" }}>Count</span>
        <span style={{ backgroundColor: "#ff6b6b" }}>Block</span>
        <span style={{ backgroundColor: "#cc0000" }}>FINAL BLOCK</span>
        <span style={{ backgroundColor: "#00aa44" }}>FINAL PASS</span>
      </div>

      <div id="controls">
        <button onClick={() => { cyInstanceRef.current.fit(undefined, 50); cyInstanceRef.current.center(); }}>
          Reset View
        </button>
      </div>

      <div className="cy-container">
        <div id="cy" ref={cyRef}></div>
      </div>

      <div id="popup" className="modal" ref={modalRef}>
        <div className="modal-content">
          <span className="close" ref={modalCloseRef}>&times;</span>
          <div id="modal-body" ref={modalBodyRef}></div>
        </div>
      </div>
    </div>
  );
};

export default WafDiagram;