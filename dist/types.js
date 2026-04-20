// src/types/workflow.ts
var STATE_NAME_REGEX = /^[a-z][a-z0-9_]*$/;
var DEFAULT_WORKFLOW_META = {
  name: "my_workflow",
  symfonyVersion: "8.0",
  type: "workflow",
  marking_store: "method",
  initial_marking: [],
  supports: "App\\Entity\\MyEntity",
  property: "currentState"
};

export { DEFAULT_WORKFLOW_META, STATE_NAME_REGEX };
//# sourceMappingURL=types.js.map
//# sourceMappingURL=types.js.map