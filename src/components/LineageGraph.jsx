import React, { useEffect, useRef, useState } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import Draggable from 'react-draggable';
import { buildLineageGraph } from '../utils/lineageParser';

const LineageGraph = ({ data }) => {
  const containerRef = useRef();
  const nodesRef = useRef({});
  const [graphData, setGraphData] = useState(() => buildLineageGraph(data));
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [containerDimensions, setContainerDimensions] = useState({ width: 2000, height: 2000 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const { nodes, edges } = graphData;

  useEffect(() => {
    const calculateLayout = () => {
      const spacingX = 250;
      const spacingY = 250;
      const nodesPerRow = Math.ceil(Math.sqrt(nodes.length));

      const totalCols = Math.ceil(nodes.length / Math.ceil(nodes.length / nodesPerRow));
      const totalRows = Math.ceil(nodes.length / nodesPerRow);

      const requiredWidth = (totalCols + 1) * spacingX;
      const requiredHeight = (totalRows + 1) * spacingY;

      const minWidth = Math.max(2000, requiredWidth);
      const minHeight = Math.max(2000, requiredHeight);

      setContainerDimensions({ width: minWidth, height: minHeight });

      const startX = (minWidth - (totalCols - 1) * spacingX) / 2;
      const startY = (minHeight - (totalRows - 1) * spacingY) / 2;

      nodes.forEach((node, index) => {
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;

        nodesRef.current[node.id] = {
          x: startX + (col * spacingX),
          y: startY + (row * spacingY),
        };
      });
    };

    calculateLayout();
    setLoading(false);
  }, [nodes]);

  // Function to get connected nodes
  const getConnectedNodes = (nodeId) => {
    const incoming = edges.filter(edge => edge.target === nodeId).map(edge => edge.source);
    const outgoing = edges.filter(edge => edge.source === nodeId).map(edge => edge.target);
    return { incoming, outgoing };
  };

  // Function to get node connection count
  const getNodeConnectionCount = (nodeId) => {
    const connections = getConnectedNodes(nodeId);
    return connections.incoming.length + connections.outgoing.length;
  };

  const toggleCollapseNode = (nodeId) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  const deleteNode = (nodeId) => {
    setGraphData(prev => {
      const updatedNodes = prev.nodes.filter(node => node.id !== nodeId);
      const updatedEdges = prev.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      );
      return { nodes: updatedNodes, edges: updatedEdges };
    });
    setSelectedNode(null);
  };

  // Function to get arrow color based on connection type
  const getArrowColor = (edge) => {
    if (hoveredNode) {
      if (edge.source === hoveredNode) return '#22c55e'; // Outgoing
      if (edge.target === hoveredNode) return '#3b82f6'; // Incoming
    }
    if (selectedNode) {
      if (edge.source === selectedNode) return '#22c55e';
      if (edge.target === selectedNode) return '#3b82f6';
    }
    return '#94a3b8'; // Default color
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-2xl font-bold text-blue-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-auto bg-slate-50">
      <div className="fixed top-4 right-4 z-20 bg-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Incoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Outgoing</span>
          </div>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="relative"
        style={{
          width: containerDimensions.width,
          height: containerDimensions.height,
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        <Xwrapper>
          {nodes.map((node) => {
            const connectionCount = getNodeConnectionCount(node.id);
            const isHighlighted = hoveredNode === node.id || selectedNode === node.id;
            const { incoming, outgoing } = getConnectedNodes(node.id);
            
            return (
              <Draggable
                key={node.id}
                defaultPosition={nodesRef.current[node.id]}
                onStop={(e, data) => {
                  nodesRef.current[node.id] = { x: data.x, y: data.y };
                }}
                bounds="parent"
              >
                <div
                  id={node.id}
                  className={`absolute flex flex-col items-center justify-center transition-transform duration-200 ${
                    isHighlighted ? 'scale-110' : ''
                  }`}
                  style={{
                    width: '160px',
                    height: '160px',
                    zIndex: isHighlighted ? 20 : 10,
                  }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                >
                  <div 
                    className={`w-full h-full relative rounded-lg shadow-lg flex flex-col items-center justify-center p-3 transition-colors duration-200 ${
                      isHighlighted ? 'bg-emerald-500' : 'bg-emerald-400'
                    }`}
                  >
                    <div className="absolute -top-2 -right-2 bg-slate-700 text-white text-xs px-2 py-1 rounded-full">
                      {connectionCount} links
                    </div>
                    <div 
                      className="text-white font-bold text-center break-words w-full mb-3"
                      style={{ 
                        zIndex: 11,
                        wordWrap: 'break-word',
                        maxHeight: '4em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '1rem',
                      }}
                    >
                      {node.data.label}
                    </div>
                    {isHighlighted && (
                      <div className="text-white text-xs mb-2">
                        In: {incoming.length} • Out: {outgoing.length}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 mt-auto w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapseNode(node.id);
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors w-full"
                      >
                        {collapsedNodes[node.id] ? 'Expand' : 'Collapse'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNode(node.id);
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors w-full"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </Draggable>
            );
          })}

          {edges.map((edge) => {
            const isSourceCollapsed = collapsedNodes[edge.source];
            const isTargetCollapsed = collapsedNodes[edge.target];
            if (isSourceCollapsed || isTargetCollapsed) return null;

            const isHighlighted = hoveredNode === edge.source || 
                                hoveredNode === edge.target ||
                                selectedNode === edge.source ||
                                selectedNode === edge.target;

            return (
              <Xarrow
                key={edge.id}
                start={edge.source}
                end={edge.target}
                color={getArrowColor(edge)}
                strokeWidth={isHighlighted ? 3 : 2}
                headSize={8}
                zIndex={isHighlighted ? 15 : 5}
                path="smooth"
                showHead={true}
                curveness={0.3}
                dashness={isHighlighted ? false : { strokeLen: 10, nonStrokeLen: 10, animation: -2 }}
              />
            );
          })}
        </Xwrapper>
      </div>
    </div>
  );
};

export default LineageGraph;