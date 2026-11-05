// Pure rules of the CV editor: dates as month and year, line origins after an edit, the summary and skills as free
// text, section order, validation before saving and the cleaned copy the live preview renders. No React here.

import type {
  CvCertificate,
  CvContent,
  CvDate,
  CvEducation,
  CvExperience,
  CvLanguage,
  CvLine,
  CvProject,
  CvSection,
  CvSectionKey,
  CvSkillGroup,
  LineOrigin,
} from "@/lib/api/types";

/** The API's limits (services/api/app/cv/content.py), so the editor never sends what the server refuses. */
export const LIMITS = {
  shortText: 160,
  lineText: 600,
  url: 300,
  summaryText: 2000,
  summaryLines: 20,
  links: 5,
  entries: { experience: 15, education: 8, projects: 15, skills: 10, languages: 10, certificates: 15 },
  lines: { experience: 12, education: 8, projects: 8 },
  skillItems: 40,
} as const;

export type EntryKind = "experience" | "education" | "projects";
export type ListKind = EntryKind | "skills" | "languages" | "certificates";
type ErrorKey = "required" | "email" | "url" | "year" | "tooLong";
/** Field path ("experience.0.role") to the problem with it. */
export type FieldErrors = Record<string, ErrorKey>;

const YEAR = /^\d{4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEB_ADDRESS = /^https?:\/\/\S+\.\S+$/i;

// --- Dates ---------------------------------------------------------------------------------------------

export interface DateParts {
  year: string;
  /** "01".."12", or "" for a year alone. */
  month: string;
  ongoing: boolean;
}

export function splitDate(value: CvDate): DateParts {
  if (value === "present") return { year: "", month: "", ongoing: true };
  const [year = "", month = ""] = (value ?? "").split("-");
  return { year, month, ongoing: false };
}

/** "2025" + "06" → "2025-06"; no year → null. A half-typed year is kept so validation can point at it. */
export function joinDate({ year, month, ongoing }: DateParts): CvDate {
  if (ongoing) return "present";
  const trimmed = year.trim();
  if (!trimmed) return null;
  return month ? `${trimmed}-${month}` : trimmed;
}

function isValidDate(value: CvDate, allowPresent: boolean): boolean {
  if (value === null) return true;
  if (value === "present") return allowPresent;
  const { year, month } = splitDate(value);
  return YEAR.test(year) && (month === "" || /^(0[1-9]|1[0-2])$/.test(month));
}

// --- Line origins --------------------------------------------------------------------------------------

/** Wording origins become the user's once they edit the line; claims the AI added keep their mark, because the
 * user still has to be ready to talk about them. */
const WORDING_ORIGINS: LineOrigin[] = ["cv", "ai_reworded"];

export function editLine(line: CvLine, text: string): CvLine {
  if (text === line.text) return line;
  const origin = WORDING_ORIGINS.includes(line.origin) ? "user" : line.origin;
  return { ...line, text, origin, evidence_ids: origin === "cv" ? line.evidence_ids : [] };
}

export function userLine(text = ""): CvLine {
  return { text, origin: "user", evidence_ids: [] };
}

// --- Lines to talk about ------------------------------------------------------------------------------

export interface ReadyLine {
  text: string;
  origin: CvLine["origin"];
  /** Where the line sits: "Experience · Backend Intern". */
  place: string;
}

/** Every line the AI added or embellished, with where it sits, in the order the CV shows them. */
export function linesToTalkAbout(content: CvContent, sections: Record<CvSectionKey, string>): ReadyLine[] {
  const ready: ReadyLine[] = [];
  const take = (lines: CvLine[], place: string) => {
    for (const line of lines) {
      if (line.origin === "ai_added" || line.origin === "ai_embellished") {
        ready.push({ text: line.text, origin: line.origin, place });
      }
    }
  };
  take(content.summary, sections.summary);
  for (const job of content.experience) take(job.bullets, `${sections.experience} · ${job.role}`);
  for (const project of content.projects) take(project.bullets, `${sections.projects} · ${project.name}`);
  for (const school of content.education) take(school.details, `${sections.education} · ${school.degree}`);
  for (const group of content.skills) take(group.items, group.name ? `${sections.skills} · ${group.name}` : sections.skills);
  return ready;
}

/** Origins the editor marks; lines from the CV and the user's own lines carry no mark. */
export function isMarkedOrigin(origin: LineOrigin): origin is "ai_reworded" | "ai_embellished" | "ai_added" | "confirmed" {
  return origin !== "cv" && origin !== "user";
}

export function countMarkedLines(content: CvContent, origin: LineOrigin): number {
  return allLines(content).filter((line) => line.origin === origin).length;
}

function allLines(content: CvContent): CvLine[] {
  return [
    ...content.summary,
    ...content.experience.flatMap((entry) => entry.bullets),
    ...content.education.flatMap((entry) => entry.details),
    ...content.projects.flatMap((entry) => entry.bullets),
    ...content.skills.flatMap((group) => group.items),
  ];
}

// --- Summary and skills as free text ------------------------------------------------------------------

export function summaryText(lines: CvLine[]): string {
  return lines.map((line) => line.text).join(" ");
}

/** Splits the summary into sentences again; a sentence the user did not change keeps its origin. */
export function summaryFromText(text: string, previous: CvLine[]): CvLine[] {
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .flatMap((sentence) => chunk(sentence.trim(), LIMITS.lineText))
    .filter(Boolean);
  const capped = sentences.length > LIMITS.summaryLines
    ? [...sentences.slice(0, LIMITS.summaryLines - 1), sentences.slice(LIMITS.summaryLines - 1).join(" ")]
    : sentences;
  return capped.map((sentence) => previous.find((line) => line.text === sentence) ?? userLine(sentence));
}

/** Breaks an over-long sentence at word boundaries so no line passes the API's limit. */
function chunk(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const cut = rest.lastIndexOf(" ", max);
    const at = cut > 0 ? cut : max;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  return rest ? [...parts, rest] : parts;
}

export function skillsText(items: CvLine[]): string {
  return items.map((item) => item.text).join(", ");
}

/** A skill typed again keeps its origin, so an AI-added skill stays marked until it is removed. */
export function skillsFromText(text: string, previous: CvLine[]): CvLine[] {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => previous.find((line) => line.text === item) ?? userLine(item));
}

