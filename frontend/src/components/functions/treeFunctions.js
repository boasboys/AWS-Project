import * as d3 from 'd3';

export function measureNodes(nodes) {
    const measureSvg = d3.select('body')
      .append('svg')
      .attr('width', 0)
      .attr('height', 0)
      .style('position', 'absolute')
      .style('left', '-9999px');

    nodes.forEach(node => {
      const group = measureSvg.append('g');
      const lines = [];
      lines.push(`Name: ${node.name}`);
      lines.push(`Priority: ${node.priority}`);
      lines.push(`Action: ${node.action}`);
      if (node.generatedLabels.length > 0) {
        lines.push(`Labels: ${node.generatedLabels.join(', ')}`);
      }
      if (node.dependsOn.length > 0) {
        lines.push(`Depends On: ${node.dependsOn.join(', ')}`);
      }
      let yPos = 0;
      lines.forEach(textLine => {
        group.append('text')
          .attr('x', 0)
          .attr('y', yPos)
          .style('font-size', '12px')
          .text(textLine);
        yPos += 16;
      });
      const bbox = group.node().getBBox();
      const padX = 20;
      const padY = 20;
      node.width = Math.max(bbox.width + padX, 60);
      node.height = Math.max(bbox.height + padY, 40);
      group.remove();
    });
    measureSvg.remove();
  }
  export function drawGraph(nodes, links) {
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
  
      zoomBehaviorRef.current = d3.zoom().scaleExtent([0.1, 2]).on('zoom', e => {
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
    }
    export function getNodeColor(d) {
        if (d.action === 'Block') return '#8B0000';
        if (d.action === 'Count') return '#1060A5';
        if (d.dependsOn.length > 0) return '#8B7500';
        return '#2F4F4F';
      }
  
      export function highlightParentsAndChildren(node, { nodeSel, linkSel, darkTheme, links }) {
        nodeSel.select('rect')
  .attr('stroke', darkTheme ? '#eee' : '#fff')
  .attr('stroke-width', 2);
        linkSel.attr('stroke', darkTheme ? '#bbb' : '#999').attr('stroke-width', 2);
        nodeSel.filter(d => d.id === node.id)
               .select('rect')
               .attr('stroke', '#FFD700')
               .attr('stroke-width', 4);
        const parents = new Set();
        const children = new Set();
        links.forEach(l => {
          if (l.target === node.id) parents.add(l.source);
          if (l.source === node.id) children.add(l.target);
        });
        nodeSel.filter(d => parents.has(d.id) || children.has(d.id))
               .select('rect')
               .attr('stroke', '#FFD700')
               .attr('stroke-width', 4);
        linkSel.filter(l => (l.target === node.id && parents.has(l.source)) || (l.source === node.id && children.has(l.target)))
               .attr('stroke', '#FFD700')
               .attr('stroke-width', 4);
      }
