"use client";

// The fields inside each CV section card. They read and change the editor's state only through EditorApi, so the
// editor keeps one copy of the CV, the list keys and the field errors.

import { useState, type ReactNode } from "react";

import { secondaryButtonClass } from "@/components/button-styles";
import { FieldError } from "@/components/form/FieldError";
import { hintClass, inputClass, labelClass, textActionClass } from "@/components/form/field-styles";
import { SegmentedChoice } from "@/components/form/SegmentedChoice";
import { TextField } from "@/components/form/TextField";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate } from "@/i18n/format";
import type { CvContent, CvDate, CvLine, Language } from "@/lib/api/types";

import {
  LIMITS,
  fieldId,
  skillsFromText,
  skillsText,
  summaryFromText,
  summaryText,
  type ListKind,
} from "../cv-model";

import { DateField, IconButton, LineList, OriginMark, type EditorLabels } from "./controls";
import { CloseIcon, PlusIcon } from "./icons";
import { EntryBox } from "./SectionCard";

export interface EditorApi {
  content: CvContent;
  locale: string;
  labels: EditorLabels;
  /** Changes the CV; the field at `path` (when given) is no longer in error. */
  update: (path: string | null, change: (content: CvContent) => CvContent) => void;
  error: (path: string) => string | null;
  keyOf: (kind: ListKind, index: number) => string;
  isOpen: (kind: ListKind, index: number) => boolean;
  toggle: (kind: ListKind, index: number) => void;
  add: (kind: ListKind) => void;
  remove: (kind: ListKind, index: number) => void;
  move: (kind: ListKind, index: number, delta: -1 | 1) => void;
  /** The entry removed last, which can still be put back. */
  removed: { kind: ListKind; name: string } | null;
  undoRemove: () => void;
}

/** A removed entry is one click away from coming back, so removing needs no confirmation dialog. */
function RemovedNote({ api, kind }: { api: EditorApi; kind: ListKind }) {
  const removed = api.removed?.kind === kind ? api.removed : null;
  return (
    <div role="status" className="empty:hidden">
      {removed && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[10px] bg-desk px-3.5 py-2.5 text-[15px] text-ink">
          <span className="min-w-0 break-words">{interpolate(api.labels.removed, { name: removed.name })}</span>
          <button type="button" onClick={api.undoRemove} className={textActionClass}>
            {api.labels.undo}
          </button>
        </p>
      )}
    </div>
  );
}

/** Replaces one item of a list in the CV. */
function setItem<K extends ListKind>(kind: K, index: number, patch: Partial<CvContent[K][number]>) {
  return (content: CvContent): CvContent => ({
    ...content,
    [kind]: content[kind].map((item, at) => (at === index ? { ...item, ...patch } : item)),
  });
}

function periodLabel(start: CvDate, end: CvDate, api: EditorApi): string {
  const format = new Intl.DateTimeFormat(api.locale, { month: "short", year: "numeric", timeZone: "UTC" });
  const show = (value: CvDate) => {
    if (!value) return null;
    if (value === "present") return api.labels.fields.ongoing;
    const [year, month] = value.split("-");
    if (!/^\d{4}$/.test(year)) return null;
    return month ? format.format(new Date(Date.UTC(Number(year), Number(month) - 1, 1))) : year;
  };
  return [show(start), show(end)].filter(Boolean).join(" – ");
}

