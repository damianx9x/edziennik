import {
  ArrowLeft,
  BadgeCheck,
  BookOpenCheck,
  ExternalLink,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  CONTRACT_LEGAL_REVIEW_DATE,
} from "@/modules/contracts/legal";
import { requireActiveSession } from "@/modules/identity/auth/session";
import { AuthenticatedPanelShell } from "@/modules/identity/components/authenticated-panel-shell";

export const metadata: Metadata = { title: "Umowy — pomoc i podstawy prawne" };

const sources = [
  {
    label: "Kodeks cywilny — art. 77², 77³, 78 i 78¹",
    href: "https://eli.gov.pl/api/acts/DU/2026/795/text/I/D20260795.pdf",
  },
  {
    label: "Ustawa o prawach konsumenta — tekst jednolity",
    href: "https://eli.gov.pl/api/acts/DU/2024/1796/text.html",
  },
  {
    label: "UOKiK — informacje przed zawarciem umowy",
    href: "https://prawakonsumenta.uokik.gov.pl/prawo-do-informacji/sprzedaz-poza-lokalem-i-na-odleglosc/",
  },
  {
    label: "UOKiK — prawidłowy przycisk przy odpłatnej umowie",
    href: "https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/",
  },
  {
    label: "UOKiK — odstąpienie od umowy zawartej online",
    href: "https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/",
  },
  {
    label: "eIDAS — skutki podpisów elektronicznych",
    href: "https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX%3A32014R0910",
  },
  {
    label: "RODO — ochrona i minimalizacja danych",
    href: "https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX%3A32016R0679",
  },
];