// --- Lists and sections -------------------------------------------------------------------------------

export function moveItem<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function moveSection(sections: CvSection[], key: CvSectionKey, delta: -1 | 1): CvSection[] {
  return moveItem(sections, sections.findIndex((section) => section.key === key), delta);
}

export function toggleSection(sections: CvSection[], key: CvSectionKey): CvSection[] {
  return sections.map((section) => (section.key === key ? { ...section, visible: !section.visible } : section));
}

export function newEntry(kind: "experience"): CvExperience;
export function newEntry(kind: "education"): CvEducation;
export function newEntry(kind: "projects"): CvProject;
export function newEntry(kind: EntryKind): CvExperience | CvEducation | CvProject {
  if (kind === "experience") {
    return { role: "", organization: "", location: null, start: null, end: null, bullets: [userLine()] };
  }
  if (kind === "education") {
    return { degree: "", school: "", location: null, start: null, end: null, details: [] };
  }
  return { name: "", link: null, start: null, end: null, bullets: [userLine()] };
}

export const newSkillGroup = (): CvSkillGroup => ({ name: null, items: [] });
export const newLanguage = (): CvLanguage => ({ name: "", level: null });
export const newCertificate = (): CvCertificate => ({ name: "", issuer: null, date: null });

// --- Validation and cleaning ---------------------------------------------------------------------------

const blank = (value: string | null | undefined) => !value || !value.trim();
const optional = (value: string | null): string | null => (blank(value) ? null : value!.trim());
const cleanLines = (lines: CvLine[]) =>
  lines.map((line) => ({ ...line, text: line.text.trim() })).filter((line) => line.text);

/** Problems that stop a save, keyed by field path; empty when the CV can be saved. */
export function validateContent(content: CvContent): FieldErrors {
  const errors: FieldErrors = {};
  const require = (path: string, value: string | null | undefined) => {
    if (blank(value)) errors[path] = "required";
  };
  const checkDate = (path: string, value: CvDate, allowPresent: boolean) => {
    if (!isValidDate(value, allowPresent)) errors[path] = "year";
  };

  require("contact.name", content.contact.name);
  if (!blank(content.contact.email) && !EMAIL.test(content.contact.email!.trim())) {
    errors["contact.email"] = "email";
  }
  content.contact.links.forEach((link, index) => {
    if (!blank(link.url) && !WEB_ADDRESS.test(link.url.trim())) errors[`contact.links.${index}`] = "url";
  });
  content.experience.forEach((entry, index) => {
    require(`experience.${index}.role`, entry.role);
    require(`experience.${index}.organization`, entry.organization);
    checkDate(`experience.${index}.start`, entry.start, false);
    checkDate(`experience.${index}.end`, entry.end, true);
  });
  content.education.forEach((entry, index) => {
    require(`education.${index}.degree`, entry.degree);
    require(`education.${index}.school`, entry.school);
    checkDate(`education.${index}.start`, entry.start, false);
    checkDate(`education.${index}.end`, entry.end, true);
  });
  content.projects.forEach((entry, index) => {
    require(`projects.${index}.name`, entry.name);
    if (entry.link && !blank(entry.link.url) && !WEB_ADDRESS.test(entry.link.url.trim())) {
      errors[`projects.${index}.link`] = "url";
    }
    checkDate(`projects.${index}.start`, entry.start, false);
    checkDate(`projects.${index}.end`, entry.end, true);
  });
  content.skills.forEach((group, index) => {
    if (cleanLines(group.items).length === 0) errors[`skills.${index}.items`] = "required";
    else if (
      group.items.length > LIMITS.skillItems ||
      group.items.some((item) => item.text.length > LIMITS.shortText)
    ) {
      errors[`skills.${index}.items`] = "tooLong";
    }
  });
  content.languages.forEach((language, index) => require(`languages.${index}.name`, language.name));
  content.certificates.forEach((certificate, index) => {
    require(`certificates.${index}.name`, certificate.name);
    checkDate(`certificates.${index}.date`, certificate.date, false);
  });
  return errors;
}

