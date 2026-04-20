import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { importWorkflowYaml } from "../src/yaml/import";
import { analyzeWorkflow } from "../src/engine/analyzer";
import { validateDefinition } from "../src/engine/validator";
import { WorkflowEngine } from "../src/engine/workflow-engine";

const yamlContent = readFileSync(
    resolve(__dirname, "fixtures/blog-event.yaml"),
    "utf-8",
);

const { definition, meta } = importWorkflowYaml(yamlContent);

describe("blog-event — !php/const resolution", () => {
    it("resolves place names to short names (not full PHP paths)", () => {
        const placeNames = definition.places.map((p) => p.name);
        expect(placeNames).toEqual([
            "NEW_BLOG",
            "CHECKING_CONTENT",
            "NEED_REVIEW",
            "NEED_UPDATE",
            "PUBLISHED",
        ]);
    });

    it("resolves transition names to short names", () => {
        const transitionNames = definition.transitions.map((t) => t.name);
        expect(transitionNames).toEqual([
            "CREATE_BLOG",
            "VALID",
            "INVALID",
            "PUBLISH",
            "NEED_REVIEW",
            "REJECT",
            "UPDATE",
        ]);
    });
});

describe("blog-event — structure", () => {
    it("is type state_machine with 5 places and 7 transitions", () => {
        expect(definition.type).toBe("state_machine");
        expect(definition.places).toHaveLength(5);
        expect(definition.transitions).toHaveLength(7);
    });

    it("has initial_marking ['NEW_BLOG']", () => {
        expect(definition.initialMarking).toEqual(["NEW_BLOG"]);
    });

    it("CHECKING_CONTENT has bg_color ORANGE", () => {
        const place = definition.places.find((p) => p.name === "CHECKING_CONTENT");
        expect(place?.metadata).toEqual({ bg_color: "ORANGE" });
    });

    it("PUBLISHED has bg_color Lime", () => {
        const place = definition.places.find((p) => p.name === "PUBLISHED");
        expect(place?.metadata).toEqual({ bg_color: "Lime" });
    });

    it("NEED_UPDATE has bg_color Orchid", () => {
        const place = definition.places.find((p) => p.name === "NEED_UPDATE");
        expect(place?.metadata).toEqual({ bg_color: "Orchid" });
    });

    it("marking_store is 'method' with property 'state'", () => {
        expect(meta.marking_store).toBe("method");
        expect(meta.property).toBe("state");
    });
});

describe("blog-event — engine flow", () => {
    it("happy path: NEW_BLOG -> CREATE_BLOG -> CHECKING_CONTENT -> VALID -> NEED_REVIEW -> PUBLISH -> PUBLISHED", () => {
        const engine = new WorkflowEngine(definition);
        expect(engine.getActivePlaces()).toEqual(["NEW_BLOG"]);

        engine.apply("CREATE_BLOG");
        expect(engine.getActivePlaces()).toEqual(["CHECKING_CONTENT"]);

        engine.apply("VALID");
        expect(engine.getActivePlaces()).toEqual(["NEED_REVIEW"]);

        engine.apply("PUBLISH");
        expect(engine.getActivePlaces()).toEqual(["PUBLISHED"]);
    });

    it("rejection path: CHECKING_CONTENT -> INVALID -> NEED_UPDATE -> UPDATE -> NEED_REVIEW", () => {
        const engine = new WorkflowEngine(definition);
        engine.apply("CREATE_BLOG"); // -> CHECKING_CONTENT

        engine.apply("INVALID");
        expect(engine.getActivePlaces()).toEqual(["NEED_UPDATE"]);

        engine.apply("UPDATE");
        expect(engine.getActivePlaces()).toEqual(["NEED_REVIEW"]);
    });

    it("published can go back to NEED_REVIEW (un-publish loop)", () => {
        const engine = new WorkflowEngine(definition);
        engine.apply("CREATE_BLOG");
        engine.apply("VALID");
        engine.apply("PUBLISH");
        expect(engine.getActivePlaces()).toEqual(["PUBLISHED"]);

        engine.apply("NEED_REVIEW");
        expect(engine.getActivePlaces()).toEqual(["NEED_REVIEW"]);
    });

    it("from CHECKING_CONTENT, both VALID and INVALID are enabled (xor-split)", () => {
        const engine = new WorkflowEngine(definition);
        engine.apply("CREATE_BLOG"); // -> CHECKING_CONTENT

        const enabled = engine.getEnabledTransitions().map((t) => t.name);
        expect(enabled).toContain("VALID");
        expect(enabled).toContain("INVALID");
        expect(enabled).toHaveLength(2);
    });

    it("from NEW_BLOG, only CREATE_BLOG is enabled", () => {
        const engine = new WorkflowEngine(definition);
        const enabled = engine.getEnabledTransitions().map((t) => t.name);
        expect(enabled).toEqual(["CREATE_BLOG"]);
    });
});

describe("blog-event — validator", () => {
    it("validates the definition as valid", () => {
        const result = validateDefinition(definition);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
});

describe("blog-event — analyzer", () => {
    it("CHECKING_CONTENT has xor-split pattern", () => {
        const analysis = analyzeWorkflow(definition);
        expect(analysis.places["CHECKING_CONTENT"].patterns).toContain("xor-split");
    });
});
