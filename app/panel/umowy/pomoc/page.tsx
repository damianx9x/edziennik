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
    label: "Kodeks cywilny — oświadczenia woli i forma dokumentowa",
    href: "https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20250001071/T/D20251071L.pdf",
  },
  {
    label: "Ustawa o prawach konsumenta — tekst i zmiany",
    href: "https://eli.gov.pl/eli/DU/2014/827/ogl/pol",
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
            <span className="section-kicker">Umowy bez prawniczego języka</span>
            <h1>Co dzieje się po kliknięciu?</h1>
            <p>
              {isDirector
                ? "Zobacz, co szkoła powinna przygotować i jaki dowód zachowuje system."
                : "Zobacz, jakie informacje otrzymujesz, co potwierdzasz i jakie masz prawa."}
            </p>
          </div>
        </header>

        <section className="contract-help-steps" aria-labelledby="contract-help-steps-title">
          <div className="contract-help-section-title">
            <span className="section-kicker">Prosty proces</span>
            <h2 id="contract-help-steps-title">Cztery bezpieczne kroki</h2>
          </div>
          <ol>
            <li><span>1</span><div><strong>Dokładna wersja</strong><p>Rodzic otwiera PDF przypisany do niego i dziecka. Plik po wysłaniu nie jest podmieniany.</p></div></li>
            <li><span>2</span><div><strong>Najważniejsze warunki</strong><p>Przed decyzją widać usługę, okres, cenę, termin płatności i zasady zakończenia umowy.</p></div></li>
            <li><span>3</span><div><strong>Świadome potwierdzenia</strong><p>Osobne pola dotyczą dokumentu, informacji konsumenckich, płatności i — gdy trzeba — wcześniejszego rozpoczęcia zajęć.</p></div></li>
            <li><span>4</span><div><strong>Dowód i kopia</strong><p>System zapisuje konto, czas, oświadczenia, wersję oraz skrót SHA-256 dokumentu. Potwierdzenie można pobrać.</p></div></li>
          </ol>
        </section>

        <section className="contract-help-role-card">
          {isDirector ? <BookOpenCheck aria-hidden="true" /> : <BadgeCheck aria-hidden="true" />}
          <div>
            <span className="section-kicker">{isDirector ? "Checklista dyrektora" : "Twoje prawa jako rodzica"}</span>
            <h2>{isDirector ? "System pilnuje procesu, szkoła odpowiada za treść" : "Decyzję podejmujesz dopiero po przeczytaniu"}</h2>
            {isDirector ? (
              <ul>
                <li>Wgraj zatwierdzony wzór z pełnymi danymi przedsiębiorcy.</li>
                <li>Podaj całkowitą cenę, okres usługi, wypowiedzenie, reklamację i odstąpienie.</li>
                <li>Nie wysyłaj nowego PDF jako „korekty” starego — utwórz kolejną wersję.</li>
                <li>Przed prawdziwym wdrożeniem uzyskaj akceptację prawnika i IOD.</li>
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
            <p>Dyrektor wybiera jeden z dwóch trybów. W formie dokumentowej rodzic składa jawne oświadczenie po zalogowaniu. W trybie papierowym pobiera dokładny PDF, podpisuje cały egzemplarz i wgrywa czytelny skan do sprawdzenia przez dyrektora. Sam skan jest materiałem dowodowym, ale nie należy go automatycznie utożsamiać z oryginałem, gdy przepis wymaga formy pisemnej.</p>
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
            <p>Przy odpłatnej umowie zawieranej elektronicznie konsument musi bezpośrednio przed decyzją otrzymać najważniejsze informacje, a przycisk ma jednoznacznie wskazywać, że decyzja powoduje obowiązek zapłaty.</p>
          </details>
          <details>
            <summary>Czy rodzic może odstąpić od umowy?</summary>
            <p>Co do zasady tak — w terminie 14 dni od zawarcia umowy online. Dokument powinien zawierać instrukcję i wzór formularza. Wyjątki zależą od sposobu i etapu wykonania usługi.</p>
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
            <p>Tylko dane potrzebne do identyfikacji oświadczenia i ochrony obu stron: konto, czas, wersję dokumentu, jego skrót, treść potwierdzeń oraz — w trybie papierowym — podpisany plik. Pliki są poza katalogiem publicznym, pobierane dopiero po sprawdzeniu uprawnień i objęte audytem. Docelowa retencja, szyfrowany backup i procedura usunięcia muszą zostać zatwierdzone z prawnikiem oraz IOD.</p>
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
          <p><strong>Ostatni przegląd informacji: {CONTRACT_LEGAL_REVIEW_DATE}.</strong> To praktyczne wyjaśnienie działania systemu, a nie indywidualna porada prawna. Wzór KLA, regulamin, obowiązki informacyjne i retencję danych musi zatwierdzić prawnik oraz IOD przed uruchomieniem na prawdziwych danych.</p>
        </aside>
      </div>
    </AuthenticatedPanelShell>
  );
}
