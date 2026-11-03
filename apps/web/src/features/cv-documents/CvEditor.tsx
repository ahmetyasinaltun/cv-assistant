"use client";

// The CV editor: section cards that open in place on the left, the live page preview beside them (a dialog on
// phones), and Save / Download PDF on the band. Changes stay in the page until Save; leaving with unsaved changes asks.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { BandPage } from "@/components/BandPage";
import { onBrandButtonClass, onBrandPrimaryButtonClass, secondaryButtonClass } from "@/components/button-styles";
import { FormAlert } from "@/components/form/FormAlert";
import { textActionClass } from "@/components/form/field-styles";
import type { Dictionary } from "@/i18n/dictionaries";
import { interpolate, pluralize } from "@/i18n/format";
import type { CvContent, CvDocument, CvSectionKey, CvTemplateId, Language } from "@/lib/api/types";

import { saveCv, type SaveErrorKey } from "./actions";
import {
  cleanContent,
  countMarkedLines,
  fieldId,
  firstErrorPath,
  moveItem,
  moveSection,
  newCertificate,
  newEntry,
  newLanguage,
  newSkillGroup,
  previewContent,
  summaryText,
  toggleSection,
  validateContent,
  type FieldErrors,
  type ListKind,
} from "./cv-model";
import { CvPreview } from "./editor/CvPreview";
import { CloseIcon, DownloadIcon, InfoIcon, PageIcon } from "./editor/icons";
import {
  CertificatesFields,
  ContactFields,
  EducationFields,
  ExperienceFields,
  LanguagesFields,
  ProjectFields,
  SkillsFields,
  SummaryField,
  type EditorApi,
} from "./editor/section-fields";
import { SectionCard } from "./editor/SectionCard";
import { TailoringPanel } from "./editor/TailoringPanel";
import type { ImportNotice } from "./import-notice";

const LIST_KINDS: ListKind[] = ["experience", "education", "projects", "skills", "languages", "certificates"];
type Keys = Record<ListKind, string[]>;

interface RemovedEntry {
  kind: ListKind;
  index: number;
  key: string;
  item: unknown;
  name: string;
}

