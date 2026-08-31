"use client";

import { ArrowLeft, ArrowRight, Bell, BookOpenCheck, CalendarDays, CircleHelp, Download, FileSignature, Home, MessageCircleMore, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { finishOnboardingAction } from "../actions";
import { manualAudienceForRole, manualLabels } from "@/modules/manuals/release";

type Role = "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";
type Step = { title: string; description: string; href: string; label: string; icon: typeof Home };

const commonMessages: Step = { title: "Wiadomości bez szukania czatu", description: "Wybierz grupę. Nowe informacje i historia rozmowy są w jednym miejscu.", href: "/panel/wiadomosci", label: "Otwórz wiadomości", icon: MessageCircleMore };
const steps: Record<Role, Step[]> = {
  DIRECTOR: [
    { title: "Command Center", description: "Tutaj zaczynasz dzień: plan szkoły i sprawy wymagające decyzji.", href: "/panel/szkola", label: "Przejdź do startu", icon: Home },
    { title: "Grafik szkoły", description: "Najpierw zobaczysz kalendarz. Stąd możesz przejść do układania ręcznego albo uruchomić Asystenta.", href: "/panel/plan", label: "Otwórz kalendarz", icon: CalendarDays },
    commonMessages,
    { title: "Umowy i płatności", description: "Umowa jest źródłem kwoty i terminu. Status płatności zmieniasz ręcznie.", href: "/panel/umowy", label: "Otwórz umowy", icon: FileSignature },
    { title: "Centrum powiadomień", description: "Tu trafiają terminy, błędy wysyłki i zmiany oczekujące na decyzję.", href: "/panel/powiadomienia", label: "Zobacz powiadomienia", icon: Bell },
  ],
  TEACHER: [
    { title: "Twój pulpit", description: "Widzisz wyłącznie przypisane grupy i najważniejsze zadania na dziś.", href: "/panel/szkola", label: "Przejdź do startu", icon: Home },
    { title: "Twój plan", description: "Sprawdź zajęcia. Proponowana zmiana trafia do akceptacji dyrektora.", href: "/panel/plan", label: "Otwórz plan", icon: CalendarDays },
    commonMessages,
    { title: "Powiadomienia", description: "Nowe wiadomości i ważne sprawy czekają w jednej kolejce.", href: "/panel/powiadomienia", label: "Zobacz powiadomienia", icon: Bell },
  ],
  PARENT: [
    { title: "Panel rodzica", description: "Plan, wiadomości, umowy i płatności dotyczą tylko powiązanych dzieci.", href: "/panel/rodzic", label: "Przejdź do startu", icon: Home },
    { title: "Plan dzieci", description: "Zobacz opublikowane zajęcia bez dodatkowego ustawiania filtrów.", href: "/panel/plan", label: "Otwórz plan", icon: CalendarDays },
    commonMessages,
    { title: "Umowy i terminy", description: "Najpierw przeczytaj PDF, potem świadomie zaakceptuj dokładną wersję.", href: "/panel/umowy", label: "Otwórz umowy", icon: FileSignature },
    { title: "Powiadomienia", description: "Przypomnimy o umowie, wiadomości lub zbliżającym się terminie.", href: "/panel/powiadomienia", label: "Zobacz powiadomienia", icon: Bell },
  ],
  STUDENT: [
    { title: "Twój start", description: "Najbliższe zajęcia i najważniejsze informacje są pod ręką.", href: "/panel/uczen", label: "Przejdź do startu", icon: Home },
    { title: "Twój plan", description: "Widzisz tylko lekcje grup, do których należysz.", href: "/panel/plan", label: "Otwórz plan", icon: CalendarDays },
    commonMessages,
    { title: "Powiadomienia", description: "Nowe ogłoszenia i wiadomości znajdziesz w jednej kolejce.", href: "/panel/powiadomienia", label: "Zobacz powiadomienia", icon: Bell },
  ],
};

export function OnboardingTour({ role, openInitially }: { role: Role; openInitially: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const manualDialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [offerManual, setOfferManual] = useState(false);
  const roleSteps = steps[role];
  useEffect(() => { if (openInitially && !dismissedLocally && !dialogRef.current?.open) dialogRef.current?.showModal(); }, [openInitially, dismissedLocally]);
  useEffect(() => { if (offerManual && !manualDialogRef.current?.open) manualDialogRef.current?.showModal(); }, [offerManual]);
  const current = roleSteps[step];
  const Icon = current.icon;
  const manualLabel = manualLabels[manualAudienceForRole(role)];
  function close() { dialogRef.current?.close(); setStep(0); }
  function finishInitialTour() { setDismissedLocally(true); close(); setOfferManual(true); }
  function closeManualOffer() { manualDialogRef.current?.close(); setOfferManual(false); }
  return <>
    <button className="app-panel-help" type="button" onClick={() => dialogRef.current?.showModal()} aria-label="Pokaż samouczek"><CircleHelp aria-hidden="true" /></button>
    <dialog ref={dialogRef} className="onboarding-dialog" aria-labelledby="onboarding-title">
      <div className="onboarding-shell">
        <header>
          <span>Krótki samouczek · {step + 1} z {roleSteps.length}</span>
          {openInitially ? (
            <form action={finishOnboardingAction} onSubmit={finishInitialTour}>
              <input type="hidden" name="result" value="dismissed" />
              <button type="submit" aria-label="Zamknij samouczek"><X /></button>
            </form>
          ) : (
            <button type="button" onClick={close} aria-label="Zamknij samouczek"><X /></button>
          )}
        </header>
        <div className="onboarding-progress" aria-hidden="true">{roleSteps.map((_, index) => <span key={index} className={index <= step ? "active" : ""} />)}</div>
        <main><span className="onboarding-icon"><Icon aria-hidden="true" /></span><h2 id="onboarding-title">{current.title}</h2><p>{current.description}</p><Link href={current.href} onClick={close}>{current.label} <ArrowRight /></Link></main>
        <footer>
          <button className="onboarding-back" type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}><ArrowLeft /> Wstecz</button>
          {step < roleSteps.length - 1 ? <button className="onboarding-next" type="button" onClick={() => setStep((value) => Math.min(roleSteps.length - 1, value + 1))}>Dalej <ArrowRight /></button> : <form action={finishOnboardingAction} onSubmit={finishInitialTour}><input type="hidden" name="result" value="completed" /><button className="onboarding-next" type="submit">Gotowe</button></form>}
        </footer>
        {openInitially ? <form className="onboarding-dismiss" action={finishOnboardingAction} onSubmit={finishInitialTour}><input type="hidden" name="result" value="dismissed" /><button type="submit">Pomiń teraz — zawsze znajdziesz samouczek pod ikoną ?</button></form> : null}
      </div>
    </dialog>
    <dialog ref={manualDialogRef} className="manual-offer-dialog" aria-labelledby="manual-offer-title" onClose={() => setOfferManual(false)}>
      <button className="manual-offer-close" type="button" onClick={closeManualOffer} aria-label="Zamknij propozycję podręcznika"><X aria-hidden="true" /></button>
      <span className="manual-offer-icon"><BookOpenCheck aria-hidden="true" /></span>
      <span className="section-kicker">Na spokojny początek</span>
      <h2 id="manual-offer-title">Czy pobrać Twój podręcznik?</h2>
      <p><strong>{manualLabel}</strong> opisuje każdą dostępną funkcję osobno: gdzie kliknąć, co się stanie, czego Twoje konto nie może zmienić i co zrobić, gdy pojawi się problem.</p>
      <div className="manual-offer-actions">
        <a className="button button-primary" href="/panel/pomoc/podrecznik" onClick={closeManualOffer}><Download aria-hidden="true" /> Pobierz PDF</a>
        <button className="button button-secondary" type="button" onClick={closeManualOffer}>Nie teraz</button>
      </div>
      <small>Instrukcję zawsze znajdziesz później pod przyciskiem „Instrukcja” u góry ekranu.</small>
    </dialog>
  </>;
}
