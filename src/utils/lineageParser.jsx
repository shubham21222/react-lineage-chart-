export const buildLineageGraph = (data) => {
  const nodes = {};
  const edges = [];
  const groupedNodes = {};

  data.forEach((item) => {
    const { entityId, parentIds, childIds, componentName, componentType } = item;

    // Create node object
    const node = {
      id: entityId,
      name: componentName || componentType,
      data: { label: componentName || componentType, componentType },
      children: [],
    };

    nodes[entityId] = node;

    // Group nodes by componentType
    if (componentType) {
      if (!groupedNodes[componentType]) groupedNodes[componentType] = [];
      groupedNodes[componentType].push(node);
    }

    // Create edges
    parentIds.forEach((parentId) => {
      edges.push({ id: `${parentId}-${entityId}`, source: parentId, target: entityId });
    });
    childIds.forEach((childId) => {
      edges.push({ id: `${entityId}-${childId}`, source: entityId, target: childId });
    });
  });

  return { nodes: Object.values(nodes), edges, groupedNodes };
};
