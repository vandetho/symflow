'use strict';

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

exports.DEFAULT_WORKFLOW_META = DEFAULT_WORKFLOW_META;
exports.STATE_NAME_REGEX = STATE_NAME_REGEX;
//# sourceMappingURL=types.cjs.map
//# sourceMappingURL=types.cjs.map