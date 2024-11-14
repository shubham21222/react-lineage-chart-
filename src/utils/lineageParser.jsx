// utils/lineageParser.js
export const buildLineageGraph = (data) => {
    const nodes = {};
    const edges = [];
  
    data.forEach((item) => {
      const { entityId, parentIds, childIds, componentName, componentType } = item;
  
      // Create node for each entity with a required "name" property
      nodes[entityId] = {
        id: entityId,
        name: componentName || componentType,
        data: { label: componentName || componentType },
        children: [],
      };
  
      parentIds.forEach((parentId) => {
        edges.push({ id: `${parentId}-${entityId}`, source: parentId, target: entityId });
      });
      childIds.forEach((childId) => {
        edges.push({ id: `${entityId}-${childId}`, source: entityId, target: childId });
      });
    });
  
    return { nodes: Object.values(nodes), edges };
  };
  