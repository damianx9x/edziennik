"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Download,
  Eye,
  ImagePlus,
  LayoutTemplate,
  MapPinned,
  Megaphone,
  PanelTop,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { Brand } from "@/app/components/brand";
import { defaultSiteContent } from "@/modules/site-content/default-content";
import { optimizeSitePhoto } from "@/modules/site-content/image-optimizer";
import {
  siteContentSchema,
  type SiteContent,
} from "@/modules/site-content/schema";
import { useSiteContent } from "@/modules/site-content/site-content-provider";

type EditorSection =
  | "start"
  | "slider"
  | "offer"
  | "locations"
  | "panels"
  | "contact";

const editorSections: {
  id: EditorSection;
  label: string;
  icon: typeof PanelTop;
}[] = [
  { id: "start", label: "Początek strony", icon: PanelTop },
  { id: "slider", label: "Zdjęcia slidera", icon: ImagePlus },
  { id: "offer", label: "Oferta", icon: Megaphone },
  { id: "locations", label: "Lokalizacje", icon: MapPinned },
  { id: "panels", label: "Panele i funkcje", icon: LayoutTemplate },
  { id: "contact", label: "Kontakt", icon: Settings2 },
];

export function SiteSettingsScreen({
  backHref = "/panel/demo",
  backLabel = "Panel demo",
  protectedMode = false,
}: {
  backHref?: string;
  backLabel?: string;
  protectedMode?: boolean;
}) {
  const { content, isReady, saveContent, resetContent } = useSiteContent();

  if (!isReady) {
    return (
      <main className="content-editor-loading">
        <span>Wczytuję ustawienia strony…</span>
      </main>
    );
  }

  return (
    <SiteContentEditor
      initialContent={content}
      onSave={saveContent}
      onReset={resetContent}
      backHref={backHref}
      backLabel={backLabel}
      protectedMode={protectedMode}
    />
  );
}

