import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { importWorkflowYaml } from "../src/yaml/import";
import { exportWorkflowYaml } from "../src/yaml/export";
import { analyzeWorkflow } from "../src/engine/analyzer";
import { validateDefinition } from "../src/engine/validator";
import { WorkflowEngine } from "../src/engine/workflow-engine";

const yamlContent = fs.readFileSync(
    path.resolve(__dirname, "fixtures/article-workflow.yaml"),
    "utf-8",
);

const { definition, meta } = importWorkflowYaml(yamlContent);

describe("article-workflow — import", () => {
    it("has the correct name", () => {
        expect(definition.name).toBe("article_workflow");
    });

    it("has the correct type", () => {
        expect(definition.type).toBe("workflow");
    });

    it("has 6 places", () => {
        expect(definition.places).toHaveLength(6);
    });

    it("has 4 transitions", () => {
        expect(definition.transitions).toHaveLength(4);
    });

    it("has the correct initial marking", () => {
        expect(definition.initialMarking).toEqual(["NEW_ARTICLE"]);
    });

    it("preserves place metadata — CHECKING_CONTENT has bg_color: ORANGE", () => {
        const place = definition.places.find((p) => p.name === "CHECKING_CONTENT");
        expect(place?.metadata).toEqual({ bg_color: "ORANGE" });
    });

    it("preserves place metadata — PUBLISHED has bg_color: Lime", () => {
        const place = definition.places.find((p) => p.name === "PUBLISHED");
        expect(place?.metadata).toEqual({ bg_color: "Lime" });
    });
});

describe("article-workflow — transition structure", () => {
    it("CREATE_ARTICLE is an AND-split (1 from, 2 to)", () => {
        const t = definition.transitions.find((t) => t.name === "CREATE_ARTICLE");
        expect(t).toBeDefined();
        expect(t!.froms).toHaveLength(1);
        expect(t!.tos).toHaveLength(2);
        expect(t!.froms).toEqual(["NEW_ARTICLE"]);
        expect(t!.tos).toEqual(["CHECKING_CONTENT", "CHECKING_SPELLING"]);
    });

    it("PUBLISH is an AND-join (2 from, 1 to)", () => {
        const t = definition.transitions.find((t) => t.name === "PUBLISH");
        expect(t).toBeDefined();
        expect(t!.froms).toHaveLength(2);
        expect(t!.tos).toHaveLength(1);
        expect(t!.froms).toEqual(["CONTENT_APPROVED", "SPELLING_APPROVED"]);
        expect(t!.tos).toEqual(["PUBLISHED"]);
    });
});

describe("article-workflow — engine flow", () => {
    it("full flow: CREATE_ARTICLE → APPROVE_CONTENT → APPROVE_SPELLING → PUBLISH", () => {
        const engine = new WorkflowEngine(definition);
        expect(engine.getActivePlaces()).toEqual(["NEW_ARTICLE"]);

        engine.apply("CREATE_ARTICLE");
        expect(engine.getActivePlaces().sort()).toEqual(["CHECKING_CONTENT", "CHECKING_SPELLING"]);

        engine.apply("APPROVE_CONTENT");
        expect(engine.getActivePlaces().sort()).toEqual(["CHECKING_SPELLING", "CONTENT_APPROVED"]);

        engine.apply("APPROVE_SPELLING");
        expect(engine.getActivePlaces().sort()).toEqual(["CONTENT_APPROVED", "SPELLING_APPROVED"]);

        engine.apply("PUBLISH");
        expect(engine.getActivePlaces()).toEqual(["PUBLISHED"]);
    });

    it("PUBLISH requires BOTH approvals (AND-join semantics)", () => {
        const engine = new WorkflowEngine(definition);
        engine.apply("CREATE_ARTICLE");

        // Only approve content — PUBLISH should not be allowed
        engine.apply("APPROVE_CONTENT");
        expect(engine.can("PUBLISH").allowed).toBe(false);
        expect(engine.can("PUBLISH").blockers[0].code).toBe("not_in_place");

        // Now approve spelling — PUBLISH should be allowed
        engine.apply("APPROVE_SPELLING");
        expect(engine.can("PUBLISH").allowed).toBe(true);
    });

    it("PUBLISH cannot fire with only spelling approved", () => {
        const engine = new WorkflowEngine(definition);
        engine.apply("CREATE_ARTICLE");

        engine.apply("APPROVE_SPELLING");
        expect(engine.can("PUBLISH").allowed).toBe(false);
    });
});

describe("article-workflow — round-trip", () => {
    it("import YAML → export YAML → re-import and compare", () => {
        const exportedYaml = exportWorkflowYaml({ definition, meta });
        const { definition: reimported } = importWorkflowYaml(exportedYaml);

        expect(reimported.name).toBe(definition.name);
        expect(reimported.type).toBe(definition.type);
        expect(reimported.initialMarking).toEqual(definition.initialMarking);
        expect(reimported.places.map((p) => p.name)).toEqual(definition.places.map((p) => p.name));
        expect(reimported.transitions.length).toBe(definition.transitions.length);

        for (const t of definition.transitions) {
            const reimportedT = reimported.transitions.find((rt) => rt.name === t.name);
            expect(reimportedT).toBeDefined();
            expect(reimportedT!.froms).toEqual(t.froms);
            expect(reimportedT!.tos).toEqual(t.tos);
        }

        // Metadata is preserved in round-trip
        for (const place of definition.places) {
            const reimportedPlace = reimported.places.find((p) => p.name === place.name);
            expect(reimportedPlace).toBeDefined();
            if (place.metadata) {
                expect(reimportedPlace!.metadata).toEqual(place.metadata);
            }
        }
    });
});

describe("article-workflow — analyzer", () => {
    it("analyzeWorkflow detects AND-split on CREATE_ARTICLE", () => {
        const analysis = analyzeWorkflow(definition);
        expect(analysis.transitions["CREATE_ARTICLE"].pattern).toBe("and-split");
    });

    it("analyzeWorkflow detects AND-join on PUBLISH", () => {
        const analysis = analyzeWorkflow(definition);
        expect(analysis.transitions["PUBLISH"].pattern).toBe("and-join");
    });

    it("analyzeWorkflow detects simple transitions", () => {
        const analysis = analyzeWorkflow(definition);
        expect(analysis.transitions["APPROVE_SPELLING"].pattern).toBe("simple");
        expect(analysis.transitions["APPROVE_CONTENT"].pattern).toBe("simple");
    });

    it("analyzeWorkflow detects and-split pattern on parallel places", () => {
        const analysis = analyzeWorkflow(definition);
        expect(analysis.places["CHECKING_CONTENT"].patterns).toContain("and-split");
        expect(analysis.places["CHECKING_SPELLING"].patterns).toContain("and-split");
    });

    it("analyzeWorkflow detects and-join pattern on convergence places", () => {
        const analysis = analyzeWorkflow(definition);
        expect(analysis.places["CONTENT_APPROVED"].patterns).toContain("and-join");
        expect(analysis.places["SPELLING_APPROVED"].patterns).toContain("and-join");
    });
});

describe("article-workflow — validator", () => {
    it("validates the definition as valid", () => {
        const result = validateDefinition(definition);
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
    });
});
