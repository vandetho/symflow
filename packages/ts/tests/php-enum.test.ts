import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { importWorkflowYaml } from "../src/yaml/import";
import { validateDefinition } from "../src/engine/validator";
import { WorkflowEngine } from "../src/engine/workflow-engine";

const yamlContent = readFileSync(resolve(__dirname, "fixtures/php-enum.yaml"), "utf8");

describe("!php/enum YAML tag support", () => {
    it("resolves enum place names to short names", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const names = definition.places.map((p) => p.name);
        expect(names).toEqual(["New", "Processing", "Shipped", "Delivered", "Cancelled"]);
    });

    it("resolves enum transition names to short names", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const names = definition.transitions.map((t) => t.name);
        expect(names).toEqual(["Process", "Ship", "Deliver", "Cancel"]);
    });

    it("resolves initial_marking from enum", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        expect(definition.initialMarking).toEqual(["New"]);
    });

    it("resolves enum values in from/to arrays", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const ship = definition.transitions.find((t) => t.name === "Ship")!;
        expect(ship.froms).toEqual(["Processing"]);
        expect(ship.tos).toEqual(["Shipped"]);
    });

    it("preserves metadata on enum-keyed places", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const processing = definition.places.find((p) => p.name === "Processing")!;
        expect(processing.metadata).toEqual({ bg_color: "ORANGE" });
        const cancelled = definition.places.find((p) => p.name === "Cancelled")!;
        expect(cancelled.metadata).toEqual({ bg_color: "Red" });
    });

    it("produces a valid definition", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const result = validateDefinition(definition);
        expect(result.valid).toBe(true);
    });

    it("runs the full engine flow", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const engine = new WorkflowEngine(definition);

        expect(engine.getActivePlaces()).toEqual(["New"]);
        engine.apply("Process");
        expect(engine.getActivePlaces()).toEqual(["Processing"]);
        engine.apply("Ship");
        expect(engine.getActivePlaces()).toEqual(["Shipped"]);
        engine.apply("Deliver");
        expect(engine.getActivePlaces()).toEqual(["Delivered"]);
    });

    it("supports cancel from New", () => {
        const { definition } = importWorkflowYaml(yamlContent);
        const engine = new WorkflowEngine(definition);

        expect(engine.can("Cancel").allowed).toBe(true);
        engine.apply("Cancel");
        expect(engine.getActivePlaces()).toEqual(["Cancelled"]);
        expect(engine.getEnabledTransitions()).toEqual([]);
    });
});