function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${secondaryButtonClass} h-10`}>
      <PlusIcon size={16} />
      {label}
    </button>
  );
}

function entryControls(api: EditorApi, kind: ListKind, index: number, count: number) {
  return {
    open: api.isOpen(kind, index),
    onToggle: () => api.toggle(kind, index),
    onMoveUp: index > 0 ? () => api.move(kind, index, -1) : undefined,
    onMoveDown: index < count - 1 ? () => api.move(kind, index, 1) : undefined,
    onRemove: () => api.remove(kind, index),
    labels: api.labels,
  };
}

// --- Personal details ---------------------------------------------------------------------------------

interface ContactFieldsProps {
  api: EditorApi;
  title: string;
  onTitleChange: (title: string) => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  languageNames: Dictionary["cvs"]["languageNames"];
}

export function ContactFields({ api, title, onTitleChange, language, onLanguageChange, languageNames }: ContactFieldsProps) {
  const { content, labels } = api;
  const fields = labels.fields;
  const contact = content.contact;
  const setContact = (path: string, patch: Partial<CvContent["contact"]>) =>
    api.update(path, (current) => ({ ...current, contact: { ...current.contact, ...patch } }));

  return (
    <div className="space-y-5">
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <TextField
          id={fieldId("title")}
          autoComplete="off"
          label={fields.docTitle}
          hint={fields.docTitleHint}
          value={title}
          maxLength={150}
          error={api.error("title")}
          onChange={(event) => onTitleChange(event.target.value)}
        />
        <div>
          <SegmentedChoice
            name="cv-language"
            legend={fields.language}
            value={language}
            options={[
              { value: "tr", label: languageNames.tr },
              { value: "en", label: languageNames.en },
            ]}
            onChange={onLanguageChange}
          />
          <p className={hintClass}>{fields.languageHint}</p>
        </div>
      </div>
      <div className="border-t border-rule" />
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <TextField
          id={fieldId("contact.name")}
          label={fields.name}
          value={contact.name}
          maxLength={LIMITS.shortText}
          autoComplete="name"
          error={api.error("contact.name")}
          onChange={(event) => setContact("contact.name", { name: event.target.value })}
        />
        <TextField
          id={fieldId("headline")}
          autoComplete="off"
          label={fields.headline}
          labelNote={fields.optional}
          hint={fields.headlineHint}
          value={content.headline ?? ""}
          maxLength={LIMITS.shortText}
          onChange={(event) => api.update(null, (current) => ({ ...current, headline: event.target.value }))}
        />
        <TextField
          id={fieldId("contact.email")}
          label={fields.email}
          labelNote={fields.optional}
          type="email"
          autoComplete="email"
          spellCheck={false}
          value={contact.email ?? ""}
          maxLength={LIMITS.shortText}
          error={api.error("contact.email")}
          onChange={(event) => setContact("contact.email", { email: event.target.value })}
        />
        <TextField
          id={fieldId("contact.phone")}
          label={fields.phone}
          labelNote={fields.optional}
          type="tel"
          autoComplete="tel"
          value={contact.phone ?? ""}
          maxLength={LIMITS.shortText}
          onChange={(event) => setContact("contact.phone", { phone: event.target.value })}
        />
        <TextField
          id={fieldId("contact.location")}
          autoComplete="off"
          label={fields.location}
          labelNote={fields.optional}
          value={contact.location ?? ""}
          maxLength={LIMITS.shortText}
          onChange={(event) => setContact("contact.location", { location: event.target.value })}
        />
      </div>
      <fieldset>
        <legend className={labelClass}>
          {fields.links} <span className="font-normal text-mute">({fields.optional})</span>
        </legend>
        <ul className="mt-1.5 space-y-2">
          {contact.links.map((link, index) => {
            const path = `contact.links.${index}`;
            const error = api.error(path);
            const label = interpolate(fields.linkLabel, { number: index + 1 });
            return (
              <li key={index}>
                <div className="flex items-center gap-1">
                  <input
                    id={fieldId(path)}
                    type="url"
                    inputMode="url"
                    spellCheck={false}
                    aria-label={label}
                    placeholder="https://github.com/…"
                    value={link.url}
                    maxLength={LIMITS.url}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${fieldId(path)}-error` : undefined}
                    onChange={(event) =>
                      setContact(path, {
                        links: contact.links.map((item, at) => (at === index ? { url: event.target.value } : item)),
                      })
                    }
                    className={inputClass}
                  />
                  <IconButton
                    label={`${labels.tools.remove}: ${label}`}
                    onClick={() =>
                      setContact(path, { links: contact.links.filter((_, at) => at !== index) })
                    }
                  >
                    <CloseIcon size={16} />
                  </IconButton>
                </div>
                <FieldError id={`${fieldId(path)}-error`} message={error} />
              </li>
            );
          })}
        </ul>
        {contact.links.length < LIMITS.links && (
          <button
            type="button"
            onClick={() => setContact("", { links: [...contact.links, { url: "" }] })}
            className={`${textActionClass} mt-3 inline-flex items-center gap-1`}
          >
            <PlusIcon size={15} />
            {fields.addLink}
          </button>
        )}
      </fieldset>
    </div>
  );
}

