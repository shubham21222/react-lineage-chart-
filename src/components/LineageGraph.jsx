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
const CONTAINER_DIMENSIONS = { width: 1200, height: "100vh" };

const Y_POSITIONS = [150, 250, 500, 750, 1000, 1250, 1500, 1700, 2000, 2200];

// Optimize Node component with proper memoization
const Node = React.memo(({ node, position, colorSet, isHovered, isSelected, onHover, onSelect }) => {
  // Memoize handlers to prevent recreating functions on every render
  const handleMouseEnter = useCallback(() => onHover(node.id), [node.id, onHover]);
  const handleMouseLeave = useCallback(() => onHover(null), [onHover]);
  const handleClick = useCallback(() => onSelect(node.id), [node.id, onSelect]);

  return (
    <Draggable defaultPosition={position} bounds="parent">
      <div
        id={node.id}
        className={`absolute p-3 rounded-md shadow-sm border transition-all duration-200 
          ${colorSet.node}
          ${isHovered || isSelected ? `border-2 ${colorSet.hoverBorder} shadow-md` : colorSet.border}
        `}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          width: '120px',
          minHeight: '60px',
          zIndex: 10,
          wordWrap: 'break-word',
        }}
      >
        <div className="text-xs text-center font-medium text-gray-700" style={{ fontSize: '12px', lineHeight: '1.2em' }}>
          {node.data.label}
        </div>
      </div>
    </Draggable>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for more precise memoization
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.colorSet === nextProps.colorSet
  );
});

// Optimize Group component
const Group = React.memo(({ 
  componentType, 
  groupNodes, 
  isCollapsed, 
  colorSet, 
  index, 
  hoveredNode, 
  selectedNode, 
  onHover, 
  onSelect, 
  onToggle, 
  getNodePosition 
}) => {
  const handleToggle = useCallback(() => onToggle(componentType), [componentType, onToggle]);

  return (
    <div
      className={`relative rounded-lg border ${colorSet.group} ${colorSet.border} shadow-sm transition-all duration-200`}
      style={{
        width: '200px',
        minHeight: isCollapsed ? 'auto' : '150px',
        zIndex: 20
      }}
    >
      <div
        className={`flex items-center justify-between p-2 border-b cursor-pointer ${colorSet.border}`}
        onClick={handleToggle}
      >
        <span className="text-sm font-medium text-gray-700">{componentType}</span>
        <button className="text-xs p-1 rounded-full hover:bg-white/50">
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="relative p-2" style={{ minHeight: '100px' }}>
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

// Optimize Edge rendering with a separate component
const Edge = React.memo(({ edge, colorSet, nodeGroupMap }) => {
  return (
    <Xarrow
      start={edge.source}
      end={edge.target}
      color={colorSet.line}
      strokeWidth={3}
      path="grid"
      gridBreak={20}
      curveness={0.2}
      dashness={nodeGroupMap[edge.source] !== nodeGroupMap[edge.target] ? { strokeLen: 8, nonStrokeLen: 6, animation: -2 } : false}
      headSize={4}
      zIndex={0}
    />
  );
});

const LineageGraph = ({ data }) => {
  const containerRef = useRef();
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [connectedNodes, setConnectedNodes] = useState(new Set());

  // Memoize graph data processing
  const graphData = useMemo(() => buildLineageGraph(data), [data]);

  // Memoize node group mapping
  const nodeGroupMap = useMemo(() => {
    const groupMap = {};
    Object.keys(graphData.groupedNodes).forEach((componentType, groupIndex) => {
      graphData.groupedNodes[componentType].forEach((node) => {
        groupMap[node.id] = groupIndex;
      });
    });
    return groupMap;
  }, [graphData.groupedNodes]);

  // Memoize valid node IDs
  const validNodeIds = useMemo(() => {
    const nodeIds = new Set();
    Object.values(graphData.groupedNodes).forEach(nodes => {
      nodes.forEach(node => nodeIds.add(node.id));
    });
    return nodeIds;
  }, [graphData.groupedNodes]);

  // Initialize collapsed state only once
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const state = {};
    Object.keys(graphData.groupedNodes).forEach((componentType) => {
      state[componentType] = true;
    });
    return state;
  });

  const getNodePosition = useCallback((nodeId, groupIndex, nodeIndex) => {
    const col = nodeIndex % 1;
    const row = Math.floor(nodeIndex / 1);
    return {
      x: col * 120,
      y: Y_POSITIONS[groupIndex] + row * 120
    };
  }, []);

  const findConnectedNodes = useCallback((nodeId) => {
    if (!nodeId) return new Set();
    const connected = new Set();
    graphData.edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return connected;
  }, [graphData.edges]);

  // Optimize visible edges calculation
  const visibleEdges = useMemo(() => {
    if (typeof window === 'undefined') return [];
    return graphData.edges.filter(edge => {
      const sourceExists = validNodeIds.has(edge.source);
      const targetExists = validNodeIds.has(edge.target);
      const sourceGroup = Object.keys(graphData.groupedNodes).find(group => 
        graphData.groupedNodes[group].some(node => node.id === edge.source)
      );
      const targetGroup = Object.keys(graphData.groupedNodes).find(group => 
        graphData.groupedNodes[group].some(node => node.id === edge.target)
      );
      const groupsVisible = sourceGroup && targetGroup && 
        !collapsedGroups[sourceGroup] && !collapsedGroups[targetGroup];
      
      return sourceExists && targetExists && groupsVisible && 
        document.getElementById(edge.source) && document.getElementById(edge.target);
    });
  }, [graphData.edges, graphData.groupedNodes, collapsedGroups, validNodeIds]);

  const handleHover = useCallback((nodeId) => {
    setHoveredNode(nodeId);
    setConnectedNodes(findConnectedNodes(nodeId));
  }, [findConnectedNodes]);

  const handleSelect = useCallback((nodeId) => {
    setSelectedNode(prev => prev === nodeId ? null : nodeId);
  }, []);

  const toggleGroupCollapse = useCallback((group) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [graphData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-gray-50 rounded-lg shadow-inner"
      style={{
        width: '100%',
        height: '1000px',
        minWidth: CONTAINER_DIMENSIONS.width,
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
            <Edge
              key={edge.id}
              edge={edge}
              colorSet={colorSet}
              nodeGroupMap={nodeGroupMap}
            />
          );
        })}
      </Xwrapper>
    </div>
  );
};

export default React.memo(LineageGraph);