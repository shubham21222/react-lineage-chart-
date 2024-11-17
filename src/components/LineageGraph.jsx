import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import Draggable from 'react-draggable';
import { buildLineageGraph } from '../utils/lineageParser';

// Enhanced color configurations
const GROUP_COLORS = {
  primary: [
    {
      group: 'bg-blue-100',
      node: 'bg-blue-50',
      border: 'border-blue-300',
      hoverBorder: 'border-blue-500',
      line: '#3b82f6',
      hoverBg: 'hover:bg-blue-200'
    },
    {
      group: 'bg-green-100',
      node: 'bg-green-50',
      border: 'border-green-300',
      hoverBorder: 'border-green-500',
      line: '#22c55e',
      hoverBg: 'hover:bg-green-200'
    },
    {
      group: 'bg-purple-100',
      node: 'bg-purple-50',
      border: 'border-purple-300',
      hoverBorder: 'border-purple-500',
      line: '#a855f7',
      hoverBg: 'hover:bg-purple-200'
    },
    {
      group: 'bg-amber-100',
      node: 'bg-amber-50',
      border: 'border-amber-300',
      hoverBorder: 'border-amber-500',
      line: '#f59e0b',
      hoverBg: 'hover:bg-amber-200'
    },
    {
      group: 'bg-rose-100',
      node: 'bg-rose-50',
      border: 'border-rose-300',
      hoverBorder: 'border-rose-500',
      line: '#f43f5e',
      hoverBg: 'hover:bg-rose-200'
    }
  ]
};

// Memoized Node Component
const Node = React.memo(({ node, position, colorSet, isHovered, isSelected, onHover, onSelect }) => {
  return (
    <Draggable defaultPosition={position} bounds="parent">
      <div
        id={node.id}
        className={`absolute p-4 rounded-md shadow-sm border transition-all duration-200 
          ${colorSet.node} mt-20
          ${isHovered || isSelected ? `border-2 ${colorSet.hoverBorder} shadow-md` : `${colorSet.border}`}
        `}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(node.id)}
        style={{
          width: '150px',
          minHeight: '80px',
          zIndex: 10,
          wordWrap: 'break-word',
        }}
      >
        <div
          className="text-sm text-center font-medium text-gray-700"
          style={{
            fontSize: '14px',
            lineHeight: '1.2em',
          }}
        >
          {node.data.label}
        </div>
      </div>
    </Draggable>
  );
});

