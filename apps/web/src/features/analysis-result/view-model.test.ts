// Unit tests for the result page view model: labels, counts, grouping, default selection and quote splitting.

import { describe, expect, it } from "vitest";

import type { RequirementMatch, Suggestion } from "@/lib/api/types";

import { sampleAnalysis } from "./sample-analysis";
import {
  countByStatus,
  defaultSelectedRequirementId,
  evidenceLabel,
  groupEvidenceBySection,
  sortSuggestionsByPriority,
  splitByImportance,
  splitByQuote,
} from "./view-model";

const result = sampleAnalysis.result!;

function requirement(overrides: Partial<RequirementMatch>): RequirementMatch {
  return {
    id: "r1",
    text: "Requirement",
    category: "technical_skill",
    importance: "must_have",
    status: "matched",
    reasoning: "",
    evidence: [],
    ...overrides,
  };
}

function suggestion(overrides: Partial<Suggestion>): Suggestion {
  return {
    title: "Fix",
    detail: "",
    target: "cv_section",
    priority: "medium",
    related_requirement_ids: [],
    ...overrides,
  };
}

describe("evidenceLabel", () => {
  it("pads pipeline ids into edge numbers", () => {
    expect(evidenceLabel("e3")).toBe("E03");
    expect(evidenceLabel("e12")).toBe("E12");
  });

  it("falls back to an uppercase id for unexpected formats", () => {
    expect(evidenceLabel("x-7")).toBe("X-7");
  });
});

describe("countByStatus", () => {
  it("counts the sample analysis the same way the server summary does", () => {
    expect(countByStatus(result.requirements)).toEqual({ matched: 5, partial: 2, missing: 1 });
  });
});

describe("splitByImportance", () => {
  it("keeps the original order inside each half", () => {
    const { mustHave, niceToHave } = splitByImportance(result.requirements);
    expect(mustHave.map((item) => item.id)).toEqual(["r1", "r2", "r3", "r4", "r5", "r6"]);
    expect(niceToHave.map((item) => item.id)).toEqual(["r7", "r8"]);
  });
});

describe("groupEvidenceBySection", () => {
  it("groups by section in order of first appearance", () => {
    const groups = groupEvidenceBySection(result.candidate_evidence);
    expect(groups.map((group) => group.section)).toEqual(["Experience", "Projects", "Skills"]);
    expect(groups[0].items).toHaveLength(5);
  });

  it("collects evidence without a section into one null group", () => {
    const groups = groupEvidenceBySection([
      { id: "e1", text: "a", section: null, skills: [] },
      { id: "e2", text: "b", section: "  ", skills: [] },
    ]);
    expect(groups).toEqual([{ section: null, items: expect.any(Array) }]);
    expect(groups[0].items).toHaveLength(2);
  });
});

describe("sortSuggestionsByPriority", () => {
  it("orders high before medium before low without mutating the input", () => {
    const input = [
      suggestion({ title: "low", priority: "low" }),
      suggestion({ title: "high", priority: "high" }),
      suggestion({ title: "medium", priority: "medium" }),
    ];
    expect(sortSuggestionsByPriority(input).map((item) => item.title)).toEqual(["high", "medium", "low"]);
    expect(input[0].title).toBe("low");
  });
});

describe("defaultSelectedRequirementId", () => {
  it("picks the gap behind the most important fix", () => {
    expect(defaultSelectedRequirementId(result.requirements, result.suggestions)).toBe("r4");
  });

  it("skips fixes that point at already matched requirements", () => {
    const requirements = [requirement({ id: "r1" }), requirement({ id: "r2", status: "missing" })];
    const suggestions = [suggestion({ priority: "high", related_requirement_ids: ["r1", "r2"] })];
    expect(defaultSelectedRequirementId(requirements, suggestions)).toBe("r2");
  });

  it("falls back to the first unmet must-have, then any unmet requirement", () => {
    const requirements = [
      requirement({ id: "r1", importance: "nice_to_have", status: "missing" }),
      requirement({ id: "r2", status: "partial" }),
    ];
    expect(defaultSelectedRequirementId(requirements, [])).toBe("r2");
    expect(defaultSelectedRequirementId([requirements[0]], [])).toBe("r1");
  });

  it("selects the first requirement when everything matched, and nothing when empty", () => {
    expect(defaultSelectedRequirementId([requirement({ id: "r9" })], [])).toBe("r9");
    expect(defaultSelectedRequirementId([], [])).toBeNull();
  });
});

describe("splitByQuote", () => {
  it("marks the first case-insensitive occurrence of the quote", () => {
    expect(splitByQuote("Wrote pytest unit tests for the order service.", "pytest UNIT tests")).toEqual([
      { text: "Wrote ", highlighted: false },
      { text: "pytest unit tests", highlighted: true },
      { text: " for the order service.", highlighted: false },
    ]);
  });

  it("returns the text unmarked when the quote is missing or not found", () => {
    expect(splitByQuote("Python, FastAPI", undefined)).toEqual([{ text: "Python, FastAPI", highlighted: false }]);
    expect(splitByQuote("Python, FastAPI", "Django")).toEqual([{ text: "Python, FastAPI", highlighted: false }]);
  });

  it("drops empty segments when the quote covers the start or the whole text", () => {
    expect(splitByQuote("pytest", "pytest")).toEqual([{ text: "pytest", highlighted: true }]);
  });
});
