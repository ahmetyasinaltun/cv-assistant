// Unit tests for the CV editor's pure rules: dates, line origins, summary and skills text, order, validation, preview.

import { describe, expect, it } from "vitest";

import type { CvContent, CvLine } from "@/lib/api/types";

import {
  cleanContent,
  editLine,
  firstErrorPath,
  joinDate,
  moveSection,
  newEntry,
  previewContent,
  skillsFromText,
  splitDate,
  summaryFromText,
  toggleSection,
  validateContent,
} from "./cv-model";

const line = (text: string, origin: CvLine["origin"] = "cv"): CvLine => ({ text, origin, evidence_ids: [] });

function content(overrides: Partial<CvContent> = {}): CvContent {
  return {
    contact: { name: "Deniz Aydın", email: null, phone: null, location: null, links: [] },
    headline: null,
    summary: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    certificates: [],
    sections: (["summary", "experience", "education", "projects", "skills", "languages", "certificates"] as const).map(
      (key) => ({ key, visible: true }),
    ),
    ...overrides,
  };
}

describe("dates", () => {
  it("splits and joins month and year", () => {
    expect(splitDate("2025-06")).toEqual({ year: "2025", month: "06", ongoing: false });
    expect(splitDate("present")).toEqual({ year: "", month: "", ongoing: true });
    expect(joinDate({ year: "2025", month: "06", ongoing: false })).toBe("2025-06");
    expect(joinDate({ year: " 2024 ", month: "", ongoing: false })).toBe("2024");
    expect(joinDate({ year: "", month: "06", ongoing: false })).toBeNull();
    expect(joinDate({ year: "2024", month: "", ongoing: true })).toBe("present");
  });
});

describe("line origins", () => {
  it("makes an edited copied or reworded line the user's own", () => {
    expect(editLine(line("Built APIs."), "Built REST APIs.").origin).toBe("user");
    expect(editLine(line("Built APIs.", "ai_reworded"), "Built APIs!").origin).toBe("user");
  });

  it("keeps the mark on a claim the AI added, even after an edit", () => {
    expect(editLine(line("Used Kubernetes.", "ai_added"), "Used Kubernetes daily.").origin).toBe("ai_added");
  });

  it("leaves an unchanged line as it was", () => {
    const original = line("Same.");
    expect(editLine(original, "Same.")).toBe(original);
  });
});

describe("summary and skills text", () => {
  it("keeps the origin of sentences the user did not change", () => {
    const previous = [line("First sentence."), line("Second one.", "ai_reworded")];
    const lines = summaryFromText("First sentence. Second one, changed. A third!", previous);
    expect(lines.map((l) => [l.text, l.origin])).toEqual([
      ["First sentence.", "cv"],
      ["Second one, changed.", "user"],
      ["A third!", "user"],
    ]);
  });

  it("breaks a sentence longer than the API allows", () => {
    const long = Array.from({ length: 150 }, () => "word").join(" ");
    expect(summaryFromText(long, []).every((l) => l.text.length <= 600)).toBe(true);
  });

  it("keeps a retyped skill's origin and drops empty items", () => {
    const items = skillsFromText("Python, , Kubernetes ,Go", [line("Kubernetes", "ai_added")]);
    expect(items.map((i) => [i.text, i.origin])).toEqual([
      ["Python", "user"],
      ["Kubernetes", "ai_added"],
      ["Go", "user"],
    ]);
  });
});

describe("sections", () => {
  it("moves and hides sections", () => {
    const sections = content().sections;
    expect(moveSection(sections, "experience", -1).map((s) => s.key).slice(0, 2)).toEqual(["experience", "summary"]);
    expect(moveSection(sections, "summary", -1)).toBe(sections);
    expect(toggleSection(sections, "skills").find((s) => s.key === "skills")?.visible).toBe(false);
  });
});

describe("validation", () => {
  it("names each missing or malformed field by its path", () => {
    const errors = validateContent(
      content({
        contact: { name: " ", email: "nope", phone: null, location: null, links: [{ url: "github.com/x" }] },
        experience: [{ ...newEntry("experience"), organization: "Acme", start: "202" }],
        skills: [{ name: "Tools", items: [] }],
      }),
    );
    expect(errors).toEqual({
      "contact.name": "required",
      "contact.email": "email",
      "contact.links.0": "url",
      "experience.0.role": "required",
      "experience.0.start": "year",
      "skills.0.items": "required",
    });
  });

  it("accepts an ongoing end date but not an ongoing start", () => {
    const entry = { ...newEntry("experience"), role: "Intern", organization: "Acme" };
    expect(validateContent(content({ experience: [{ ...entry, end: "present" }] }))).toEqual({});
    expect(validateContent(content({ experience: [{ ...entry, start: "present" }] }))).toEqual({
      "experience.0.start": "year",
    });
  });

  it("orders errors as the sections appear on screen", () => {
    const order = ["projects", "experience"] as const;
    expect(firstErrorPath({ "experience.0.role": "required", "projects.1.name": "required" }, [...order])).toBe(
      "projects.1.name",
    );
    expect(firstErrorPath({ "experience.0.role": "required", "contact.name": "required" }, [...order])).toBe(
      "contact.name",
    );
  });
});

describe("cleaning and preview", () => {
  it("trims, turns empty optional fields into null and drops empty lines", () => {
    const cleaned = cleanContent(
      content({
        contact: { name: " Deniz ", email: " ", phone: "", location: " İstanbul ", links: [{ url: " " }] },
        experience: [{ ...newEntry("experience"), role: " Intern ", organization: "Acme", bullets: [line(" "), line("Did it.")] }],
      }),
    );
    expect(cleaned.contact).toEqual({ name: "Deniz", email: null, phone: null, location: "İstanbul", links: [] });
    expect(cleaned.experience[0].role).toBe("Intern");
    expect(cleaned.experience[0].bullets.map((b) => b.text)).toEqual(["Did it."]);
  });

  it("leaves out what is still being typed instead of failing", () => {
    const preview = previewContent(
      content({
        contact: { name: "", email: "half@", phone: null, location: null, links: [{ url: "https://ok.dev" }, { url: "bad" }] },
        experience: [
          { ...newEntry("experience"), role: "Intern", organization: "Acme", start: "20" },
          newEntry("experience"),
        ],
      }),
      "Jane Doe",
    );
    expect(preview.contact.name).toBe("Jane Doe");
    expect(preview.contact.email).toBeNull();
    expect(preview.contact.links).toEqual([{ url: "https://ok.dev" }]);
    expect(preview.experience).toHaveLength(1);
    expect(preview.experience[0].start).toBeNull();
  });
});
