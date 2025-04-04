import React, { useEffect, useState, useRef } from 'react';
import { Box } from '@mui/material';
import RuleTransformer from '../tree/RuleTransformer';
import Tree from '../tree/NodeTransformer';
import FlowChart from '../tree/FlowChart';
import TopBar from '../layout/Topbar';
import RulePopup from '../popup/RulePopup';
import RulesLoaderPopup from '../upload/RulesLoaderPopup';
import WarningsPopup from '../popup/WarningsPopup';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// קומפוננטת WAFRuleTree - מנהלת את עץ החוקים, הטעינה, הציור והפופ-אפים
export default function WAFRuleTree({ data, setData }) {

  const [selectedNode, setSelectedNode] = useState(null);
  const [backTo, setBackTo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [aclDetails, setAclDetails] = useState({});
  const [graphData, setGraphData] = useState(null);
  const [popupData, setPopupData] = useState(null);

  const [loaderPopupOpen, setLoaderPopupOpen] = useState(data === null);
  const [rulePopupOpen, setRulePopupOpen] = useState(false);
  const [warningsPopupOpen, setWarningsPopupOpen] = useState(false);

  const flowRef = useRef(null);

  const centerNode = (nodeId) => {
    if (!flowRef.current || !graphData) return;

    const node = graphData.nodes.find(n => n.id == nodeId);
    if (!node) return;

    flowRef.current.setCenter(
      node.position.x + node.data.hw.width / 2,
      node.position.y + node.data.hw.height / 2,
      { duration: 800, zoom: 0.8, smooth: true })
  }

  const exportToPdf = () => {
    const graphElement = document.querySelector('.react-flow');
    if (!graphElement) return;
    html2canvas(graphElement, {
      scale: 8,
      useCORS: true,
      logging: true,
      imageTimeout: 0,
    }).then(canvas => {
      const imageData = canvas.toDataURL('image/jpeg', 1);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      pdf.addImage(imageData, 'JPEG', 0, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save('waf-rules.pdf');
    });
  };

  const exportToImage = () => {
    const graphElement = document.querySelector('.react-flow');
    if (!graphElement) return;
    html2canvas(graphElement, {
      scale: 7,
      useCORS: true,
      logging: true,
      imageTimeout: 0,
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'waf-rules.jpeg';
      link.href = canvas.toDataURL('image/jpeg', 1.0);
      link.click();
    });
  };

  useEffect(() => {
    if (loaderPopupOpen) return;

    const ruleTransformer = new RuleTransformer(data);
    const transformedData = ruleTransformer.transformRules();
    setPopupData(transformedData);

    const nodeTransformer = new Tree();
    const transformedNodes = nodeTransformer.transformNodes(transformedData.nodes);

    setGraphData({
      edges: transformedData.edges,
      nodes: transformedNodes
    });
  }, [data]);


  const handleNodeClick = (node) => {
    if (node === null) {
      setRulePopupOpen(false);
      setSelectedNode(null);
      return;
    }

    setSelectedNode(node);
    setRulePopupOpen(true);
    setWarningsPopupOpen(false);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {graphData && <FlowChart
        allNodes={graphData.nodes}
        allEdges={graphData.edges}
        selectedNode={selectedNode}
        setSelectedNode={handleNodeClick}
        searchTerm={searchTerm}
        ref={flowRef}
      />}
      {/* סרגל כלים עליון */}
      <TopBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setLoaderPopupOpen={setLoaderPopupOpen}
        aclDetails={aclDetails}
        warningCount={popupData ? popupData.globalWarnings.length : 0}
        onExportPdf={exportToPdf}
        onExportImage={exportToImage}
        onWarnings={() => {
          setWarningsPopupOpen(true);
          setRulePopupOpen(false);
        }}
      />
      {/* פופ-אפ טעינת נתונים */}
      {loaderPopupOpen && (
        <RulesLoaderPopup
          open={loaderPopupOpen}
          onRulesReceived={(data) => {
            setData(data.Rules || data);
            setAclDetails({ aclName: data.Name || 'local json', capacity: data.Capacity || 0 });
            setLoaderPopupOpen(false);
          }}
          onClose={() => { setLoaderPopupOpen(false) }}
        />
      )}
      {/* פופ-אפ פרטי חוק */}
      {rulePopupOpen && (
        <RulePopup
          backTo={backTo}
          dataArray={data}
          selectedNode={popupData.nodes[+selectedNode]}
          centerNode={centerNode}
          onClose={() => { setRulePopupOpen(false) }}
          backToWarning={() => {
            setWarningsPopupOpen(true);
            setRulePopupOpen(false);
            setBackTo(null);
          }}
        />
      )}
      {/* פופ-אפ אזהרות גלובליות */}
      {warningsPopupOpen && (
        <WarningsPopup
          warnings={popupData ? popupData.globalWarnings : []}
          onClose={() => { setWarningsPopupOpen(false) }}
          onSelectNode={(node) => {
            handleNodeClick(node)
            setBackTo(true)
          }}
        />
      )}
    </Box>
  );
}