function SiteContentEditor({
  initialContent,
  onSave,
  onReset,
  backHref,
  backLabel,
  protectedMode,
}: {
  initialContent: SiteContent;
  onSave: (content: SiteContent) => { ok: boolean; message: string };
  onReset: () => void;
  backHref: string;
  backLabel: string;
  protectedMode: boolean;
}) {
  const [draft, setDraft] = useState(initialContent);
  const [section, setSection] = useState<EditorSection>("start");
  const [status, setStatus] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [workingSlideId, setWorkingSlideId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  function save() {
    const result = onSave(draft);
    setStatus({
      kind: result.ok ? "success" : "error",
      message: result.message,
    });
  }

  function restoreDefaults() {
    if (
      !window.confirm(
        "Przywrócić wszystkie domyślne teksty i zdjęcia? Tej zmiany nie można cofnąć.",
      )
    ) {
      return;
    }
    onReset();
    setDraft(defaultSiteContent);
    setStatus({
      kind: "success",
      message: "Przywrócono domyślną treść KLA.",
    });
  }

  function exportContent() {
    const file = new Blob([JSON.stringify(draft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kla-tresc-strony.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus({
      kind: "success",
      message: "Pobrano kopię treści. Zachowaj ją razem z paczką projektu.",
    });
  }

  async function importContent(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = siteContentSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) throw new Error();
      setDraft(parsed.data);
      setStatus({
        kind: "success",
        message: "Wczytano kopię. Kliknij „Zapisz zmiany”, aby ją zastosować.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "To nie jest poprawny plik treści KLA.",
      });
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function replaceSlidePhoto(slideId: string, file: File | undefined) {
    if (!file) return;
    setWorkingSlideId(slideId);
    setStatus({ kind: "idle", message: "" });
    try {
      const src = await optimizeSitePhoto(file);
      setDraft((current) => ({
        ...current,
        slides: current.slides.map((slide) =>
          slide.id === slideId ? { ...slide, src } : slide,
        ),
      }));
      setStatus({
        kind: "success",
        message: "Zdjęcie przygotowane. Zapisz zmiany, aby je zastosować.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nie udało się przygotować zdjęcia.",
      });
    } finally {
      setWorkingSlideId(null);
    }
  }

  async function addSlide(file: File | undefined) {
    if (!file || draft.slides.length >= 5) return;
    const slideId = `custom-${Date.now()}`;
    setWorkingSlideId(slideId);
    try {
      const src = await optimizeSitePhoto(file);
      setDraft((current) => ({
        ...current,
        slides: [
          ...current.slides,
          {
            id: slideId,
            src,
            alt: "Zdjęcie King’s Language Academy",
            kicker: "Życie KLA",
            title: "Nowe zdjęcie",
            text: "Dodaj krótki opis tego, co pokazuje zdjęcie.",
            position: "center",
          },
        ],
      }));
      setStatus({
        kind: "success",
        message: "Dodano slajd. Uzupełnij opis i zapisz zmiany.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nie udało się dodać zdjęcia.",
      });
    } finally {
      setWorkingSlideId(null);
    }
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.slides.length) return;
    const slides = [...draft.slides];
    [slides[index], slides[target]] = [slides[target], slides[index]];
    setDraft({ ...draft, slides });
  }

  function removeSlide(slideId: string) {
    if (draft.slides.length === 1) return;
    if (!window.confirm("Usunąć to zdjęcie ze slidera?")) return;
    setDraft({
      ...draft,
      slides: draft.slides.filter((slide) => slide.id !== slideId),
    });
  }

  return (
    <main className="content-editor-shell" data-testid="site-content-editor">
      <header className="content-editor-topbar">
        <Brand compact />
        <div>
          <Link className="back-link" href={backHref}>
            <ArrowLeft aria-hidden="true" /> {backLabel}
          </Link>
          <Link className="button button-secondary button-small" href="/" target="_blank">
            <Eye aria-hidden="true" /> Zobacz stronę
          </Link>
        </div>
      </header>

      <div className="content-editor-layout">
        <aside className="content-editor-nav">
          <div>
            <span className="section-kicker">Ustawienia strony</span>
            <h1>Edytuj bez kodu</h1>
            <p>Wybierz fragment strony, zmień treść i zapisz.</p>
          </div>
          <nav aria-label="Sekcje strony">
            {editorSections.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={section === item.id ? "active" : undefined}
                  onClick={() => setSection(item.id)}
                  aria-current={section === item.id ? "page" : undefined}
                >
                  <Icon aria-hidden="true" /> {item.label}
                </button>
              );
            })}
          </nav>
          <div className="editor-demo-note">
            <strong>
              {protectedMode ? "Tryb lokalnego podglądu" : "Tryb demonstracyjny"}
            </strong>
            <span>
              Zmiany są widoczne tylko w tej przeglądarce. Eksportuj kopię,
              żeby przekazać je do publikacji lub przenieść na inny komputer.
            </span>
          </div>
        </aside>

        <section className="content-editor-workspace">
          <div className="content-editor-heading">
            <span className="section-kicker">Treść publicznej strony</span>
            <h2>{editorSections.find((item) => item.id === section)?.label}</h2>
          </div>

          {section === "start" ? (
            <StartFields draft={draft} setDraft={setDraft} />
          ) : null}
          {section === "slider" ? (
            <SliderFields
              draft={draft}
              setDraft={setDraft}
              workingSlideId={workingSlideId}
              replaceSlidePhoto={replaceSlidePhoto}
              addSlide={addSlide}
              moveSlide={moveSlide}
              removeSlide={removeSlide}
            />
          ) : null}
          {section === "offer" ? (
            <OfferFields draft={draft} setDraft={setDraft} />
          ) : null}
          {section === "locations" ? (
            <LocationFields draft={draft} setDraft={setDraft} />
          ) : null}
          {section === "panels" ? (
            <PanelFields draft={draft} setDraft={setDraft} />
          ) : null}
          {section === "contact" ? (
            <ContactFields draft={draft} setDraft={setDraft} />
          ) : null}
        </section>
      </div>

      <div className="content-editor-savebar">
        <div className="editor-file-actions">
          <button
            type="button"
            onClick={exportContent}
            aria-label="Eksportuj kopię treści"
          >
            <Download aria-hidden="true" />
            <span className="editor-action-label-full">Eksportuj kopię</span>
            <span className="editor-action-label-short">Eksport</span>
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            aria-label="Wczytaj kopię treści"
          >
            <Upload aria-hidden="true" />
            <span className="editor-action-label-full">Wczytaj kopię</span>
            <span className="editor-action-label-short">Wczytaj</span>
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            onChange={(event) => importContent(event.target.files?.[0])}
            hidden
          />
          <button
            className="danger-text"
            type="button"
            onClick={restoreDefaults}
            aria-label="Przywróć domyślne treści"
          >
            <RotateCcw aria-hidden="true" />
            <span className="editor-action-label-full">
              Przywróć domyślne
            </span>
            <span className="editor-action-label-short">Domyślne</span>
          </button>
        </div>
        <div className="editor-save-actions">
          {status.kind !== "idle" ? (
            <span
              className={`editor-status editor-status-${status.kind}`}
              role="status"
            >
              {status.kind === "success" ? <Check aria-hidden="true" /> : null}
              {status.message}
            </span>
          ) : null}
          <button
            className="button button-primary"
            type="button"
            onClick={save}
            data-testid="save-site-content"
          >
            <Save aria-hidden="true" /> Zapisz zmiany
          </button>
        </div>
      </div>
    </main>
  );
}

