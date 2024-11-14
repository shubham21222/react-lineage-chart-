// utils/lineageParser.js

export const buildLineageGraph = (data) => {
  const nodes = {};
  const edges = [];
  const groupedNodes = {};

  data.forEach((item) => {
    const { entityId, parentIds, childIds, componentName, componentType, processorName } = item;

    // Create node with group based on processorName
    const node = {
      id: entityId,
      name: componentName || componentType,
      data: { label: componentName || componentType, processorName },
      children: [],
    };

    nodes[entityId] = node;

    // Group nodes by processorName for better organization
    if (processorName) {
      if (!groupedNodes[processorName]) groupedNodes[processorName] = [];
      groupedNodes[processorName].push(node);
    }

    parentIds.forEach((parentId) => {
      edges.push({ id: `${parentId}-${entityId}`, source: parentId, target: entityId });
    });
    childIds.forEach((childId) => {
      edges.push({ id: `${entityId}-${childId}`, source: entityId, target: childId });
    });
  });

  return { nodes: Object.values(nodes), edges, groupedNodes };
};