// --- Summary ------------------------------------------------------------------------------------------

export function SummaryField({ api }: { api: EditorApi }) {
  const { content, labels } = api;
  // The text area keeps what is typed (spaces after a full stop included); the CV keeps it as sentences.
  const [draft, setDraft] = useState(() => summaryText(content.summary));
  const marked = content.summary.filter((line) => line.origin !== "cv" && line.origin !== "user");

  return (
    <div>
      <label htmlFor={fieldId("summary")} className={labelClass}>
        {labels.fields.summary}
      </label>
      <p id={`${fieldId("summary")}-hint`} className="mt-0.5 text-[14px] text-mute">
        {labels.fields.summaryHint}
      </p>
      {marked.length > 0 && (
        <div className="mt-2">
          <OriginMark origin={marked[0].origin} labels={labels} />
        </div>
      )}
      <textarea
        id={fieldId("summary")}
        aria-describedby={`${fieldId("summary")}-hint`}
        rows={5}
        maxLength={LIMITS.summaryText}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const text = event.target.value;
          api.update(null, (current) => ({ ...current, summary: summaryFromText(text, current.summary) }));
        }}
        className="mt-1.5 block min-h-32 w-full resize-y rounded-[10px] border border-field-edge bg-paper px-3.5 py-3 text-[15.5px] leading-[1.6] text-ink transition-[border-color] duration-150 [field-sizing:content] hover:border-ink-soft"
      />
    </div>
  );
}

// --- Experience, education, projects ------------------------------------------------------------------