type FieldGroupProps = {
  draft: SiteContent;
  setDraft: React.Dispatch<React.SetStateAction<SiteContent>>;
};

function StartFields({ draft, setDraft }: FieldGroupProps) {
  return (
    <div className="editor-fields">
      <EditorCard title="Główny nagłówek" hint="Pierwsza rzecz, którą widzi rodzic.">
        <TextField
          label="Mały napis nad nagłówkiem"
          value={draft.hero.eyebrow}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              hero: { ...current.hero, eyebrow: value },
            }))
          }
        />
        <div className="editor-two-columns">
          <TextField
            label="Pierwsza część nagłówka"
            value={draft.hero.title}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                hero: { ...current.hero, title: value },
              }))
            }
          />
          <TextField
            label="Czerwona część nagłówka"
            value={draft.hero.accent}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                hero: { ...current.hero, accent: value },
              }))
            }
          />
        </div>
        <TextAreaField
          label="Opis"
          value={draft.hero.description}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              hero: { ...current.hero, description: value },
            }))
          }
        />
        <div className="editor-two-columns">
          <TextField
            label="Przycisk główny"
            value={draft.hero.primaryCta}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                hero: { ...current.hero, primaryCta: value },
              }))
            }
          />
          <TextField
            label="Przycisk dodatkowy"
            value={draft.hero.secondaryCta}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                hero: { ...current.hero, secondaryCta: value },
              }))
            }
          />
        </div>
      </EditorCard>

      <EditorCard title="Liczby pod sliderem" hint="Cztery krótkie fakty o szkole.">
        <div className="editor-proof-grid">
          {draft.proof.map((item, index) => (
            <div key={index}>
              <TextField
                label={`Wartość ${index + 1}`}
                value={item.value}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    proof: current.proof.map((proof, proofIndex) =>
                      proofIndex === index ? { ...proof, value } : proof,
                    ) as SiteContent["proof"],
                  }))
                }
              />
              <TextField
                label={`Opis ${index + 1}`}
                value={item.label}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    proof: current.proof.map((proof, proofIndex) =>
                      proofIndex === index ? { ...proof, label: value } : proof,
                    ) as SiteContent["proof"],
                  }))
                }
              />
            </div>
          ))}
        </div>
      </EditorCard>
    </div>
  );
}

