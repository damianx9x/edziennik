"use client";

import { ExternalLink, Sparkles, X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

const ANSWERS = new Set(["klawiatura", "klawiaturą"]);

export function CreatorEasterEgg() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [clicks, setClicks] = useState(0);
  const [answer, setAnswer] = useState("");
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState(false);

  function discover() {
    const next = clicks + 1;
    setClicks(next);
    if (next >= 5) {
      setClicks(0);
      setAnswer("");
      setSolved(false);
      setError(false);
      dialog.current?.showModal();
    }
  }

  function solve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const accepted = ANSWERS.has(answer.trim().toLocaleLowerCase("pl-PL"));
    setSolved(accepted);
    setError(!accepted);
  }

  return (
    <>
      <button className="app-sidebar-creator" type="button" onClick={discover} aria-label="Projekt i opieka techniczna: Damian Eron">
        <span>Projekt i opieka techniczna</span>
        <strong>Damian Eron · damianx9x@me.com</strong>
      </button>
      <dialog className="creator-easter-dialog" ref={dialog} onClose={() => setSolved(false)}>
        <button className="creator-easter-close" type="button" aria-label="Zamknij" onClick={() => dialog.current?.close()}><X aria-hidden="true" /></button>
        {solved ? <div className="creator-easter-reveal"><Sparkles aria-hidden="true" /><span className="section-kicker">Sekret odblokowany</span><h2>Vibe coding level: unlocked</h2><p>Skoro znalazłeś to miejsce, zasługujesz na klasyczną internetową nagrodę.</p><a className="button button-primary" href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank" rel="noreferrer">Otwórz niespodziankę <ExternalLink aria-hidden="true" /></a></div> : <form onSubmit={solve}><span className="section-kicker">Mała zagadka</span><h2>Mam klawisze, ale nie mam zamków. Mam spację, ale nie mam pokoju. Czym jestem?</h2><label><span>Twoja odpowiedź</span><input value={answer} onChange={(event) => { setAnswer(event.target.value); setError(false); }} autoComplete="off" required /></label>{error ? <p role="alert">Jeszcze nie. Podpowiedź: właśnie dzięki temu piszesz.</p> : null}<button className="button button-primary" type="submit">Sprawdź odpowiedź</button></form>}
      </dialog>
    </>
  );
}
