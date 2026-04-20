import type { WorkflowDefinition } from "../src/engine/types";

export const orderStateMachine: WorkflowDefinition = {
    name: "order",
    type: "state_machine",
    places: [
        { name: "draft" },
        { name: "submitted" },
        { name: "approved" },
        { name: "rejected" },
        { name: "fulfilled" },
    ],
    transitions: [
        { name: "submit", froms: ["draft"], tos: ["submitted"] },
        { name: "approve", froms: ["submitted"], tos: ["approved"] },
        { name: "reject", froms: ["submitted"], tos: ["rejected"] },
        { name: "fulfill", froms: ["approved"], tos: ["fulfilled"] },
    ],
    initialMarking: ["draft"],
};

export const articleReviewWorkflow: WorkflowDefinition = {
    name: "article_review",
    type: "workflow",
    places: [
        { name: "draft" },
        { name: "checking_content" },
        { name: "checking_spelling" },
        { name: "content_approved" },
        { name: "spelling_approved" },
        { name: "published" },
    ],
    transitions: [
        {
            name: "start_review",
            froms: ["draft"],
            tos: ["checking_content", "checking_spelling"],
        },
        { name: "approve_content", froms: ["checking_content"], tos: ["content_approved"] },
        { name: "approve_spelling", froms: ["checking_spelling"], tos: ["spelling_approved"] },
        {
            name: "publish",
            froms: ["content_approved", "spelling_approved"],
            tos: ["published"],
        },
    ],
    initialMarking: ["draft"],
};

export const guardedStateMachine: WorkflowDefinition = {
    name: "guarded",
    type: "state_machine",
    places: [{ name: "pending" }, { name: "approved" }, { name: "denied" }],
    transitions: [
        {
            name: "approve",
            froms: ["pending"],
            tos: ["approved"],
            guard: "subject.amount < 1000",
        },
        { name: "deny", froms: ["pending"], tos: ["denied"] },
    ],
    initialMarking: ["pending"],
};