/** What a removed entry is called in the undo note: its title, or the "new …" label while it has none. */
function entryName(kind: ListKind, item: Record<string, unknown>, fallback: string): string {
  const field = { experience: "role", education: "degree", projects: "name", skills: "name", languages: "name", certificates: "name" }[kind];
  const value = item[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

interface CvEditorProps {
  document: CvDocument;
  locale: string;
  /** The account's name, printed while the name field is empty. */
  fallbackName: string;
  importNotice: ImportNotice | null;
  /** For a tailored CV: the analysed posting and its analysis, while the analysis still exists. */
  posting?: { title: string; href: string } | null;
  labels: Dictionary["cvs"];
}

function snapshotOf(title: string, language: Language, template: CvTemplateId, content: CvContent): string {
  return JSON.stringify({ title: title.trim(), language, template, content: cleanContent(content) });
}

function subscribeWide(callback: () => void) {
  const query = window.matchMedia("(min-width: 1024px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** True beside a wide layout; the preview then sits next to the form instead of in a dialog. */
function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

function sectionOf(path: string): string {
  return path === "title" ? "contact" : path.split(".")[0];
}

export function CvEditor({
  document: saved,
  locale,
  fallbackName,
  importNotice,
  posting = null,
  labels,
}: CvEditorProps) {
  const editor = labels.editor;
  const router = useRouter();
  const pathname = usePathname();
  const isWide = useIsWide();
  const nextKey = useRef(0);
  const makeKey = () => `entry${(nextKey.current += 1)}`;

  const [title, setTitle] = useState(saved.title);
  const [language, setLanguage] = useState<Language>(saved.language);
  const [template, setTemplate] = useState<CvTemplateId>(saved.template);
  const [content, setContent] = useState<CvContent>(saved.content);
  const [snapshot, setSnapshot] = useState(() =>
    snapshotOf(saved.title, saved.language, saved.template, saved.content),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<SaveErrorKey | null>(null);
  const [notice, setNotice] = useState(importNotice);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [removed, setRemoved] = useState<RemovedEntry | null>(null);
  const [questions, setQuestions] = useState(saved.questions);
  const [isSaving, startSaving] = useTransition();
  const [isDownloading, startDownload] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** Field to focus after a failed save, once the render has opened its card. */
  const pendingFocus = useRef<string | null>(null);

  const [keys, setKeys] = useState<Keys>(() => {
    let counter = 0;
    const entry = () => `saved${(counter += 1)}`;
    return Object.fromEntries(LIST_KINDS.map((kind) => [kind, saved.content[kind].map(entry)])) as Keys;
  });
  // The first section with entries opens with its first entry, so the editor never starts as a wall of closed cards.
  const firstFilled = saved.content.sections.find(
    (section) => section.key !== "summary" && saved.content[section.key].length > 0,
  )?.key;
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(["contact", ...(firstFilled ? [firstFilled] : [])]),
  );
  const [openEntries, setOpenEntries] = useState<Set<string>>(
    () => new Set(firstFilled && firstFilled !== "summary" ? [keys[firstFilled as ListKind][0]] : []),
  );

  const isDirty = snapshotOf(title, language, template, content) !== snapshot;
  const preview = useMemo(() => previewContent(content, fallbackName), [content, fallbackName]);
  const pdfUrl = `/${locale}/cvs/${saved.id}/pdf`;

  // Unsaved edits are easy to lose by closing or reloading the tab, or by following a link in the page; ask first.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    // Capture on the document runs before Next's link handler, so a "stay" stops the client-side navigation too.
    const guardLinks = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || link.hasAttribute("download") || link.getAttribute("target") === "_blank") return;
      if (!window.confirm(editor.leaveQuestion)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    window.document.addEventListener("click", guardLinks, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.document.removeEventListener("click", guardLinks, true);
    };
  }, [isDirty, editor.leaveQuestion]);

  // After a failed save the first problem takes focus, once its card has opened.
  useEffect(() => {
    if (!pendingFocus.current) return;
    const target = window.document.getElementById(fieldId(pendingFocus.current));
    pendingFocus.current = null;
    target?.focus();
    target?.scrollIntoView({ block: "center" });
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (previewOpen && !dialog.open) dialog.showModal();
    if (!previewOpen && dialog.open) dialog.close();
  }, [previewOpen]);

  function clearError(path: string | null) {
    if (path && path in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[path];
        return next;
      });
    }
  }

  function changeList(kind: ListKind, items: (list: unknown[]) => unknown[], keyChange: (list: string[]) => string[]) {
    setContent((current) => ({ ...current, [kind]: items(current[kind]) }));
    setKeys((current) => ({ ...current, [kind]: keyChange(current[kind]) }));
  }

  const api: EditorApi = {
    content,
    locale,
    labels: editor,
    update(path, change) {
      setContent(change);
      clearError(path);
    },
    error(path) {
      const key = errors[path];
      return key ? editor.errors[key] : null;
    },
    keyOf: (kind, index) => keys[kind][index],
    isOpen: (kind, index) => openEntries.has(keys[kind][index]),
    toggle(kind, index) {
      const key = keys[kind][index];
      setOpenEntries((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    add(kind) {
      const key = makeKey();
      const created =
        kind === "experience" || kind === "education" || kind === "projects"
          ? newEntry(kind as "experience")
          : kind === "skills"
            ? newSkillGroup()
            : kind === "languages"
              ? newLanguage()
              : newCertificate();
      const index = content[kind].length;
      changeList(kind, (list) => [...list, created], (list) => [...list, key]);
      setRemoved(null);
      setOpenEntries((current) => new Set(current).add(key));
      const firstField = { experience: "role", education: "degree", projects: "name", skills: "name", languages: "name", certificates: "name" }[kind];
      requestAnimationFrame(() => window.document.getElementById(fieldId(`${kind}.${index}.${firstField}`))?.focus());
    },
    remove(kind, index) {
      const item = content[kind][index];
      setRemoved({
        kind,
        index,
        key: keys[kind][index],
        item,
        name: entryName(kind, item as unknown as Record<string, unknown>, editor.newEntry[kind]),
      });
      changeList(
        kind,
        (list) => list.filter((_, at) => at !== index),
        (list) => list.filter((_, at) => at !== index),
      );
      // Errors are keyed by position, so they are recounted at the next save.
      setErrors({});
    },
    removed: removed && { kind: removed.kind, name: removed.name },
    undoRemove() {
      if (!removed) return;
      const insert = <T,>(list: T[], value: T) => [
        ...list.slice(0, removed.index),
        value,
        ...list.slice(removed.index),
      ];
      changeList(removed.kind, (list) => insert(list, removed.item), (list) => insert(list, removed.key));
      setRemoved(null);
    },
    move(kind, index, delta) {
      changeList(kind, (list) => moveItem(list, index, delta), (list) => moveItem(list, index, delta));
      setRemoved(null);
      setErrors({});
    },
  };

  function toggleOpenSection(key: string) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** Validates, then saves; on a problem opens the cards that hold it and focuses the first one. */
  async function save(): Promise<boolean> {
    setSaveError(null);
    const found = validateContent(content);
    if (!title.trim()) found.title = "required";
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setSaveError("invalid");
      setOpenSections((current) => new Set([...current, ...Object.keys(found).map(sectionOf)]));
      setOpenEntries((current) => {
        const next = new Set(current);
        for (const path of Object.keys(found)) {
          const [kind, index] = path.split(".");
          if (LIST_KINDS.includes(kind as ListKind)) next.add(keys[kind as ListKind][Number(index)]);
        }
        return next;
      });
      pendingFocus.current = found.title
        ? "title"
        : firstErrorPath(found, content.sections.map((section) => section.key));
      return false;
    }
    const cleaned = cleanContent(content);
    const result = await saveCv(locale, saved.id, { title: title.trim(), language, template, content: cleaned });
    if (!result.ok) {
      setSaveError(result.error);
      return false;
    }
    setErrors({});
    setSnapshot(snapshotOf(title, language, template, cleaned));
    return true;
  }

  function handleSave() {
    startSaving(async () => {
      await save();
    });
  }

  function handleDownload() {
    startDownload(async () => {
      // The PDF is made from the saved CV, so unsaved changes are saved first.
      if (isDirty && !(await save())) return;
      const link = window.document.createElement("a");
      link.href = pdfUrl;
      link.download = "";
      link.click();
    });
  }

  function dismissNotice() {
    setNotice(null);
    // The note is shown once; the address loses it so a reload does not bring it back.
    router.replace(pathname, { scroll: false });
  }

  const sectionTitles = editor.sections;
  const sectionKeys = content.sections.map((section) => section.key);
  const busy = isSaving || isDownloading;
  const status = isSaving ? editor.saving : isDirty ? editor.unsaved : editor.saved;

  function sectionSummary(key: CvSectionKey): string {
    switch (key) {
      case "summary":
        return summaryText(content.summary) || editor.empty.summary;
      case "experience":
        return content.experience.map((e) => [e.role, e.organization].filter(Boolean).join(" · ")).join(", ");
      case "education":
        return content.education.map((e) => [e.degree, e.school].filter(Boolean).join(" · ")).join(", ");
      case "projects":
        return content.projects.map((e) => e.name).join(", ");
      case "skills":
        return content.skills.flatMap((group) => group.items.map((item) => item.text)).join(", ");
      case "languages":
        return content.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ");
      case "certificates":
        return content.certificates.map((c) => c.name).join(", ");
    }
  }

  function sectionBody(key: CvSectionKey) {
    switch (key) {
      case "summary":
        return <SummaryField api={api} />;
      case "experience":
        return <ExperienceFields api={api} />;
      case "education":
        return <EducationFields api={api} />;
      case "projects":
        return <ProjectFields api={api} />;
      case "skills":
        return <SkillsFields api={api} />;
      case "languages":
        return <LanguagesFields api={api} />;
      case "certificates":
        return <CertificatesFields api={api} />;
    }
  }

  const previewPanel = (fitHeight: boolean) => (
    <CvPreview
      locale={locale}
      template={template}
      onTemplateChange={setTemplate}
      language={language}
      content={preview}
      labels={editor.preview}
      templateNames={labels.templates}
      fitHeight={fitHeight}
    />
  );

  const rewordedCount = countMarkedLines(saved.content, "ai_reworded");

  return (
    <BandPage
      title={title.trim() || saved.title}
      breadcrumb={
        <Link
          href={`/${locale}/cvs`}
          className="underline decoration-white/30 underline-offset-[3px] transition-colors duration-150 hover:text-on-brand hover:decoration-white/70"
        >
          {labels.list.title}
        </Link>
      }
      meta={
        <>
          {labels.languageNames[language]} · {saved.kind === "tailored" ? editor.source.tailored : saved.resume_id ? editor.source.resume : editor.source.blank} ·{" "}
          <span aria-live="polite">{status}</span>
        </>
      }
      action={
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={handleDownload} disabled={busy} className={`${onBrandButtonClass} disabled:opacity-60`}>
            <DownloadIcon size={17} />
            {isDownloading ? editor.saving : editor.download}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !isDirty}
            className={`${onBrandPrimaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSaving ? editor.saving : editor.save}
          </button>
        </div>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 space-y-3">
          <FormAlert message={saveError ? editor.saveErrors[saveError] : null} />

          {notice && (
            <div className="flex gap-2.5 rounded-[10px] bg-accent-tint px-3.5 py-3 text-[15px] leading-[1.5] text-ink">
              <InfoIcon size={18} className="mt-[3px] shrink-0 text-accent-hover" />
              <div className="min-w-0 flex-1 space-y-1">
                <p>
                  <strong className="font-semibold">{editor.import.title}</strong>
                  {rewordedCount > 0 && (
                    <>
                      {" "}
                      {pluralize(locale, rewordedCount, editor.import.reworded)}{" "}
                      <span className="rounded-[6px] bg-desk-deep px-2 py-0.5 text-[12.5px] font-semibold whitespace-nowrap text-ink-soft">
                        {editor.origins.ai_reworded}
                      </span>
                      .
                    </>
                  )}
                </p>
                {notice.omitted.length > 0 && (
                  <p>{interpolate(editor.import.omitted, { list: notice.omitted.join(", ") })}</p>
                )}
                {notice.unsupported.length > 0 && (
                  <p>
                    {interpolate(editor.import.unsupported, {
                      list: notice.unsupported.map((fact) => fact.value).join(", "),
                    })}
                    {notice.unsupported.some((fact) => fact.kind === "date") && ` ${editor.import.datesLeftOut}`}
                  </p>
                )}
              </div>
              <button type="button" onClick={dismissNotice} className={`${textActionClass} self-start`}>
                {editor.import.dismiss}
              </button>
            </div>
          )}

          {saved.kind === "tailored" && saved.tailoring_mode && (
            <TailoringPanel
              documentId={saved.id}
              locale={locale}
              mode={saved.tailoring_mode}
              posting={posting}
              fallbackTitle={saved.title}
              content={content}
              questions={questions}
              isDirty={isDirty}
              onAnswered={(document) => {
                // Answers only add confirmed lines; nothing was unsaved, so the server's copy becomes the saved state.
                setContent(document.content);
                setQuestions(document.questions);
                setKeys((current) => ({
                  ...current,
                  experience: document.content.experience.map((_, index) => current.experience[index] ?? makeKey()),
                  projects: document.content.projects.map((_, index) => current.projects[index] ?? makeKey()),
                }));
                setSnapshot(snapshotOf(title, language, template, document.content));
              }}
              labels={labels.tailor.panel}
              editorLabels={editor}
            />
          )}

          {!isWide && (
            <button type="button" onClick={() => setPreviewOpen(true)} className={`${secondaryButtonClass} w-full`}>
              <PageIcon size={17} />
              {editor.preview.show}
            </button>
          )}

          <SectionCard
            id="section-contact"
            title={sectionTitles.contact}
            summary={[content.contact.name, content.contact.email].filter(Boolean).join(" · ")}
            open={openSections.has("contact")}
            onToggle={() => toggleOpenSection("contact")}
            labels={editor}
          >
            <ContactFields
              api={api}
              title={title}
              onTitleChange={(value) => {
                setTitle(value);
                clearError("title");
              }}
              language={language}
              onLanguageChange={setLanguage}
              languageNames={labels.languageNames}
            />
          </SectionCard>

          {content.sections.map((section, index) => {
            const count = section.key === "summary" ? undefined : content[section.key].length;
            return (
              <SectionCard
                key={section.key}
                id={`section-${section.key}`}
                title={sectionTitles[section.key]}
                count={count}
                summary={sectionSummary(section.key) || editor.empty.list}
                open={openSections.has(section.key)}
                onToggle={() => toggleOpenSection(section.key)}
                tools={{
                  visible: section.visible,
                  onToggleVisible: () =>
                    setContent((current) => ({ ...current, sections: toggleSection(current.sections, section.key) })),
                  onMoveUp:
                    index > 0
                      ? () =>
                          setContent((current) => ({
                            ...current,
                            sections: moveSection(current.sections, section.key, -1),
                          }))
                      : undefined,
                  onMoveDown:
                    index < sectionKeys.length - 1
                      ? () =>
                          setContent((current) => ({
                            ...current,
                            sections: moveSection(current.sections, section.key, 1),
                          }))
                      : undefined,
                }}
                labels={editor}
              >
                {sectionBody(section.key)}
              </SectionCard>
            );
          })}
        </div>

        {isWide && <div className="sticky top-4">{previewPanel(true)}</div>}
      </div>

      {!isWide && (
        <dialog
          ref={dialogRef}
          aria-label={editor.preview.label}
          onClose={() => setPreviewOpen(false)}
          className="m-0 h-dvh max-h-none w-full max-w-none overscroll-contain bg-desk p-0 pb-[env(safe-area-inset-bottom)] backdrop:bg-ink/40"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <h2 className="text-[17px] font-bold">{editor.preview.label}</h2>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label={editor.preview.close}
              className="inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-desk"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="p-3">{previewOpen && previewPanel(false)}</div>
        </dialog>
      )}
    </BandPage>
  );
}