export default async function ContractLegalHelpPage() {
  const session = await requireActiveSession("/panel/umowy/pomoc");
  if (!["DIRECTOR", "PARENT"].includes(session.user.role)) {
    redirect("/panel/brak-dostepu");
  }
  const isDirector = session.user.role === "DIRECTOR";

  return (
    <AuthenticatedPanelShell session={session} active="contracts">
      <div className="contract-help-page">
        <Link className="contract-help-back" href="/panel/umowy">
          <ArrowLeft aria-hidden="true" /> Wróć do umów
        </Link>

        <header className="contract-help-hero">
          <span className="contract-help-hero-icon"><Scale aria-hidden="true" /></span>
          <div>
            <span className="section-kicker">Umowy w King’s Language Academy</span>
            <h1>Jasny i udokumentowany proces</h1>
            <p>
              {isDirector
                ? "System prowadzi szkołę przez wymagane dokumenty, oświadczenia i dowody zawarcia umowy."
                : "Przed decyzją otrzymujesz komplet dokumentów, pełną cenę i jasną informację o skutkach akceptacji."}
            </p>
          </div>
        </header>

        <section className="contract-help-steps" aria-labelledby="contract-help-steps-title">
          <div className="contract-help-section-title">
            <span className="section-kicker">Prosty proces</span>
            <h2 id="contract-help-steps-title">Cztery bezpieczne kroki</h2>
          </div>
          <ol>
            <li><span>1</span><div><strong>Kompletny pakiet</strong><p>Rodzic osobno otwiera umowę i informacje RODO, właściwy kosztorys oraz harmonogram kursu języka angielskiego. Pliki po wysłaniu nie są podmieniane.</p></div></li>
            <li><span>2</span><div><strong>Bez przepisywania umowy</strong><p>Treść prawna pozostaje w PDF-ach szkoły. System pokazuje dodatkowo tylko liczbę rat, kwotę raty, kwotę całkowitą i terminy potrzebne do przypomnień.</p></div></li>
            <li><span>3</span><div><strong>Świadome potwierdzenia</strong><p>Osobne pola dotyczą dokumentu, informacji konsumenckich, płatności i — gdy trzeba — wcześniejszego rozpoczęcia zajęć.</p></div></li>
            <li><span>4</span><div><strong>Dowód i kopia</strong><p>System zapisuje konto, czas, oświadczenia, wersję oraz skrót SHA-256 dokumentu. Potwierdzenie można pobrać.</p></div></li>
          </ol>
        </section>

        <section className="contract-help-role-card">
          {isDirector ? <BookOpenCheck aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
          <div>
            <span className="section-kicker">{isDirector ? "Checklista dyrektora" : "Twoje prawa jako rodzica"}</span>
            <h2>{isDirector ? "System wymusza wymagane elementy procesu online" : "Decyzję podejmujesz dopiero po przeczytaniu całego pakietu"}</h2>
            {isDirector ? (
              <ul>
                <li>Umowa zawiera dane KLA, opis kursu, czas trwania, wypowiedzenie, reklamację i odstąpienie.</li>
                <li>Kosztorys pokazuje liczbę rat, kwotę jednej raty, kwotę całkowitą i terminy.</li>
                <li>Rodzic otwiera wszystkie trzy dokumenty, a system dopiero wtedy odblokowuje decyzję.</li>
                <li>Po zawarciu rodzic pobiera niezmienne potwierdzenie i cały pakiet na trwały nośnik.</li>
                <li>Każda korekta tworzy nową wersję; zaakceptowany pakiet i historia pozostają niezmienne.</li>
              </ul>
            ) : (
              <ul>
                <li>Możesz pobrać dokument i wrócić do niego przed decyzją.</li>
                <li>Przy odpłatnej umowie przycisk jasno mówi o obowiązku zapłaty.</li>
                <li>Co do zasady od umowy zawartej online można odstąpić w ciągu 14 dni.</li>
                <li>Jeśli zajęcia mają zacząć się wcześniej, otrzymasz osobne pola i opis konsekwencji.</li>
              </ul>
            )}
          </div>
        </section>

        <section className="contract-faq" aria-labelledby="contract-faq-title">
          <div className="contract-help-section-title">
            <span className="section-kicker">FAQ</span>
            <h2 id="contract-faq-title">Najczęstsze pytania</h2>
          </div>
          <details>
            <summary>Czy trzeba drukować i podpisywać umowę?</summary>
            <p>Nie zawsze. Dla umowy niewymagającej formy pisemnej rodzic może złożyć oświadczenie w eDzienniku w formie dokumentowej: system identyfikuje konto i zachowuje dokładną treść oświadczenia oraz wersję dokumentów (art. 77² i 77³ Kodeksu cywilnego). Jeżeli KLA wybierze podpis odręczny, rodzic pobiera umowę i informacje RODO, podpisuje egzemplarz, a następnie wgrywa czytelny skan; papierowy oryginał zachowuje. Cennik i harmonogram pozostają załącznikami do wglądu.</p>
          </details>
          <details>
            <summary>Czy kod SMS zastępuje podpis?</summary>
            <p>Nie automatycznie. Kod może pomóc potwierdzić kontrolę nad numerem i wzmocnić materiał dowodowy, ale zwykły SMS nie jest kwalifikowanym podpisem elektronicznym. Równoważność z podpisem własnoręcznym zapewnia kwalifikowany podpis elektroniczny. Dlatego pilot używa prostego podpisu odręcznego i bezpiecznego wgrania albo jawnej formy dokumentowej.</p>
          </details>
          <details>
            <summary>Czy kliknięcie jest podpisem kwalifikowanym?</summary>
            <p>Nie. System zapisuje elektroniczne oświadczenie i materiał dowodowy. Podpis kwalifikowany jest odrębną usługą zaufania i ma skutek równoważny podpisowi własnoręcznemu.</p>
          </details>
          <details>
            <summary>Dlaczego przycisk mówi o obowiązku zapłaty?</summary>
            <p>Tak wymaga art. 17 ust. 2–4 ustawy o prawach konsumenta. Bezpośrednio przed decyzją rodzic widzi przedmiot kursu, czas trwania oraz pełny plan ceny, a przycisk „Zamówienie z obowiązkiem zapłaty” jednoznacznie opisuje skutek.</p>
          </details>
          <details>
            <summary>Co rodzic otrzymuje po zawarciu umowy?</summary>
            <p>Rodzic może pobrać niezmienne PDF-y oraz potwierdzenie zawierające wersję pakietu, złożone oświadczenia i czas akceptacji. Realizuje to obowiązek przekazania potwierdzenia umowy na trwałym nośniku przed rozpoczęciem usługi, opisany w art. 21 ustawy o prawach konsumenta.</p>
          </details>
          <details>
            <summary>Czy rodzic może odstąpić od umowy?</summary>
            <p>Tak — co do zasady w ciągu 14 dni od zawarcia umowy online. KLA przekazuje sposób złożenia oświadczenia i wzór formularza w pakiecie. Jeżeli rodzic wyraźnie zażąda wcześniejszego rozpoczęcia zajęć, szkoła rozlicza wyłącznie wykonaną część usługi zgodnie z ustawą.</p>
          </details>
          <details>
            <summary>Jak złożyć oświadczenie o odstąpieniu?</summary>
            <p>Przed upływem terminu wyślij szkole jednoznaczne oświadczenie, korzystając z danych kontaktowych podanych w umowie. Możesz użyć wzoru dołączonego do dokumentu, ale nie jest to obowiązkowe. Zachowaj kopię wiadomości lub inne potwierdzenie wysłania.</p>
          </details>
          <details>
            <summary>Co, jeśli zajęcia mają rozpocząć się od razu?</summary>
            <p>Rodzic składa osobne, wyraźne żądanie rozpoczęcia usługi przed upływem terminu na odstąpienie i potwierdza, że zna konsekwencje. Samo zaakceptowanie umowy nie zastępuje tego żądania.</p>
          </details>
          <details>
            <summary>Czy zaakceptowaną umowę można poprawić?</summary>
            <p>Nie nadpisujemy zaakceptowanej treści. Korekta tworzy nową wersję PDF i wymaga ponownej decyzji rodzica. Starsza wersja oraz jej dowód pozostają w historii.</p>
          </details>
          <details>
            <summary>Jakie dane zapisuje system?</summary>
            <p>Dane potrzebne do obsługi kursu i wykazania zawarcia umowy: konto rodzica, czas, wersję i kryptograficzny skrót pakietu, treść potwierdzeń oraz — w trybie papierowym — podpisany plik. Dokumenty są poza publiczną stroną i są wydawane dopiero po sprawdzeniu uprawnień. Produkcyjna instalacja KLA przechowuje bazę i pliki na szyfrowanym woluminie oraz wykonuje szyfrowany backup. Zasady minimalizacji, przejrzystości i ochrony realizują art. 5, 13 i 32 RODO.</p>
          </details>
          <details>
            <summary>Jak system realizuje informacje wymagane przed umową?</summary>
            <p>Art. 12 ustawy o prawach konsumenta jest odwzorowany na trzy dokumenty KLA. Umowa podaje przedsiębiorcę, zasady kursu, czas trwania, kontakt, reklamację, wypowiedzenie i odstąpienie. Kosztorys podaje pełną cenę i raty. Harmonogram pokazuje organizację zajęć. System wymaga otwarcia każdego dokumentu i zapisuje dowód wykonania tych kroków.</p>
          </details>
        </section>

        <section className="contract-legal-sources" aria-labelledby="contract-sources-title">
          <div className="contract-help-section-title">
            <span className="section-kicker">Oficjalne źródła</span>
            <h2 id="contract-sources-title">Na czym opiera się proces?</h2>
          </div>
          <ul>
            {sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noreferrer">
                  {source.label}<ExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <aside className="contract-help-disclaimer">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Stan prawny i przegląd procesu: {CONTRACT_LEGAL_REVIEW_DATE}.</strong> System zapewnia niezmienność wersji, identyfikację rodzica, odczyt całego pakietu przed decyzją, jednoznaczny przycisk płatny, potwierdzenie na trwałym nośniku i trwały dowód oświadczenia. KLA używa własnego zatwierdzonego wzoru PDF jako źródła warunków kursu; checklista przed wysłaniem wymaga, aby dokument zawierał komplet danych przedsiębiorcy, usługi, ceny, czasu trwania, reklamacji, wypowiedzenia i odstąpienia. Zmiana wzoru zawsze tworzy nową wersję.</p>
        </aside>
      </div>
    </AuthenticatedPanelShell>
  );
}