function SliderFields({
  draft,
  setDraft,
  workingSlideId,
  replaceSlidePhoto,
  addSlide,
  moveSlide,
  removeSlide,
}: FieldGroupProps & {
  workingSlideId: string | null;
  replaceSlidePhoto: (id: string, file: File | undefined) => Promise<void>;
  addSlide: (file: File | undefined) => Promise<void>;
  moveSlide: (index: number, direction: -1 | 1) => void;
  removeSlide: (id: string) => void;
}) {
  return (
    <div className="editor-fields">
      <div className="editor-section-callout">
        <div>
          <strong>Do 5 zdjęć</strong>
          <span>
            Aplikacja sama zmniejszy JPG, PNG lub WebP. Nie dodawaj zdjęć dzieci
            bez zatwierdzonej zgody na publikację.
          </span>
        </div>
        <label
          className={`button button-primary button-small ${
            draft.slides.length >= 5 ? "button-disabled" : ""
          }`}
        >
          <ImagePlus aria-hidden="true" /> Dodaj zdjęcie
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={draft.slides.length >= 5}
            onChange={(event) => addSlide(event.target.files?.[0])}
            hidden
          />
        </label>
      </div>

      {draft.slides.map((slide, index) => (
        <EditorCard
          title={`Zdjęcie ${index + 1}`}
          hint={workingSlideId === slide.id ? "Przygotowuję zdjęcie…" : slide.alt}
          key={slide.id}
        >
          <div className="editor-slide-layout">
            <div className="editor-slide-preview">
              <Image
                src={slide.src}
                alt=""
                fill
                unoptimized={slide.src.startsWith("data:")}
                sizes="240px"
                style={{ objectPosition: slide.position }}
              />
            </div>
            <div className="editor-slide-fields">
              <div className="editor-slide-actions">
                <label className="button button-secondary button-small">
                  <Upload aria-hidden="true" /> Zmień zdjęcie
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      replaceSlidePhoto(slide.id, event.target.files?.[0])
                    }
                    hidden
                  />
                </label>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                  aria-label="Przesuń zdjęcie wyżej"
                >
                  <ArrowUp aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => moveSlide(index, 1)}
                  disabled={index === draft.slides.length - 1}
                  aria-label="Przesuń zdjęcie niżej"
                >
                  <ArrowDown aria-hidden="true" />
                </button>
                <button
                  className="icon-button icon-button-danger"
                  type="button"
                  onClick={() => removeSlide(slide.id)}
                  disabled={draft.slides.length === 1}
                  aria-label="Usuń zdjęcie"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
              <TextField
                label="Mały napis"
                value={slide.kicker}
                onChange={(value) =>
                  updateSlide(setDraft, slide.id, { kicker: value })
                }
              />
              <TextField
                label="Nagłówek"
                value={slide.title}
                onChange={(value) =>
                  updateSlide(setDraft, slide.id, { title: value })
                }
              />
              <TextAreaField
                label="Opis"
                value={slide.text}
                onChange={(value) =>
                  updateSlide(setDraft, slide.id, { text: value })
                }
              />
              <TextField
                label="Opis zdjęcia dla dostępności"
                value={slide.alt}
                onChange={(value) =>
                  updateSlide(setDraft, slide.id, { alt: value })
                }
              />
            </div>
          </div>
        </EditorCard>
      ))}
    </div>
  );
}