function TwoColumns({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{children}</div>;
}

export function ExperienceFields({ api }: { api: EditorApi }) {
  const { content, labels } = api;
  const fields = labels.fields;
  const entries = content.experience;

  return (
    <div className="space-y-3">
      <RemovedNote api={api} kind="experience" />
      {entries.map((entry, index) => {
        const path = (field: string) => `experience.${index}.${field}`;
        const set = (field: string, patch: Partial<(typeof entries)[number]>) =>
          api.update(path(field), setItem("experience", index, patch));
        return (
          <EntryBox
            key={api.keyOf("experience", index)}
            id={`entry-${api.keyOf("experience", index)}`}
            title={entry.role.trim() || labels.newEntry.experience}
            subtitle={[entry.organization.trim(), periodLabel(entry.start, entry.end, api)].filter(Boolean).join(" · ")}
            {...entryControls(api, "experience", index, entries.length)}
          >
            <TwoColumns>
              <TextField
                id={fieldId(path("role"))}
                autoComplete="off"
                label={fields.role}
                value={entry.role}
                maxLength={LIMITS.shortText}
                error={api.error(path("role"))}
                onChange={(event) => set("role", { role: event.target.value })}
              />
              <TextField
                id={fieldId(path("organization"))}
                autoComplete="off"
                label={fields.organization}
                value={entry.organization}
                maxLength={LIMITS.shortText}
                error={api.error(path("organization"))}
                onChange={(event) => set("organization", { organization: event.target.value })}
              />
              <TextField
                id={fieldId(path("location"))}
                autoComplete="off"
                label={fields.entryLocation}
                labelNote={fields.optional}
                value={entry.location ?? ""}
                maxLength={LIMITS.shortText}
                onChange={(event) => set("location", { location: event.target.value })}
              />
            </TwoColumns>
            <TwoColumns>
              <DateField
                id={fieldId(path("start"))}
                label={fields.start}
                value={entry.start}
                error={api.error(path("start"))}
                locale={api.locale}
                labels={labels}
                onChange={(start) => set("start", { start })}
              />
              <DateField
                id={fieldId(path("end"))}
                label={fields.end}
                value={entry.end}
                allowOngoing
                error={api.error(path("end"))}
                locale={api.locale}
                labels={labels}
                onChange={(end) => set("end", { end })}
              />
            </TwoColumns>
            <LineList
              idPrefix={fieldId(path("bullets"))}
              label={fields.bullets}
              lines={entry.bullets}
              max={LIMITS.lines.experience}
              labels={labels}
              onChange={(bullets) => set("bullets", { bullets })}
            />
          </EntryBox>
        );
      })}
      <AddButton
        label={labels.add.experience}
        onClick={() => api.add("experience")}
        disabled={entries.length >= LIMITS.entries.experience}
      />
    </div>
  );
}

export function EducationFields({ api }: { api: EditorApi }) {
  const { content, labels } = api;
  const fields = labels.fields;
  const entries = content.education;

  return (
    <div className="space-y-3">
      <RemovedNote api={api} kind="education" />
      {entries.map((entry, index) => {
        const path = (field: string) => `education.${index}.${field}`;
        const set = (field: string, patch: Partial<(typeof entries)[number]>) =>
          api.update(path(field), setItem("education", index, patch));
        return (
          <EntryBox
            key={api.keyOf("education", index)}
            id={`entry-${api.keyOf("education", index)}`}
            title={entry.degree.trim() || labels.newEntry.education}
            subtitle={[entry.school.trim(), periodLabel(entry.start, entry.end, api)].filter(Boolean).join(" · ")}
            {...entryControls(api, "education", index, entries.length)}
          >
            <TwoColumns>
              <TextField
                id={fieldId(path("degree"))}
                autoComplete="off"
                label={fields.degree}
                value={entry.degree}
                maxLength={LIMITS.shortText}
                error={api.error(path("degree"))}
                onChange={(event) => set("degree", { degree: event.target.value })}
              />
              <TextField
                id={fieldId(path("school"))}
                autoComplete="off"
                label={fields.school}
                value={entry.school}
                maxLength={LIMITS.shortText}
                error={api.error(path("school"))}
                onChange={(event) => set("school", { school: event.target.value })}
              />
              <TextField
                id={fieldId(path("location"))}
                autoComplete="off"
                label={fields.entryLocation}
                labelNote={fields.optional}
                value={entry.location ?? ""}
                maxLength={LIMITS.shortText}
                onChange={(event) => set("location", { location: event.target.value })}
              />
            </TwoColumns>
            <TwoColumns>
              <DateField
                id={fieldId(path("start"))}
                label={fields.start}
                value={entry.start}
                error={api.error(path("start"))}
                locale={api.locale}
                labels={labels}
                onChange={(start) => set("start", { start })}
              />
              <DateField
                id={fieldId(path("end"))}
                label={fields.end}
                value={entry.end}
                allowOngoing
                error={api.error(path("end"))}
                locale={api.locale}
                labels={labels}
                onChange={(end) => set("end", { end })}
              />
            </TwoColumns>
            <LineList
              idPrefix={fieldId(path("details"))}
              label={fields.details}
              hint={fields.detailsHint}
              lines={entry.details}
              max={LIMITS.lines.education}
              labels={labels}
              onChange={(details) => set("details", { details })}
            />
          </EntryBox>
        );
      })}
      <AddButton
        label={labels.add.education}
        onClick={() => api.add("education")}
        disabled={entries.length >= LIMITS.entries.education}
      />
    </div>
  );
}

export function ProjectFields({ api }: { api: EditorApi }) {
  const { content, labels } = api;
  const fields = labels.fields;
  const entries = content.projects;

  return (
    <div className="space-y-3">
      <RemovedNote api={api} kind="projects" />
      {entries.map((entry, index) => {
        const path = (field: string) => `projects.${index}.${field}`;
        const set = (field: string, patch: Partial<(typeof entries)[number]>) =>
          api.update(path(field), setItem("projects", index, patch));
        return (
          <EntryBox
            key={api.keyOf("projects", index)}
            id={`entry-${api.keyOf("projects", index)}`}
            title={entry.name.trim() || labels.newEntry.projects}
            subtitle={periodLabel(entry.start, entry.end, api)}
            {...entryControls(api, "projects", index, entries.length)}
          >
            <TwoColumns>
              <TextField
                id={fieldId(path("name"))}
                autoComplete="off"
                label={fields.projectName}
                value={entry.name}
                maxLength={LIMITS.shortText}
                error={api.error(path("name"))}
                onChange={(event) => set("name", { name: event.target.value })}
              />
              <TextField
                id={fieldId(path("link"))}
                autoComplete="off"
                label={fields.projectLink}
                labelNote={fields.optional}
                type="url"
                inputMode="url"
                spellCheck={false}
                placeholder="https://github.com/…"
                value={entry.link?.url ?? ""}
                maxLength={LIMITS.url}
                error={api.error(path("link"))}
                onChange={(event) => set("link", { link: { url: event.target.value } })}
              />
            </TwoColumns>
            <TwoColumns>
              <DateField
                id={fieldId(path("start"))}
                label={fields.start}
                value={entry.start}
                error={api.error(path("start"))}
                locale={api.locale}
                labels={labels}
                onChange={(start) => set("start", { start })}
              />
              <DateField
                id={fieldId(path("end"))}
                label={fields.end}
                value={entry.end}
                allowOngoing
                error={api.error(path("end"))}
                locale={api.locale}
                labels={labels}
                onChange={(end) => set("end", { end })}
              />
            </TwoColumns>
            <LineList
              idPrefix={fieldId(path("bullets"))}
              label={fields.bullets}
              lines={entry.bullets}
              max={LIMITS.lines.projects}
              labels={labels}
              onChange={(bullets) => set("bullets", { bullets })}
            />
          </EntryBox>
        );
      })}
      <AddButton
        label={labels.add.projects}
        onClick={() => api.add("projects")}
        disabled={entries.length >= LIMITS.entries.projects}
      />
    </div>
  );
}

// --- Skills, languages, certificates ------------------------------------------------------------------

const rowBoxClass = "flex items-start gap-1 rounded-[10px] border border-rule p-3 sm:p-4";

/** One skill group: its name and its skills as comma-separated text, which keeps each skill's origin. */
function SkillGroupFields({ api, index }: { api: EditorApi; index: number }) {
  const { labels } = api;
  const group = api.content.skills[index];
  const path = `skills.${index}.items`;
  const [draft, setDraft] = useState(() => skillsText(group.items));
  const marked = group.items.filter((item) => item.origin !== "cv" && item.origin !== "user");
  const error = api.error(path);

  return (
    <div className={rowBoxClass}>
      <div className="grid min-w-0 flex-1 gap-x-4 gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <TextField
          id={fieldId(`skills.${index}.name`)}
          autoComplete="off"
          label={labels.fields.groupName}
          hint={labels.fields.groupNameHint}
          value={group.name ?? ""}
          maxLength={LIMITS.shortText}
          onChange={(event) => api.update(null, setItem("skills", index, { name: event.target.value }))}
        />
        <div>
          <label htmlFor={fieldId(path)} className={labelClass}>
            {labels.fields.groupItems}
          </label>
          <textarea
            id={fieldId(path)}
            rows={2}
            value={draft}
            maxLength={2000}
            aria-invalid={error ? true : undefined}
            aria-describedby={[error ? `${fieldId(path)}-error` : "", `${fieldId(path)}-hint`].filter(Boolean).join(" ")}
            onChange={(event) => {
              const text = event.target.value;
              setDraft(text);
              api.update(path, (current) =>
                setItem("skills", index, { items: skillsFromText(text, current.skills[index].items) })(current),
              );
            }}
            className="mt-1.5 block w-full resize-y rounded-[10px] border border-field-edge bg-paper px-3.5 py-2.5 text-[15.5px] leading-[1.5] text-ink transition-[border-color] duration-150 [field-sizing:content] hover:border-ink-soft aria-[invalid=true]:border-marker"
          />
          <FieldError id={`${fieldId(path)}-error`} message={error} />
          <p id={`${fieldId(path)}-hint`} className={hintClass}>
            {labels.fields.groupItemsHint}
          </p>
          {marked.length > 0 && (
            <div className="mt-2">
              <OriginMark origin={marked[0].origin} labels={labels} />
              <p className="text-[14px] text-ink-soft">{marked.map((item: CvLine) => item.text).join(", ")}</p>
            </div>
          )}
        </div>
      </div>
      <IconButton label={`${labels.tools.remove}: ${group.name || labels.newEntry.skills}`} onClick={() => api.remove("skills", index)}>
        <CloseIcon size={16} />
      </IconButton>
    </div>
  );
}

export function SkillsFields({ api }: { api: EditorApi }) {
  return (
    <div className="space-y-3">
      <RemovedNote api={api} kind="skills" />
      {api.content.skills.map((_, index) => (
        <SkillGroupFields key={api.keyOf("skills", index)} api={api} index={index} />
      ))}
      <AddButton
        label={api.labels.add.skills}
        onClick={() => api.add("skills")}
        disabled={api.content.skills.length >= LIMITS.entries.skills}
      />
    </div>
  );
}

export function LanguagesFields({ api }: { api: EditorApi }) {
  const { content, labels } = api;
  return (
    <div className="space-y-3">
      <RemovedNote api={api} kind="languages" />
      {content.languages.map((language, index) => {
        const path = `languages.${index}.name`;
        return (
          <div key={api.keyOf("languages", index)} className={rowBoxClass}>
            <div className="grid min-w-0 flex-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <TextField
                id={fieldId(path)}
                autoComplete="off"
                label={labels.fields.languageName}
                value={language.name}
                maxLength={LIMITS.shortText}
                error={api.error(path)}
                onChange={(event) => api.update(path, setItem("languages", index, { name: event.target.value }))}
              />
              <TextField
                id={fieldId(`languages.${index}.level`)}
                autoComplete="off"
                label={labels.fields.languageLevel}
                labelNote={labels.fields.optional}
                value={language.level ?? ""}
                maxLength={LIMITS.shortText}
                onChange={(event) => api.update(null, setItem("languages", index, { level: event.target.value }))}
              />
            </div>
            <IconButton
              label={`${labels.tools.remove}: ${language.name || labels.newEntry.languages}`}
              onClick={() => api.remove("languages", index)}
            >
              <CloseIcon size={16} />
            </IconButton>
          </div>
        );
      })}
      <AddButton
        label={labels.add.languages}
        onClick={() => api.add("languages")}
        disabled={content.languages.length >= LIMITS.entries.languages}
      />
    </div>
  );
}

export function CertificatesFields({ api }: { api: EditorApi }) {
  const { content, labels } = api;
  return (
    <div className="space-y-3">
      <RemovedNote api={api} kind="certificates" />
      {content.certificates.map((certificate, index) => {
        const path = (field: string) => `certificates.${index}.${field}`;
        return (
          <div key={api.keyOf("certificates", index)} className={rowBoxClass}>
            <div className="grid min-w-0 flex-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <TextField
                id={fieldId(path("name"))}
                autoComplete="off"
                label={labels.fields.certName}
                value={certificate.name}
                maxLength={LIMITS.shortText}
                error={api.error(path("name"))}
                onChange={(event) => api.update(path("name"), setItem("certificates", index, { name: event.target.value }))}
              />
              <TextField
                id={fieldId(path("issuer"))}
                autoComplete="off"
                label={labels.fields.issuer}
                labelNote={labels.fields.optional}
                value={certificate.issuer ?? ""}
                maxLength={LIMITS.shortText}
                onChange={(event) => api.update(null, setItem("certificates", index, { issuer: event.target.value }))}
              />
              <DateField
                id={fieldId(path("date"))}
                label={labels.fields.date}
                value={certificate.date}
                error={api.error(path("date"))}
                locale={api.locale}
                labels={labels}
                onChange={(date) => api.update(path("date"), setItem("certificates", index, { date }))}
              />
            </div>
            <IconButton
              label={`${labels.tools.remove}: ${certificate.name || labels.newEntry.certificates}`}
              onClick={() => api.remove("certificates", index)}
            >
              <CloseIcon size={16} />
            </IconButton>
          </div>
        );
      })}
      <AddButton
        label={labels.add.certificates}
        onClick={() => api.add("certificates")}
        disabled={content.certificates.length >= LIMITS.entries.certificates}
      />
    </div>
  );
}
