import React, { useState, useCallback, useMemo, useEffect, forwardRef } from 'react';
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    Controls,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from './CustomNode';
import { useThemeContext } from '../../context/ThemeContext';

const nodeTypes = {
    'custom-node': CustomNode,
};
const FlowChart = forwardRef(({ allNodes, allEdges, selectedNode, setSelectedNode, searchTerm }, ref) => {
    const [nodes, setNodes] = useNodesState(allNodes || []);
    const [edges, setEdges] = useEdgesState(allEdges || []);
    const [highlightedEdges, setHighlightedEdges] = useState(new Set());
    const [blurredNodes, setBlurredNodes] = useState(new Set());
    const [doubleClickedNode, setDoubleClickedNode] = useState(null);
    const { getColor } = useThemeContext();
    const memorizedNodeTypes = useMemo(() => nodeTypes, []);


    useEffect(() => {
        setNodes(allNodes);
        setEdges(allEdges);
    }, [allNodes, allEdges]);

    useEffect(() => {
        if (searchTerm === '') {
            setBlurredNodes(new Set());
            return;
        }

        const nodesToBlur = new Set();

        allNodes.forEach(node => {
            const nodeData = JSON.stringify(node.data).toLowerCase();
            if (!nodeData.includes(searchTerm.toLowerCase())) {
                nodesToBlur.add(node.id);
            }
        });

        setBlurredNodes(nodesToBlur);
    }, [searchTerm, allNodes]);

    const connectedNode = (id) => {
        const connectedEdges = edges.filter(edge =>
            edge.source === id || edge.target === id
        );
        setHighlightedEdges(new Set(connectedEdges.map(edge => edge.id)));
    }

    const onNodeMouseEnter = useCallback((event, node) => {
        if (!selectedNode && !doubleClickedNode) {
            connectedNode(node.id)
        }
    }, [edges, selectedNode, doubleClickedNode]);

    const onNodeMouseLeave = useCallback(() => {
        if (!selectedNode && !doubleClickedNode) {
            setHighlightedEdges(new Set());
        }
    }, [selectedNode, doubleClickedNode]);


    const onNodeClick = useCallback((event, node) => {
        if (selectedNode === node.id) {
            setSelectedNode(null);
            setHighlightedEdges(new Set());
            return;
        }

        connectedNode(node.id)
        setSelectedNode(node.id);
    }, [edges, selectedNode]);

    const findUpwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);

        edges.filter(edge => edge.target === nodeId)
            .forEach(edge => {
                findUpwardDependencies(edge.source, visited);
            });

        return visited;
    }, [edges]);

    const findDownwardDependencies = useCallback((nodeId, visited = new Set()) => {
        if (visited.has(nodeId)) return visited;
        visited.add(nodeId);

        edges.filter(edge => edge.source === nodeId)
            .forEach(edge => {
                findDownwardDependencies(edge.target, visited);
            });

        return visited;
    }, [edges]);

    const onNodeDoubleClick = useCallback((event, node) => {
        if (doubleClickedNode === node.id) {
            setDoubleClickedNode(null);
            setBlurredNodes(new Set());
            setHighlightedEdges(new Set());
        } else {
            const upwardNodes = findUpwardDependencies(node.id);
            const downwardNodes = findDownwardDependencies(node.id);
            const relatedNodes = new Set([...upwardNodes, ...downwardNodes, node.id]);

            const blurredNodeIds = new Set(
                nodes.map(n => n.id).filter(id => !relatedNodes.has(id))
            );

            const relatedEdges = edges.filter(edge => {
                const isUpwardEdge = edge.target === node.id && upwardNodes.has(edge.source);
                const isDownwardEdge = edge.source === node.id && downwardNodes.has(edge.target);

                const isParentToParentEdge = upwardNodes.has(edge.source) &&
                    upwardNodes.has(edge.target) &&
                    findUpwardDependencies(edge.target).has(edge.source);

                const isChildToChildEdge = downwardNodes.has(edge.source) &&
                    downwardNodes.has(edge.target) &&
                    findDownwardDependencies(edge.source).has(edge.target);

                return isUpwardEdge || isDownwardEdge || isParentToParentEdge || isChildToChildEdge;
            });

            setDoubleClickedNode(node.id);
            setBlurredNodes(blurredNodeIds);
            setHighlightedEdges(new Set(relatedEdges.map(edge => edge.id)));
        }

        setSelectedNode(node.id);
    }, [nodes, edges, doubleClickedNode, findUpwardDependencies, findDownwardDependencies, setSelectedNode]);

    const onInit = useCallback((instance) => {
        if (ref) {
            ref.current = instance;
        }
    }, []);

    // Update node styles
    const nodesWithStyles = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            style: {
                ...node.style,
                opacity: blurredNodes.has(node.id) ? 0.2 : 1,
                transition: 'all 0.3s ease-in-out',
                borderRadius: '10px',
                boxShadow: node.id === selectedNode ? '0 0 0 4px yellow' : 'none',
            }
        }));
    }, [nodes, blurredNodes, selectedNode]);

    const edgesWithStyles = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            type: 'straight',
            style: {
                stroke: highlightedEdges.has(edge.id) ? getColor('edges') : '#888',
                strokeWidth: highlightedEdges.has(edge.id) ? 3 : 0,
                transition: 'all 0.2s ease-in-out',
            },
            markerEnd: highlightedEdges.has(edge.id) ? {
                type: 'arrowclosed',
                width: 20,
                height: 20,
                color: getColor('edges'),
            } : null,
        }));
    }, [edges, highlightedEdges, getColor]);

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: getColor('background') }}>
            <ReactFlow
                nodes={nodesWithStyles}
                edges={edgesWithStyles}
                nodeTypes={memorizedNodeTypes}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                ref={ref}
                onInit={onInit}
                fitView
                fitViewOptions={{
                    padding: 0.23,
                    includeHiddenNodes: true,
                    minZoom: 0.06,
                    maxZoom: 2,
                    duration: 800,
                    easing: (t) => t * (2 - t)
                }}
                zoomOnScroll={true}
                minZoom={0.06}
                maxZoom={2}
                defaultzoom={0.6}
                zoomstep={0.1}
                panOnDrag={true}
            >
                <Controls fitViewOptions={{ duration: 800, easing: (t) => t * (2 - t) }} />
            </ReactFlow>
        </div>
    );
});
export default FlowChart;