function OfferFields({ draft, setDraft }: FieldGroupProps) {
  return (
    <div className="editor-fields">
      <EditorCard title="Wprowadzenie do oferty">
        <TextField
          label="Mały napis"
          value={draft.offer.kicker}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              offer: { ...current.offer, kicker: value },
            }))
          }
        />
        <TextField
          label="Nagłówek"
          value={draft.offer.title}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              offer: { ...current.offer, title: value },
            }))
          }
        />
        <TextAreaField
          label="Opis"
          value={draft.offer.text}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              offer: { ...current.offer, text: value },
            }))
          }
        />
      </EditorCard>
      {draft.offer.cards.map((card, index) => (
        <EditorCard title={`Karta oferty ${index + 1}`} key={index}>
          <div className="editor-two-columns">
            <TextField
              label="Krótka etykieta"
              value={card.eyebrow}
              onChange={(value) =>
                updateOfferCard(setDraft, index, { eyebrow: value })
              }
            />
            <TextField
              label="Nagłówek"
              value={card.title}
              onChange={(value) =>
                updateOfferCard(setDraft, index, { title: value })
              }
            />
          </div>
          <TextAreaField
            label="Opis"
            value={card.text}
            onChange={(value) =>
              updateOfferCard(setDraft, index, { text: value })
            }
          />
          <TextField
            label="Dolna informacja"
            value={card.detail}
            onChange={(value) =>
              updateOfferCard(setDraft, index, { detail: value })
            }
          />
        </EditorCard>
      ))}
    </div>
  );
}

function LocationFields({ draft, setDraft }: FieldGroupProps) {
  return (
    <div className="editor-fields">
      <EditorCard title="Sekcja lokalizacji">
        <TextField
          label="Mały napis"
          value={draft.locations.kicker}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              locations: { ...current.locations, kicker: value },
            }))
          }
        />
        <TextField
          label="Nagłówek"
          value={draft.locations.title}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              locations: { ...current.locations, title: value },
            }))
          }
        />
        <TextAreaField
          label="Opis"
          value={draft.locations.text}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              locations: { ...current.locations, text: value },
            }))
          }
        />
        <TextAreaField
          label="Lokalizacje — jedna w każdym wierszu"
          value={draft.locations.items.join("\n")}
          rows={9}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              locations: {
                ...current.locations,
                items: value
                  .split("\n")
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 20),
              },
            }))
          }
        />
      </EditorCard>
    </div>
  );
}

function PanelFields({ draft, setDraft }: FieldGroupProps) {
  return (
    <div className="editor-fields">
      <EditorCard title="Wprowadzenie do eDziennika">
        <TextField
          label="Mały napis"
          value={draft.digital.kicker}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              digital: { ...current.digital, kicker: value },
            }))
          }
        />
        <TextField
          label="Nagłówek"
          value={draft.digital.title}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              digital: { ...current.digital, title: value },
            }))
          }
        />
        <TextAreaField
          label="Opis"
          value={draft.digital.text}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              digital: { ...current.digital, text: value },
            }))
          }
        />
        <TextField
          label="Tekst przycisku"
          value={draft.digital.cta}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              digital: { ...current.digital, cta: value },
            }))
          }
        />
      </EditorCard>
      {draft.digital.roles.map((role, index) => (
        <EditorCard title={`Rola ${index + 1}: ${role.title}`} key={index}>
          <TextField
            label="Nazwa roli"
            value={role.title}
            onChange={(value) => updateRole(setDraft, index, { title: value })}
          />
          <TextAreaField
            label="Opis"
            value={role.text}
            onChange={(value) => updateRole(setDraft, index, { text: value })}
          />
        </EditorCard>
      ))}
      <EditorCard title="Wprowadzenie do funkcji startowych">
        <TextField
          label="Mały napis"
          value={draft.modules.kicker}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              modules: { ...current.modules, kicker: value },
            }))
          }
        />
        <TextField
          label="Nagłówek"
          value={draft.modules.title}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              modules: { ...current.modules, title: value },
            }))
          }
        />
        <TextAreaField
          label="Opis"
          value={draft.modules.text}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              modules: { ...current.modules, text: value },
            }))
          }
        />
      </EditorCard>
      {draft.modules.cards.map((card, index) => (
        <EditorCard title={`Funkcja ${index + 1}`} key={index}>
          <TextField
            label="Nazwa"
            value={card.title}
            onChange={(value) =>
              updateModuleCard(setDraft, index, { title: value })
            }
          />
          <TextAreaField
            label="Opis"
            value={card.text}
            onChange={(value) =>
              updateModuleCard(setDraft, index, { text: value })
            }
          />
          <TextField
            label="Dolna informacja"
            value={card.detail}
            onChange={(value) =>
              updateModuleCard(setDraft, index, { detail: value })
            }
          />
        </EditorCard>
      ))}
    </div>
  );
}