// Memoized Group Component
const Group = React.memo(({ componentType, groupNodes, isCollapsed, colorSet, index, hoveredNode, selectedNode, onHover, onSelect, onToggle, getNodePosition }) => {
  return (
    <div
      className={`relative flex-none rounded-lg border ${colorSet.group} ${colorSet.border} shadow-sm transition-all duration-200 ${colorSet.hoverBg}`}
      style={{
        width: '250px',
        minHeight: isCollapsed ? 'auto' : '200px',
        zIndex: 20
      }}
    >
      <div
        className={`flex items-center justify-between p-3 border-b cursor-pointer ${colorSet.border}`}
        onClick={() => onToggle(componentType)}
      >
        <span className="font-medium text-gray-700">{componentType}</span>
        <button className={`p-1 rounded-full hover:bg-white/50 transition-colors ${colorSet.border}`}>
          {isCollapsed ? '⌄' : '⌃'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="relative p-3" style={{ minHeight: '200px' }}>
          {groupNodes.map((node, nodeIndex) => (
            <Node
              key={node.id}
              node={node}
              position={getNodePosition(node.id, index, nodeIndex, !isCollapsed)}
              colorSet={colorSet}
              isHovered={hoveredNode === node.id}
              isSelected={selectedNode === node.id}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

const LineageGraph = ({ data }) => {
  const containerRef = useRef();
  const graphData = useMemo(() => buildLineageGraph(data), [data]);

  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [connectedNodes, setConnectedNodes] = useState(new Set());

  // ... (keep existing state and memoized values)

  // Enhanced function to find connected nodes
  const findConnectedNodes = useCallback((nodeId) => {
    if (!nodeId) return new Set();
    
    const connected = new Set();
    graphData.edges.forEach(edge => {
      if (edge.source === nodeId) {
        connected.add(edge.target);
      }
      if (edge.target === nodeId) {
        connected.add(edge.source);
      }
    });
    return connected;
  }, [graphData.edges]);

  // Enhanced hover handler
  const handleHover = useCallback((nodeId) => {
    setHoveredNode(nodeId);
    setConnectedNodes(findConnectedNodes(nodeId));
  }, [findConnectedNodes]);

  const initialCollapsedState = useMemo(() => {
    const state = {};
    Object.keys(graphData.groupedNodes).forEach((componentType) => {
      state[componentType] = true;
    });
    return state;
  }, [graphData.groupedNodes]);

  const [collapsedGroups, setCollapsedGroups] = useState(initialCollapsedState);

  const containerDimensions = useMemo(() => ({ width: 1200, height: "100vh" }), []);

  // Create a map of valid node IDs
  const validNodeIds = useMemo(() => {
    const nodeIds = new Set();
    Object.values(graphData.groupedNodes).forEach(nodes => {
      nodes.forEach(node => nodeIds.add(node.id));
    });
    return nodeIds;
  }, [graphData.groupedNodes]);

  // Create node to group mapping
  const nodeGroupMap = useMemo(() => {
    const groupMap = {};
    Object.keys(graphData.groupedNodes).forEach((componentType, groupIndex) => {
      graphData.groupedNodes[componentType].forEach((node) => {
        groupMap[node.id] = groupIndex;
      });
    });
    return groupMap;
  }, [graphData.groupedNodes]);

  // Node position calculation
  const getNodePosition = useCallback((nodeId, groupIndex, nodeIndex, isExpanded) => {
    const baseX = 50 + groupIndex * 400;
    const baseY = isExpanded ? 180 : 100;
    const col = nodeIndex % 2;
    const row = Math.floor(nodeIndex / 2);
    const additionalOffsetY = 140;

    return {
      x: baseX + col * 160,
      y: baseY + row * 120 + additionalOffsetY
    };
  }, []);

  // Enhanced visibleEdges calculation with validation
  const visibleEdges = useMemo(() => {
    return graphData.edges.filter((edge) => {
      // Existing validation checks
      const sourceExists = validNodeIds.has(edge.source);
      const targetExists = validNodeIds.has(edge.target);

      const sourceGroup = Object.keys(graphData.groupedNodes).find(group => 
        graphData.groupedNodes[group].some(node => node.id === edge.source)
      );
      const targetGroup = Object.keys(graphData.groupedNodes).find(group => 
        graphData.groupedNodes[group].some(node => node.id === edge.target)
      );

      const groupsVisible = sourceGroup && targetGroup && !(
        collapsedGroups[sourceGroup] ||
        collapsedGroups[targetGroup]
      );

      const domElementsExist = 
        document.getElementById(edge.source) &&
        document.getElementById(edge.target);

      // Enhanced visibility check for hover effects
      const isRelatedToHover = !hoveredNode || 
        edge.source === hoveredNode || 
        edge.target === hoveredNode;

      return sourceExists && targetExists && groupsVisible && domElementsExist && isRelatedToHover;
    });
  }, [graphData.edges, graphData.groupedNodes, collapsedGroups, validNodeIds, hoveredNode]);

  const toggleGroupCollapse = useCallback((group) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group]
    }));
  }, []);



  const handleSelect = useCallback((nodeId) => {
    setSelectedNode((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [graphData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-gray-50 rounded-lg shadow-inner"
      style={{
        width: '100%',
        height: '600px',
        minWidth: containerDimensions.width,
        minHeight: containerDimensions.height
      }}
    >
      <Xwrapper>
        <div className="flex gap-4 p-8">
          {Object.keys(graphData.groupedNodes).map((componentType, index) => {
            const colorSet = GROUP_COLORS.primary[index % GROUP_COLORS.primary.length];

            return (
              <Group
                key={componentType}
                componentType={componentType}
                groupNodes={graphData.groupedNodes[componentType]}
                isCollapsed={collapsedGroups[componentType]}
                colorSet={colorSet}
                index={index}
                hoveredNode={hoveredNode}
                selectedNode={selectedNode}
                onHover={handleHover}
                onSelect={handleSelect}
                onToggle={toggleGroupCollapse}
                getNodePosition={getNodePosition}
              />
            );
          })}
        </div>

        {visibleEdges.map((edge) => {
          const sourceGroupIndex = nodeGroupMap[edge.source];
          const colorSet = GROUP_COLORS.primary[sourceGroupIndex % GROUP_COLORS.primary.length];

          return (
            <Xarrow
              key={edge.id}
              start={edge.source}
              end={edge.target}
              color={colorSet.line}
              strokeWidth={3}
              path="grid"
              gridBreak={20}
              curveness={0.2}
              dashness={sourceGroupIndex !== nodeGroupMap[edge.target] ? { strokeLen: 8, nonStrokeLen: 6, animation: -2 } : false}
              headSize={4}
              zIndex={0}
            />
          );
        })}
      </Xwrapper>
    </div>
  );
};

export default React.memo(LineageGraph);