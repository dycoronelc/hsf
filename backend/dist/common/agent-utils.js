"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAgentOperational = isAgentOperational;
const enums_1 = require("./enums");
function isAgentOperational(agentState) {
    return agentState === enums_1.AgentState.EN_LINEA || agentState === enums_1.AgentState.MANUAL;
}
//# sourceMappingURL=agent-utils.js.map