function ContactFields({ draft, setDraft }: FieldGroupProps) {
  return (
    <div className="editor-fields">
      <EditorCard title="Sekcja kontaktowa">
        <TextField
          label="Mały napis"
          value={draft.contact.kicker}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              contact: { ...current.contact, kicker: value },
            }))
          }
        />
        <TextField
          label="Nagłówek"
          value={draft.contact.title}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              contact: { ...current.contact, title: value },
            }))
          }
        />
        <TextAreaField
          label="Opis"
          value={draft.contact.text}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              contact: { ...current.contact, text: value },
            }))
          }
        />
        <div className="editor-two-columns">
          <TextField
            label="Telefon wyświetlany"
            value={draft.contact.phoneDisplay}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                contact: { ...current.contact, phoneDisplay: value },
              }))
            }
          />
          <TextField
            label="Link telefonu, np. tel:+48533609841"
            value={draft.contact.phoneHref}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                contact: { ...current.contact, phoneHref: value },
              }))
            }
          />
        </div>
        <TextField
          label="E-mail"
          type="email"
          value={draft.contact.email}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              contact: { ...current.contact, email: value },
            }))
          }
        />
        <TextField
          label="Adres profilu Facebook"
          type="url"
          value={draft.contact.facebookUrl}
          onChange={(value) =>
            setDraft((current) => ({
              ...current,
              contact: { ...current.contact, facebookUrl: value },
            }))
          }
        />
      </EditorCard>
    </div>
  );
}

function EditorCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="editor-card">
      <header>
        <h3>{title}</h3>
        {hint ? <p>{hint}</p> : null}
      </header>
      <div className="editor-card-fields">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url";
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        maxLength={300}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="editor-field">
      <span>{label}</span>
      <textarea
        value={value}
        rows={rows}
        maxLength={1800}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function updateSlide(
  setDraft: FieldGroupProps["setDraft"],
  slideId: string,
  patch: Partial<SiteContent["slides"][number]>,
) {
  setDraft((current) => ({
    ...current,
    slides: current.slides.map((slide) =>
      slide.id === slideId ? { ...slide, ...patch } : slide,
    ),
  }));
}

function updateOfferCard(
  setDraft: FieldGroupProps["setDraft"],
  index: number,
  patch: Partial<SiteContent["offer"]["cards"][number]>,
) {
  setDraft((current) => ({
    ...current,
    offer: {
      ...current.offer,
      cards: current.offer.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, ...patch } : card,
      ) as SiteContent["offer"]["cards"],
    },
  }));
}

function updateRole(
  setDraft: FieldGroupProps["setDraft"],
  index: number,
  patch: Partial<SiteContent["digital"]["roles"][number]>,
) {
  setDraft((current) => ({
    ...current,
    digital: {
      ...current.digital,
      roles: current.digital.roles.map((role, roleIndex) =>
        roleIndex === index ? { ...role, ...patch } : role,
      ) as SiteContent["digital"]["roles"],
    },
  }));
}

function updateModuleCard(
  setDraft: FieldGroupProps["setDraft"],
  index: number,
  patch: Partial<SiteContent["modules"]["cards"][number]>,
) {
  setDraft((current) => ({
    ...current,
    modules: {
      ...current.modules,
      cards: current.modules.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, ...patch } : card,
      ) as SiteContent["modules"]["cards"],
    },
  }));
}
