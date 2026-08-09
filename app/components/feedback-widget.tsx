"use client";

import {
  Bug,
  Camera,
  CheckCircle2,
  Download,
  Mail,
  MonitorSmartphone,
  Paperclip,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getClientEvents,
  recordClientEvent,
} from "../../modules/observability/client-events";
import { sanitizeDiagnosticText } from "../../modules/observability/sanitize";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "kingsjezykiobce@gmail.com";
const appRelease =
  process.env.NEXT_PUBLIC_APP_RELEASE ?? "0.4.0-stage-1";

const roleLabels = {
  "system-owner": "Obsługa techniczna",
  student: "Uczeń",
  parent: "Rodzic",
  teacher: "Wykładowca",
  director: "Dyrektor",
  guest: "Gość / strona szkoły",
} as const;

type FeedbackRole = keyof typeof roleLabels;

function isFeedbackRole(value: unknown): value is FeedbackRole {
  return typeof value === "string" && value in roleLabels;
}
type FeedbackStatus =
  | { kind: "idle" }
  | { kind: "working"; message: string }
  | { kind: "success"; message: string; reference: string }
  | { kind: "error"; message: string };

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<FeedbackRole>("guest");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [captureArmed, setCaptureArmed] = useState(false);
  const [status, setStatus] = useState<FeedbackStatus>({ kind: "idle" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const screenshotUrl = useMemo(
    () => (screenshot ? URL.createObjectURL(screenshot) : null),
    [screenshot],
  );

  useEffect(() => {
    return () => {
      if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    };
  }, [screenshotUrl]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      recordClientEvent({
        code: "window_error",
        level: "error",
        message: event.message,
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordClientEvent({
        code: "unhandled_rejection",
        level: "error",
        message: sanitizeDiagnosticText(event.reason),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    recordClientEvent({ code: "app_ready", level: "info" });

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener(
        "unhandledrejection",
        onUnhandledRejection,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const triggerElement = triggerRef.current;
    document.body.style.overflow = "hidden";
    descriptionRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusableElements.item(0);
      const last = focusableElements.item(focusableElements.length - 1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerElement?.focus();
    };
  }, [isOpen]);

  function openDialog() {
    const panelRole = document.querySelector<HTMLElement>(
      "[data-feedback-role]",
    )?.dataset.feedbackRole;
    if (isFeedbackRole(panelRole)) {
      setRole(panelRole);
    }
    setIsOpen(true);
    setStatus({ kind: "idle" });
    recordClientEvent({ code: "feedback_opened", level: "info" });
  }

  function closeDialog() {
    setIsOpen(false);
  }

  function armScreenCapture() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus({
        kind: "error",
        message:
          "Ta przeglądarka nie pozwala zrobić zrzutu automatycznie. Dodaj gotowy obraz z urządzenia.",
      });
      return;
    }

    setCaptureArmed(true);
    setIsOpen(false);
    recordClientEvent({ code: "screen_capture_armed", level: "info" });
  }

  async function captureScreen() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus({
        kind: "error",
        message:
          "Ta przeglądarka nie pozwala zrobić zrzutu automatycznie. Skorzystaj z instrukcji i dodaj plik ręcznie.",
      });
      return;
    }

    setCaptureArmed(false);
    setStatus({ kind: "working", message: "Wybierz ekran lub kartę KLA…" });
    recordClientEvent({ code: "screen_capture_started", level: "info" });

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context?.drawImage(video, 0, 0);
      stream.getTracks().forEach((track) => track.stop());

      const blob = await canvasToBlob(canvas);
      const file = new File([blob], `kla-zrzut-${Date.now()}.png`, {
        type: "image/png",
      });
      setScreenshot(file);
      setIsOpen(true);
      setStatus({
        kind: "success",
        message: "Zrzut jest gotowy. Sprawdź podgląd przed udostępnieniem.",
        reference: "",
      });
      recordClientEvent({ code: "screen_capture_ready", level: "info" });
    } catch (error) {
      setIsOpen(true);
      setStatus({
        kind: "error",
        message:
          "Zrzut nie został dodany. Możesz wybrać gotowy obraz z telefonu lub komputera.",
      });
      recordClientEvent({
        code: "screen_capture_cancelled",
        level: "warning",
        message: sanitizeDiagnosticText(error),
      });
    }
  }

  function handleScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setStatus({
        kind: "error",
        message: "Dodaj obraz JPG, PNG lub WebP o rozmiarze do 8 MB.",
      });
      return;
    }

    setScreenshot(file);
    setStatus({
      kind: "success",
      message: "Zrzut dodany. Sprawdź, czy nie pokazuje zbędnych danych.",
      reference: "",
    });
    recordClientEvent({ code: "manual_screenshot_added", level: "info" });
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanDescription = description.trim();

    if (cleanDescription.length < 10) {
      setStatus({
        kind: "error",
        message: "Napisz przynajmniej jedno zdanie: co robisz i co się dzieje.",
      });
      return;
    }

    setStatus({ kind: "working", message: "Przygotowuję bezpieczną paczkę…" });
    const reference = createReference();
    recordClientEvent({ code: "feedback_prepared", level: "info" });
    const diagnostics = buildDiagnostics(reference, role);
    const diagnosticsFile = new File(
      [JSON.stringify(diagnostics, null, 2)],
      `kla-diagnostyka-${reference}.json`,
      { type: "application/json" },
    );
    const files = screenshot
      ? [diagnosticsFile, screenshot]
      : [diagnosticsFile];
    const shareText = createMessage(reference, role, cleanDescription);

    try {
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files })
      ) {
        await navigator.share({
          title: `KLA — zgłoszenie ${reference}`,
          text: shareText,
          files,
        });
        setStatus({
          kind: "success",
          reference,
          message:
            "Paczka została przekazana do wybranej aplikacji. Dziękujemy.",
        });
      } else {
        downloadFile(diagnosticsFile);
        if (screenshot) downloadFile(screenshot);
        setStatus({
          kind: "success",
          reference,
          message:
            "Paczka została pobrana. Otwórz e-mail i dodaj pobrane pliki jako załączniki.",
        });
      }
    } catch (error) {
      if (isShareCancelled(error)) {
        setStatus({
          kind: "error",
          message:
            "Udostępnianie anulowano. Nic nie zostało wysłane — możesz spróbować ponownie.",
        });
      } else {
        setStatus({
          kind: "error",
          message:
            "Nie udało się przygotować zgłoszenia. Pobierz samą diagnostykę i dołącz ją ręcznie.",
        });
      }
    }
  }

  function downloadDiagnostics() {
    const reference = createReference();
    recordClientEvent({ code: "diagnostics_exported", level: "info" });
    const diagnosticsFile = new File(
      [JSON.stringify(buildDiagnostics(reference, role), null, 2)],
      `kla-diagnostyka-${reference}.json`,
      { type: "application/json" },
    );
    downloadFile(diagnosticsFile);
    setStatus({
      kind: "success",
      reference,
      message:
        "Diagnostyka pobrana. Ten plik możesz przekazać osobie technicznej lub Codexowi.",
    });
  }

  const mailtoHref =
    status.kind === "success" && status.reference
      ? createMailto(
          status.reference,
          role,
          description.trim() || "Opis znajduje się w załączonej diagnostyce.",
        )
      : createMailto("", role, description.trim());

  return (
    <>
      {captureArmed ? (
        <div className="feedback-capture-mode" role="status">
          <span>Przejdź do miejsca z błędem</span>
          <button
            className="feedback-capture-trigger"
            type="button"
            onClick={captureScreen}
            aria-label="Zrób zrzut widocznego miejsca"
            title="Zrób zrzut widocznego miejsca"
          >
            <Camera aria-hidden="true" />
            <span>Zrób zrzut</span>
          </button>
          <button
            className="feedback-capture-cancel"
            type="button"
            onClick={() => {
              setCaptureArmed(false);
              setIsOpen(true);
            }}
          >
            Anuluj
          </button>
        </div>
      ) : null}
      <button
        ref={triggerRef}
        className="feedback-trigger"
        type="button"
        onClick={openDialog}
        aria-label="Zgłoś błąd lub problem"
        data-testid="feedback-trigger"
      >
        <Bug aria-hidden="true" />
        <span>Zgłoś problem</span>
      </button>

      {isOpen ? (
        <div className="feedback-layer">
          <button
            className="feedback-backdrop"
            type="button"
            aria-label="Zamknij zgłoszenie"
            onClick={closeDialog}
          />
          <section
            ref={dialogRef}
            className="feedback-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <header className="feedback-header">
              <div>
                <span className="feedback-kicker">Pomoc KLA</span>
                <h2 id="feedback-title">Co nie działa?</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={closeDialog}
                aria-label="Zamknij"
              >
                <X aria-hidden="true" />
              </button>
            </header>

            <form className="feedback-form" onSubmit={submitFeedback}>
              <label>
                Korzystam jako
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as FeedbackRole)
                  }
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Opisz ostatnie kroki
                <textarea
                  ref={descriptionRef}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Np. Otwieram plan, wybieram wtorek i po kliknięciu „Zapisz” nic się nie dzieje."
                  rows={4}
                  maxLength={2000}
                  data-testid="feedback-description"
                />
                <small>
                  Nie wpisuj haseł ani danych innych dzieci. Minimum 10 znaków.
                </small>
              </label>

              <div className="feedback-capture">
                <div>
                  <strong>Dodaj zrzut ekranu</strong>
                  <span>Opcjonalnie — zawsze zobaczysz podgląd.</span>
                </div>
                <div className="capture-actions">
                  <button
                    className="button button-secondary button-small"
                    type="button"
                    onClick={armScreenCapture}
                  >
                    <Camera aria-hidden="true" /> Wskaż miejsce błędu
                  </button>
                  <label className="button button-secondary button-small upload-button">
                    <Paperclip aria-hidden="true" /> Dodaj plik
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleScreenshot}
                    />
                  </label>
                </div>
                {screenshotUrl ? (
                  <div className="screenshot-preview">
                    <img src={screenshotUrl} alt="Podgląd dodanego zrzutu" />
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                    >
                      Usuń zrzut
                    </button>
                  </div>
                ) : null}
              </div>

              <PlatformHelp />

              <div className="diagnostics-note">
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>Dołączymy bezpieczną diagnostykę</strong>
                  Wersja aplikacji, typ urządzenia, rozmiar ekranu, adres
                  bieżącej sekcji i ostatnie zdarzenia techniczne — bez haseł,
                  treści rozmów i danych uczniów.
                </span>
              </div>

              {status.kind !== "idle" ? (
                <div
                  className={`feedback-status status-${status.kind}`}
                  role="status"
                >
                  {status.kind === "success" ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : (
                    <MonitorSmartphone aria-hidden="true" />
                  )}
                  <span>
                    {status.message}
                    {status.kind === "success" && status.reference ? (
                      <strong> Numer: {status.reference}</strong>
                    ) : null}
                  </span>
                </div>
              ) : null}

              <div className="feedback-actions">
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={status.kind === "working"}
                  data-testid="prepare-feedback"
                >
                  <Mail aria-hidden="true" />
                  Przygotuj zgłoszenie
                </button>
                <button
                  className="button button-quiet"
                  type="button"
                  onClick={downloadDiagnostics}
                  data-testid="download-diagnostics"
                >
                  <Download aria-hidden="true" />
                  Tylko plik dla pomocy
                </button>
              </div>

              {status.kind === "success" ? (
                <a className="manual-email-link" href={mailtoHref}>
                  Otwórz e-mail do KLA
                </a>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function PlatformHelp() {
  return (
    <details className="platform-help">
      <summary>
        <MonitorSmartphone aria-hidden="true" />
        Jak zrobić zrzut na moim urządzeniu?
      </summary>
      <div className="platform-grid">
        <span>
          <strong>iPhone / iPad</strong>
          Przycisk boczny + zwiększanie głośności.
        </span>
        <span>
          <strong>Android</strong>
          Zasilanie + zmniejszanie głośności.
        </span>
        <span>
          <strong>macOS</strong>
          Shift + Command + 4.
        </span>
        <span>
          <strong>Windows</strong>
          Windows + Shift + S.
        </span>
      </div>
    </details>
  );
}

function buildDiagnostics(reference: string, role: FeedbackRole) {
  const userAgent = navigator.userAgent;

  return {
    schemaVersion: 1,
    reference,
    generatedAt: new Date().toISOString(),
    release: appRelease,
    context: {
      role,
      route: window.location.pathname,
      locale: navigator.language,
      online: navigator.onLine,
      platform: detectPlatform(userAgent),
      browser: detectBrowser(userAgent),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
      },
    },
    privacy:
      "Pakiet nie zawiera haseł, treści wiadomości ani danych uczniów. Komunikaty techniczne są automatycznie redagowane.",
    events: getClientEvents(),
  };
}

function detectPlatform(userAgent: string) {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS/iPadOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "inne";
}

function detectBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Chrome\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent)) return "Safari";
  return "inna przeglądarka";
}

function createReference() {
  const random =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `KLA-${random.toUpperCase()}`;
}

function createMessage(
  reference: string,
  role: FeedbackRole,
  description: string,
) {
  return [
    `Numer: ${reference}`,
    `Rola: ${roleLabels[role]}`,
    `Sekcja: ${window.location.pathname}`,
    "",
    description,
    "",
    "Do wiadomości dołączono bezpieczną diagnostykę i — jeśli wybrano — zrzut ekranu.",
  ].join("\n");
}

function createMailto(
  reference: string,
  role: FeedbackRole,
  description: string,
) {
  const subject = encodeURIComponent(
    `KLA — zgłoszenie problemu${reference ? ` ${reference}` : ""}`,
  );
  const body = encodeURIComponent(
    [
      reference ? `Numer: ${reference}` : "",
      `Rola: ${roleLabels[role]}`,
      typeof window === "undefined"
        ? ""
        : `Sekcja: ${window.location.pathname}`,
      "",
      description,
      "",
      "Proszę dodać pobrany plik diagnostyczny i zrzut ekranu jako załączniki.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Nie udało się utworzyć obrazu."));
    }, "image/png");
  });
}

function isShareCancelled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
