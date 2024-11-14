import React, { useEffect, useRef, useState } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import Draggable from 'react-draggable';
import { buildLineageGraph } from '../utils/lineageParser';

const LineageGraph = ({ data }) => {
  const containerRef = useRef();
  const nodesRef = useRef({});
  const [graphData, setGraphData] = useState(() => buildLineageGraph(data));
  const [collapsedNodes, setCollapsedNodes] = useState(() => {
    const initialState = {};
    graphData.nodes.forEach((node) => {
      initialState[node.id] = true; // Start all nodes as collapsed
    });
    return initialState;
  });
  const [loading, setLoading] = useState(true);
  const [containerDimensions, setContainerDimensions] = useState({ width: 2000, height: 2000 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const { nodes, edges, groupedNodes } = graphData;

  const scrollMargin = 100; // Margin at which scroll and expansion begin
  const scrollSpeed = 10;   // Pixels to scroll per interval
  const expandIncrement = 200; // Pixels by which the container expands

  useEffect(() => {
    const calculateLayout = () => {
      const spacingX = 250;
      const spacingY = 250;
      const groupSpacingY = 400;

      Object.keys(groupedNodes).forEach((processorName, groupIndex) => {
        const group = groupedNodes[processorName];
        group.forEach((node, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          nodesRef.current[node.id] = {
            x: col * spacingX + 200,
            y: groupIndex * groupSpacingY + row * spacingY,
          };
        });
      });

      setLoading(false);
    };

    calculateLayout();
  }, [nodes, groupedNodes]);

  const toggleCollapseNode = (nodeId) => {
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  let scrollInterval = useRef(null);

  const startAutoScrollAndExpand = (x, y) => {
    const container = containerRef.current;
    if (!container) return;

    clearInterval(scrollInterval.current);

    scrollInterval.current = setInterval(() => {
      let expanded = false;

      // Expand and scroll right if node is near the right edge
      if (x + scrollMargin > container.scrollLeft + container.clientWidth) {
        container.scrollLeft += scrollSpeed;
        setContainerDimensions((dims) => {
          if (x + scrollMargin > dims.width) {
            expanded = true;
            return { ...dims, width: dims.width + expandIncrement };
          }
          return dims;
        });
      }

      // Expand and scroll left if node is near the left edge
      if (x < container.scrollLeft + scrollMargin) {
        container.scrollLeft -= scrollSpeed;
        setContainerDimensions((dims) => {
          if (x < scrollMargin) {
            expanded = true;
            return { ...dims, width: dims.width + expandIncrement };
          }
          return dims;
        });
      }

      // Expand and scroll down if node is near the bottom edge
      if (y + scrollMargin > container.scrollTop + container.clientHeight) {
        container.scrollTop += scrollSpeed;
        setContainerDimensions((dims) => {
          if (y + scrollMargin > dims.height) {
            expanded = true;
            return { ...dims, height: dims.height + expandIncrement };
          }
          return dims;
        });
      }

      // Expand and scroll up if node is near the top edge
      if (y < container.scrollTop + scrollMargin) {
        container.scrollTop -= scrollSpeed;
        setContainerDimensions((dims) => {
          if (y < scrollMargin) {
            expanded = true;
            return { ...dims, height: dims.height + expandIncrement };
          }
          return dims;
        });
      }

      if (!expanded) {
        clearInterval(scrollInterval.current); // Stop scrolling if no expansion is needed
      }
    }, 16); // About 60 frames per second
  };

  const stopAutoScrollAndExpand = () => {
    clearInterval(scrollInterval.current);
  };

  const handleDrag = (e, data) => {
    const { x, y } = data;
    startAutoScrollAndExpand(x, y);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto bg-slate-50"
      style={{ width: '100%', height: '100vh', minWidth: containerDimensions.width, minHeight: containerDimensions.height }}
    >
      <Xwrapper>
        {nodes.map((node) => {
          const isCollapsed = collapsedNodes[node.id];
          const isHighlighted = hoveredNode === node.id || selectedNode === node.id;

          return (
            <Draggable
              key={node.id}
              defaultPosition={nodesRef.current[node.id]}
              onDrag={handleDrag}
              onStop={() => stopAutoScrollAndExpand()} // Clear interval on drag stop
              onMouseUp={() => stopAutoScrollAndExpand()} // Clear interval on mouse up
              bounds="parent"
            >
              <div
                id={node.id}
                className={`absolute flex flex-col items-center justify-center transition-transform duration-200 ${
                  isHighlighted ? 'scale-110' : ''
                }`}
                style={{ width: '160px', height: '160px', zIndex: isHighlighted ? 20 : 10 }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <div className={`w-full h-full relative rounded-lg shadow-lg p-3 ${
                    isHighlighted ? 'bg-emerald-500' : 'bg-emerald-400'
                  }`}>
                  <div className="text-white font-bold text-center break-words w-full">
                    {node.data.label}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapseNode(node.id);
                    }}
                    className="mt-2 bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    {isCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              </div>
            </Draggable>
          );
        })}

        {edges.map((edge) => {
          if (collapsedNodes[edge.source] || collapsedNodes[edge.target]) return null;

          return (
            <Xarrow
              key={edge.id}
              start={edge.source}
              end={edge.target}
              color="#94a3b8"
              path="smooth"
              strokeWidth={2}
            />
          );
        })}
      </Xwrapper>
    </div>
  );
};

export default LineageGraph;