/** The content as the API stores it: trimmed, empty optional fields as null, empty lines and links dropped. */
export function cleanContent(content: CvContent): CvContent {
  const contact = content.contact;
  return {
    ...content,
    contact: {
      name: contact.name.trim(),
      email: optional(contact.email),
      phone: optional(contact.phone),
      location: optional(contact.location),
      links: contact.links.filter((link) => !blank(link.url)).map((link) => ({ url: link.url.trim() })),
    },
    headline: optional(content.headline),
    summary: cleanLines(content.summary),
    experience: content.experience.map((entry) => ({
      ...entry,
      role: entry.role.trim(),
      organization: entry.organization.trim(),
      location: optional(entry.location),
      bullets: cleanLines(entry.bullets),
    })),
    education: content.education.map((entry) => ({
      ...entry,
      degree: entry.degree.trim(),
      school: entry.school.trim(),
      location: optional(entry.location),
      details: cleanLines(entry.details),
    })),
    projects: content.projects.map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      link: entry.link && !blank(entry.link.url) ? { url: entry.link.url.trim() } : null,
      bullets: cleanLines(entry.bullets),
    })),
    skills: content.skills.map((group) => ({ name: optional(group.name), items: cleanLines(group.items) })),
    languages: content.languages.map((language) => ({
      name: language.name.trim(),
      level: optional(language.level),
    })),
    certificates: content.certificates.map((certificate) => ({
      ...certificate,
      name: certificate.name.trim(),
      issuer: optional(certificate.issuer),
    })),
  };
}

/**
 * What the live preview renders: the cleaned content without the parts that are still being typed (an entry
 * without its required fields, a half-typed year or link), so the preview keeps up while a new entry is filled in.
 */
export function previewContent(content: CvContent, fallbackName: string): CvContent {
  const errors = validateContent(content);
  const ok = (path: string) => !(path in errors);
  const date = (path: string, value: CvDate) => (ok(path) ? value : null);
  const cleaned = cleanContent(content);
  return {
    ...cleaned,
    contact: {
      ...cleaned.contact,
      name: cleaned.contact.name || fallbackName,
      email: ok("contact.email") ? cleaned.contact.email : null,
      links: content.contact.links
        .map((link, index) => ({ link, index }))
        .filter(({ link, index }) => !blank(link.url) && ok(`contact.links.${index}`))
        .map(({ link }) => ({ url: link.url.trim() })),
    },
    experience: cleaned.experience
      .map((entry, index) => ({
        ...entry,
        start: date(`experience.${index}.start`, entry.start),
        end: date(`experience.${index}.end`, entry.end),
      }))
      .filter((_, index) => ok(`experience.${index}.role`) && ok(`experience.${index}.organization`)),
    education: cleaned.education
      .map((entry, index) => ({
        ...entry,
        start: date(`education.${index}.start`, entry.start),
        end: date(`education.${index}.end`, entry.end),
      }))
      .filter((_, index) => ok(`education.${index}.degree`) && ok(`education.${index}.school`)),
    projects: cleaned.projects
      .map((entry, index) => ({
        ...entry,
        link: ok(`projects.${index}.link`) ? entry.link : null,
        start: date(`projects.${index}.start`, entry.start),
        end: date(`projects.${index}.end`, entry.end),
      }))
      .filter((_, index) => ok(`projects.${index}.name`)),
    skills: cleaned.skills.filter((_, index) => ok(`skills.${index}.items`)),
    languages: cleaned.languages.filter((_, index) => ok(`languages.${index}.name`)),
    certificates: cleaned.certificates
      .map((certificate, index) => ({ ...certificate, date: date(`certificates.${index}.date`, certificate.date) }))
      .filter((_, index) => ok(`certificates.${index}.name`)),
  };
}

/** The field id the editor gives each path, so a failed save can focus the first problem. */
export function fieldId(path: string): string {
  return `cv-${path.replaceAll(".", "-")}`;
}

/** Paths in the order they appear on screen, for focusing the first error. */
export function firstErrorPath(errors: FieldErrors, sectionOrder: CvSectionKey[]): string | null {
  const order = ["contact", ...sectionOrder];
  const paths = Object.keys(errors).sort((a, b) => {
    const [sectionA, indexA = "0"] = a.split(".");
    const [sectionB, indexB = "0"] = b.split(".");
    return order.indexOf(sectionA) - order.indexOf(sectionB) || Number(indexA) - Number(indexB);
  });
  return paths[0] ?? null;
}
