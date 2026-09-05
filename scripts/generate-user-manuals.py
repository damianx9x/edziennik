#!/usr/bin/env python3
"""Generate illustrated KLA manuals from synthetic QA screenshots."""

from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PillowImage


ROOT = Path(__file__).resolve().parents[1]
SCREEN_DIR = ROOT / "docs" / "assets" / "manuals"
OUTPUT_DIR = ROOT / "output" / "pdf"
RELEASE = json.loads((ROOT / "manuals" / "release.json").read_text(encoding="utf-8"))
FONT_REGULAR = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
FONT_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")

NAVY = colors.HexColor("#172650")
BLUE = colors.HexColor("#3159A1")
RED = colors.HexColor("#C91F36")
GREEN = colors.HexColor("#1F7A64")
CREAM = colors.HexColor("#F7F3EC")
INK = colors.HexColor("#27334D")
MUTED = colors.HexColor("#657086")
LINE = colors.HexColor("#DDE1E8")


def register_fonts() -> tuple[str, str]:
    regular = "KLAArial"
    bold = "KLAArialBold"
    if FONT_REGULAR.exists() and FONT_BOLD.exists():
        pdfmetrics.registerFont(TTFont(regular, str(FONT_REGULAR)))
        pdfmetrics.registerFont(TTFont(bold, str(FONT_BOLD)))
    else:
        regular, bold = "Helvetica", "Helvetica-Bold"
    return regular, bold


REGULAR, BOLD = register_fonts()


def styles():
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle("cover_kicker", parent=base["Normal"], fontName=BOLD, fontSize=10, leading=13, textColor=RED, spaceAfter=9, uppercase=True),
        "cover_title": ParagraphStyle("cover_title", parent=base["Title"], fontName=BOLD, fontSize=34, leading=36, textColor=NAVY, alignment=TA_LEFT, spaceAfter=12),
        "cover_subtitle": ParagraphStyle("cover_subtitle", parent=base["Normal"], fontName=REGULAR, fontSize=13, leading=19, textColor=MUTED, spaceAfter=18),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=BOLD, fontSize=23, leading=27, textColor=NAVY, spaceBefore=0, spaceAfter=9),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=BOLD, fontSize=15, leading=19, textColor=NAVY, spaceBefore=12, spaceAfter=6),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName=REGULAR, fontSize=9.5, leading=14, textColor=INK, spaceAfter=6),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontName=REGULAR, fontSize=9.2, leading=13.5, leftIndent=12, firstLineIndent=-8, textColor=INK, spaceAfter=4),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName=REGULAR, fontSize=7.8, leading=11, textColor=MUTED),
        "callout": ParagraphStyle("callout", parent=base["BodyText"], fontName=REGULAR, fontSize=9.2, leading=13.5, textColor=NAVY),
        "toc": ParagraphStyle("toc", parent=base["BodyText"], fontName=REGULAR, fontSize=10, leading=16, textColor=INK, leftIndent=6),
        "footer": ParagraphStyle("footer", parent=base["BodyText"], fontName=REGULAR, fontSize=7.5, leading=9, textColor=MUTED, alignment=TA_CENTER),
    }


S = styles()


def footer(canvas, doc, label: str):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, 192 * mm, 13 * mm)
    canvas.setFont(REGULAR, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, label)
    canvas.drawRightString(192 * mm, 8.5 * mm, f"strona {doc.page}")
    canvas.restoreState()


def callout(title: str, text: str, tone: str = "blue"):
    background = {"blue": colors.HexColor("#EDF2FF"), "green": colors.HexColor("#EAF7F3"), "red": colors.HexColor("#FDEDEF"), "gold": colors.HexColor("#FFF5D7")}[tone]
    border = {"blue": BLUE, "green": GREEN, "red": RED, "gold": colors.HexColor("#B77A00")}[tone]
    table = Table([[Paragraph(f"<b>{title}</b><br/>{text}", S["callout"])]], colWidths=[174 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return table


def bullets(items: list[str]):
    return [Paragraph(f"• {item}", S["bullet"]) for item in items]


def screenshot(name: str, max_width: float = 174 * mm, max_height: float = 105 * mm):
    path = ROOT / name if name.startswith("output/") else SCREEN_DIR / name
    if not path.exists():
        return callout("Brak zrzutu", f"Nie znaleziono pliku {name}.", "red")
    with PillowImage.open(path) as bitmap:
        width, height = bitmap.size
    scale = min(max_width / width, max_height / height)
    image = Image(str(path), width=width * scale, height=height * scale)
    image.hAlign = "CENTER"
    return image


def cover(title: str, subtitle: str, audience: str, changes: list[str], image_name: str | None = None):
    story = [
        Spacer(1, 18 * mm),
        Paragraph("eDZIENNIK KLA · INSTRUKCJA", S["cover_kicker"]),
        Paragraph(title, S["cover_title"]),
        Paragraph(subtitle, S["cover_subtitle"]),
        callout("Dla kogo jest ten poradnik?", audience, "green"),
        Spacer(1, 6 * mm),
        Paragraph("Co zmieniło się od poprzedniej wersji", S["h2"]),
        *bullets(changes),
        Spacer(1, 5 * mm),
    ]
    if image_name:
        story += [screenshot(image_name, 150 * mm, 48 * mm), Spacer(1, 5 * mm)]
    story += [
        Paragraph(f"Wersja {RELEASE['version']} · {RELEASE['date']}", S["small"]),
        Paragraph("Zrzuty pokazują wyłącznie bezpieczne dane demonstracyjne.", S["small"]),
        PageBreak(),
    ]
    return story


def section(title: str, intro: str, screenshot_name: str | None, actions: list[str], limits: list[str] | None = None, tip: str | None = None, mobile: bool = False):
    story = [Paragraph(title, S["h1"]), Paragraph(intro, S["body"])]
    if screenshot_name:
        story += [Spacer(1, 3 * mm), screenshot(screenshot_name, 174 * mm if not mobile else 72 * mm, 95 * mm if not mobile else 115 * mm), Spacer(1, 4 * mm)]
    steps = [f"{index}. {action}" for index, action in enumerate(actions, start=1)]
    story += [Paragraph("Krok po kroku", S["h2"]), *bullets(steps)]
    if limits:
        story += [Paragraph("Ważne ograniczenia", S["h2"]), *bullets(limits)]
    if tip:
        story += [Spacer(1, 3 * mm), callout("Najprostsza zasada", tip, "gold")]
    story.append(PageBreak())
    return story


def role_function(
    title: str,
    purpose: str,
    location: str,
    screenshot_name: str,
    prepare: list[str],
    steps: list[str],
    result: str,
    allowed: list[str],
    blocked: list[str],
    problems: list[str],
    tip: str,
    mobile: bool = False,
):
    story = [
        Paragraph(title, S["h1"]),
        Paragraph(purpose, S["body"]),
        callout("Gdzie znajdziesz tę funkcję", location, "blue"),
        Spacer(1, 4 * mm),
        screenshot(screenshot_name, 164 * mm if not mobile else 72 * mm, 66 * mm if not mobile else 88 * mm),
        Paragraph("Zanim zaczniesz", S["h2"]),
        *bullets(prepare),
        Paragraph("Jak używać - dokładnie", S["h2"]),
        *bullets([f"{index}. {step}" for index, step in enumerate(steps, start=1)]),
        Paragraph("Co powinno się wydarzyć", S["h2"]),
        Paragraph(result, S["body"]),
    ]
    permissions = Table([
        [Paragraph("Możesz", S["body"]), Paragraph("System celowo nie pozwoli", S["body"])],
        [Paragraph("<br/>".join(f"• {item}" for item in allowed), S["small"]), Paragraph("<br/>".join(f"• {item}" for item in blocked), S["small"])],
    ], colWidths=[87 * mm, 87 * mm])
    permissions.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#EAF7F3")),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#FDEDEF")),
        ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
        ("GRID", (0, 0), (-1, -1), .6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [
        Paragraph("Uprawnienia Twojej roli", S["h2"]),
        permissions,
        KeepTogether([
            Paragraph("Jeśli coś wygląda inaczej", S["h2"]),
            *bullets(problems),
        ]),
        KeepTogether([callout("Dobra praktyka", tip, "gold")]),
        PageBreak(),
    ]
    return story


def build_role_manual(
    path: Path,
    audience: str,
    role_name: str,
    intro: str,
    start_image: str,
    rules: list[str],
    functions: list[dict],
):
    story = cover(
        f"Podręcznik: {role_name}",
        intro,
        f"Tylko funkcje dostępne dla roli: {role_name}. Każdy rozdział prowadzi od wejścia do sprawdzenia wyniku.",
        RELEASE["schoolChanges"],
        start_image,
    )
    story += [
        Paragraph("Zacznij tutaj", S["h1"]),
        Paragraph("Ten podręcznik nie jest krótką listą opcji. Każda główna funkcja ma osobny rozdział ze zdjęciem, dokładną ścieżką w panelu, przygotowaniem, pełną obsługą, oczekiwanym wynikiem, uprawnieniami i rozwiązaniem typowych problemów.", S["body"]),
        callout("Przy pierwszym logowaniu", "Najpierw przejdź krótki samouczek. Po jego zakończeniu system zapyta, czy pobrać ten PDF. Jeśli wybierzesz „Nie teraz”, podręcznik pozostanie zawsze pod przyciskiem „Instrukcja” u góry panelu.", "green"),
        Paragraph("Najważniejsze zasady konta", S["h2"]),
        *bullets(rules),
        Paragraph("Spis funkcji", S["h2"]),
        *[Paragraph(f"{index}. {item['title']}", S["toc"]) for index, item in enumerate(functions, start=1)],
        PageBreak(),
    ]
    for item in functions:
        story += role_function(**item)
    story += [
        Paragraph("Pomoc i zgłoszenie problemu", S["h1"]),
        Paragraph("Jeżeli ekran nie działa tak, jak opisano, najpierw odśwież go jeden raz. Jeśli problem wróci, przejdź do miejsca błędu i dopiero wtedy wybierz czerwony przycisk „Zgłoś problem”. Zrzut ekranu powstaje tylko po Twoim świadomym kliknięciu i podglądzie.", S["body"]),
        *bullets(["opisz ostatnią wykonaną czynność", "napisz, czego oczekiwano", "nie podawaj hasła, kodu MFA ani klucza kopii", "w pilnej sprawie skontaktuj się ze szkołą także innym kanałem", "pomoc techniczną otworzysz z Wiadomości przez „Napisz do twórcy aplikacji”"]),
        callout("Pamiętaj", "Ten podręcznik opisuje wersję wskazaną na pierwszej stronie. Po aktualizacji pobierz nowy egzemplarz z panelu; stary plik może nie odpowiadać bieżącym przyciskom.", "red"),
    ]
    doc = SimpleDocTemplate(
        str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=17 * mm, bottomMargin=18 * mm,
        title=f"eDziennik KLA - podręcznik {role_name}", author="Damian Eron",
        subject=f"KLA-MANUAL:{RELEASE['version']}:{audience}",
    )
    label = f"eDziennik KLA · podręcznik: {role_name}"
    doc.build(story, onFirstPage=lambda c, d: footer(c, d, label), onLaterPages=lambda c, d: footer(c, d, label))


def manual_entry(title, purpose, location, image, prepare, steps, result, allowed, blocked, problems, tip, mobile=False):
    return {
        "title": title, "purpose": purpose, "location": location,
        "screenshot_name": image, "prepare": prepare, "steps": steps,
        "result": result, "allowed": allowed, "blocked": blocked,
        "problems": problems, "tip": tip, "mobile": mobile,
    }


def director_functions():
    return [
        manual_entry("Pierwsze logowanie i ochrona konta", "Pierwsze wejście ustawia bezpieczny dostęp dyrektora i pokazuje najważniejsze miejsca pracy.", "Ekran logowania → adres z zaproszenia → samouczek → Bezpieczeństwo konta", "dyrektor-start.png", ["przygotuj własny adres e-mail", "ustal unikalne hasło mające co najmniej 12 znaków", "miej przy sobie telefon z aplikacją kodów MFA"], ["Otwórz link z zaproszenia i ustaw własne hasło.", "Potwierdź adres z wiadomości e-mail.", "Zaloguj się i przejdź pięć ekranów samouczka.", "Po pytaniu o instrukcję wybierz „Pobierz PDF” albo „Nie teraz”.", "Przejdź do ustawień bezpieczeństwa, zeskanuj kod MFA i zapisz kody awaryjne poza komputerem."], "Po ponownym logowaniu system poprosi o hasło oraz kod MFA, a następnie otworzy Command Center dyrektora.", ["zmienić własne hasło", "włączyć i odnowić MFA", "wylogować inne sesje"], ["użyć konta innej osoby", "wyłączyć wymagane MFA w prawdziwym wdrożeniu", "zobaczyć hasła użytkowników"], ["brak wiadomości: sprawdź spam i konfigurację SMTP", "kod MFA nie pasuje: sprawdź automatyczną datę i godzinę telefonu", "utrata kodów: skontaktuj się z właścicielem systemu"], "Jedna osoba używa jednego konta. Wspólne konto dyrektora niszczy historię odpowiedzialności."),
        manual_entry("Command Center i najbliższe sprawy", "Start dyrektora zbiera plan szkoły, sprawy do decyzji i skróty do codziennych modułów.", "Menu → Start", "dyrektor-start.png", ["zaloguj się na konto dyrektora", "upewnij się, że wybrany tydzień jest właściwy"], ["Sprawdź pasek „Stan szkoły” i liczbę spraw wymagających uwagi.", "Kliknij „Przejdź do spraw”, aby zobaczyć elementy oczekujące na decyzję.", "Otwórz wybraną kartę grafiku, umów, płatności lub wiadomości.", "Po zakończeniu wróć przez „Start” i sprawdź, czy licznik się zmniejszył."], "Załatwiona sprawa znika z kolejki albo zmienia status. Plan i liczniki pozostają skrótem; szczegóły otwierają się po kliknięciu.", ["widzieć podsumowanie całej szkoły", "przechodzić do każdego modułu", "ponownie otworzyć samouczek"], ["edytować dane bez wejścia w odpowiedni moduł", "traktować licznika jako raport księgowy"], ["pusty plan: sprawdź tydzień i opublikowanie zajęć", "licznik nie znika: otwórz sprawę i wykonaj wymaganą decyzję", "brak modułu: sprawdź, czy zalogowano się jako dyrektor"], "Zaczynaj dzień od spraw wymagających decyzji, potem sprawdź grafik, a na końcu administrację."),
        manual_entry("Zaproszenia, konta i reset dostępu", "Dyrektor tworzy konta przez zaproszenia i pomaga odzyskać dostęp bez poznawania dotychczasowego hasła.", "Menu → Kartoteki i konta → Zaproszenia i dostęp albo Kartoteka osoby → Reset hasła", "kartoteki.png", ["sprawdź poprawny e-mail i rolę osoby", "dla rodzica najpierw utwórz lub odnajdź dziecko", "ustal bezpieczny sposób przekazania danych"], ["Wybierz zakładkę „Zaproszenia i dostęp”, następnie „Zaproś osobę” i podaj imię, e-mail, rolę, ważność oraz liczbę użyć.", "Jeżeli osoba utraci hasło, otwórz jej konto i wybierz „Reset hasła”.", "Najbezpieczniej wybierz link e-mail — użytkownik sam ustawi hasło.", "W pilnej sytuacji wybierz hasło tymczasowe: pokaż je raz i skopiuj albo wyślij przez skonfigurowaną pocztę.", "Poinformuj osobę, że hasło działa 30 minut. Po logowaniu system natychmiast wymusi ustawienie własnego hasła."], "Stare sesje tej osoby zostają zamknięte, a reset trafia do audytu bez zapisywania jawnego hasła.", ["resetować konta wykładowcy, rodzica i ucznia", "wysłać link", "utworzyć hasło tymczasowe widoczne raz"], ["poznać dotychczasowe hasło", "resetować konto właściciela systemu", "używać resetu do zmiany własnego hasła"], ["brak e-maila: wybierz pokazanie hasła lub popraw SMTP", "hasło wygasło: wygeneruj nowe", "osoba nadal zalogowana: odśwież — stare sesje są unieważniane"], "Link e-mail jest wariantem zalecanym. Hasło tymczasowe przekazuj tylko właściwej osobie i nigdy nie zapisuj go w kartotece ani wiadomości grupowej."),
        manual_entry("Edycja publicznej wizytówki", "Dyrektor zmienia treść i nowoczesny układ strony bez kodowania, bez wpływu na prywatny panel i bazę operacyjną.", "Ustawienia → Treść publicznej strony → Układ i widgety", "wizytowka.png", ["poproś właściciela o włączenie modułu edycji strony", "przygotuj krótkie, aktualne teksty", "potwierdź dane kontaktowe i lokalizacje", "używaj wyłącznie zdjęć z prawem do publikacji"], ["Na telefonie wybierz „Układ i widgety” z listy „Co chcę zmienić”; na komputerze kliknij sekcję w menu. Następnie wybierz szerokość treści, zaokrąglenia oraz wielkość początku strony.", "W sekcji kolejności włącz lub ukryj blok, wybierz szerokość i odstępy, a strzałkami ustaw kolejność.", "Z listy wybierz jeden z gotowych typów widgetu, np. zapisy, opinia, wydarzenie, lokalizacja albo FAQ.", "Rozwiń nagłówek wybranego widgetu. Dodaj widget i ustaw rozmiar, kolor, tło, krycie, obramowanie, nagłówek, opis oraz bezpieczny link.", "Użyj przezroczystego tła albo cienkiej linii, jeżeli blok ma wtopić się w stronę.", "Przejdź do pozostałych kart, aby zmienić teksty, slider, ofertę, lokalizacje i kontakt.", "Otwórz „Podgląd wyglądu tego widgetu”. Ten podgląd pokazuje niezapisane ustawienia; przycisk „Zobacz opublikowaną stronę” pokazuje wyłącznie ostatnio zapisaną wersję.", "Powiel widget ikoną kopiowania, ukryj go polem „Widoczny na stronie” lub ustaw wyrównanie tekstu i odstępy.", "Gdy pojawi się „Masz nieopublikowane zmiany”, wybierz „Zapisz zmiany”. Poczekaj na potwierdzenie. „Odrzuć robocze zmiany” wraca do ostatniego zapisu, nie do ustawień fabrycznych.", "Jeśli nie potwierdzono zapisu, najpierw pobierz kopię treści. Sprawdź połączenie i zalogowanie; treść pozostaje w otwartym edytorze.", "Eksportuj kopię treści przed większą zmianą."], "Zmiana jest wspólna na urządzeniach, objęta backupem i zapisana w audycie. Telefon automatycznie składa każdy układ do jednej kolumny, a ograniczenie animacji w systemie jest respektowane.", ["zmieniać kolejność i widoczność sekcji", "skalować sekcje i widgety", "ustawić bezpieczny wariant tła i obramowania", "dodać do 24 widgetów z 15 nowymi gotowymi typami"], ["wkleić kod HTML lub skrypt", "zmienić panel użytkowników", "opublikować niedozwolonego linku"], ["brak ustawienia w menu: właściciel musi włączyć moduł dla dyrektora", "zapis odrzucony: sprawdź puste pola i adresy", "stary wygląd: odśwież stronę publiczną", "telefon jest za szeroki: zgłoś błąd, nie zmniejszaj tekstu ręcznie"], "Najpierw użyj jednego dużego wyróżnienia i dwóch mniejszych widgetów. Mniej dobrze opisanych bloków wygląda czytelniej niż wiele drobnych kafli."),
        manual_entry("Kartoteki, rodziny i przypisania", "Kartoteki łączą rodziców z kilkorgiem dzieci, uczniów z grupami i wykładowców z prowadzonymi grupami.", "Menu → Kartoteki → wybierz Osoby, Grupy albo Zasoby", "kartoteki.png", ["odnajdź osobę wyszukiwarką", "upewnij się, że nie tworzysz duplikatu"], ["Otwórz kartę osoby i wybierz „Edytuj”.", "Zmień dozwolone dane kontaktowe albo identyfikator.", "W sekcji przypisań wyszukaj dziecko, rodzica, grupę lub wykładowcę.", "Dodaj kilka powiązań po kolei i wybierz „Zapisz”.", "Odśwież kartę i sprawdź listę przypisań oraz historię zmian."], "Nowe relacje zmieniają widoczność planu, wiadomości, umów i materiałów. Historia pokazuje, kto i kiedy wykonał zmianę.", ["przypisać wiele dzieci jednemu rodzicowi", "przypisać ucznia do kilku grup", "archiwizować nieaktywne rekordy"], ["powiązać osoby z innej szkoły", "usunąć ślad historii", "przyznać dostęp bez aktywnego konta"], ["zmiana znika: sprawdź komunikat zapisu i historię", "osoby nie ma na krótkiej liście: użyj wyszukiwarki", "błędne przypisanie: usuń relację i zapisz ponownie"], "Najpierw utwórz zasoby, potem osoby, następnie grupy i dopiero wtedy relacje."),
        manual_entry("Lokalizacje, sale i dostępność", "Generator grafiku potrzebuje realnych lokalizacji, sal, pojemności i dostępności ludzi.", "Kartoteki → Zasoby oraz karta wykładowcy lub ucznia → Dostępność", "kartoteki.png", ["zbierz godziny otwarcia lokalizacji", "ustal pojemność i wyposażenie sal", "ustal realny czas przejazdu między miejscami"], ["Dodaj lokalizację z nazwą i adresem.", "Dodaj sale, pojemność i przypisz je do lokalizacji.", "W kartotece wykładowcy dodaj osobne przedziały dla każdego dnia i miejsca.", "W kartotece ucznia zapisz preferencje godzinowe.", "Sprawdź, czy przedziały się nie nakładają i zapisz."], "Zasoby pojawiają się w filtrach oraz w generatorze. Sprzeczna dostępność zostaje odrzucona z wyjaśnieniem.", ["dodać wiele przedziałów jednego dnia", "wskazać różne lokalizacje", "zmienić preferencje ucznia"], ["zapisać nakładających się przedziałów", "zaplanować niemożliwego przejazdu", "przekroczyć pojemności sali"], ["brak sali w grafiku: sprawdź lokalizację i aktywność", "brak terminu: poszerz dostępność grupy lub wykładowcy", "dane zapisane, ale stary widok: odśwież jeden raz"], "Nie wpisuj „cały dzień”, jeśli osoba realnie zmienia lokalizacje. Precyzyjne dane dają lepszy plan."),
        manual_entry("Grafik ręczny", "Tryb ręczny pozwala utworzyć, przenieść i poprawić pojedynczą lekcję z kontrolą kolizji.", "Menu → Grafik → Ułóż ręcznie", "grafik.png", ["ustaw tydzień i lokalizację", "sprawdź grupę, wykładowcę i salę"], ["Kliknij wolne miejsce lub „Dodaj zajęcia”.", "Wybierz grupę, datę, godzinę, salę i wykładowcę.", "Pozycje niedostępne są wyszarzone i pokazują powód.", "Zapisz lekcję i sprawdź kartę w kalendarzu.", "Aby przenieść zajęcia, przeciągnij większy uchwyt albo użyj edycji dostępnej z klawiatury."], "Lekcja pojawia się po zapisaniu. W razie kolizji system nie zapisze jej i wskaże konkretny zasób.", ["tworzyć i przesuwać lekcje", "zmieniać salę i wykładowcę", "filtrować widok"], ["zapisać kolizji sali, grupy lub wykładowcy", "opublikować niepełnej lekcji", "ominąć czasu przejazdu"], ["trudne przeciąganie na tablecie: otwórz kartę i użyj pól edycji", "karta niewidoczna: sprawdź filtr lokalizacji", "błąd kolizji: przeczytaj nazwę blokującego zasobu"], "Na telefonie edytuj kartę formularzem. Przeciąganie jest najszybsze na większym ekranie."),
        manual_entry("Automatyczna propozycja grafiku", "Asystent przygotowuje szkic bez publikowania go użytkownikom, a dyrektor podejmuje każdą decyzję.", "Grafik → Ułóż automatycznie", "grafik.png", ["uzupełnij grupy, sale, wykładowców, lokalizacje i dostępności", "wybierz zakres dat oraz zakres: cała szkoła, grupa, wykładowca albo sala"], ["Ustaw zakres i wybierz „Generuj podgląd”.", "Poczekaj na okno propozycji; nie przechodź od razu do kalendarza.", "Przeczytaj listę braków i kolizji.", "Kliknij poprawną propozycję, aby obejrzeć szczegóły.", "Zaznacz poprawne pozycje i wybierz publikację; braki popraw ręcznie."], "Opublikowane propozycje stają się lekcjami. Niezaakceptowane elementy pozostają tylko szkicem i nie są widoczne dla rodzin.", ["zaakceptować część propozycji", "odrzucić szkic", "poprawić dane i wygenerować ponownie"], ["opublikować pozycji z twardą kolizją", "ukryć listy braków", "zastąpić decyzji dyrektora automatem"], ["brak przycisku publikacji: wybierz co najmniej jedną poprawną pozycję", "same braki: uzupełnij dostępności i sale", "propozycja znikła: wygeneruj nowy podgląd dla tego samego zakresu"], "Automat jest doradcą. Publikuj dopiero po sprawdzeniu sali, dojazdu i osób każdej lekcji."),
        manual_entry("Lekcja, temat, obecność i odwołanie", "Kliknięcie lekcji otwiera pełną kartę prowadzenia zajęć i komunikacji z uczestnikami.", "Grafik → kliknij kartę lekcji", "grafik.png", ["upewnij się, że otwierasz właściwą datę i grupę", "przed odwołaniem przygotuj zrozumiały powód"], ["Kliknij lekcję, aby otworzyć szczegóły.", "Sprawdź grupę, salę, wykładowcę i listę uczniów.", "Uzupełnij temat oraz obecność i zapisz.", "W razie odwołania wybierz „Odwołaj”, wpisz powód i potwierdź.", "Użyj filtra „Pokaż odwołane”, jeżeli chcesz ponownie zobaczyć odwołane karty."], "Temat i obecność zapisują się w historii. Odwołana lekcja znika ze zwykłego widoku, a grupa oraz rodziny otrzymują informację.", ["poprawić temat i obecność", "odwołać z powodem", "przywrócić widok odwołanych"], ["usunąć historii odwołania", "odwołać bez potwierdzenia skutku", "wysłać dziecku informacji formalnej przeznaczonej tylko dla rodzica"], ["nie widać lekcji: włącz odwołane lub zmień filtr", "brak ucznia: sprawdź przypisanie do grupy", "wiadomość nie wyszła: sprawdź kolejkę e-mail, informacja w aplikacji pozostaje"], "Powód ma mówić odbiorcy, co się zmienia i czy szkoła poda termin odrobienia."),
        manual_entry("Wiadomości, ogłoszenia i pomoc techniczna", "Komunikator obsługuje grupy, rozmowy prywatne, załączniki, potwierdzenia i kontakt z twórcą.", "Menu → Wiadomości", "wiadomosci-mobile.png", ["wybierz odbiorców zgodnie z celem wiadomości", "nie wpisuj haseł, danych medycznych ani kluczy"], ["Wybierz istniejącą rozmowę albo „Nowa”.", "Wyszukaj osoby, zaznacz kilku odbiorców i nadaj rozmowie nazwę.", "Wpisz tekst lub wybierz sam załącznik; po wysłaniu pole pliku się czyści.", "Dla ważnej informacji włącz potwierdzenie przeczytania.", "Ogłoszenie wyślij do wybranych grup.", "Aby zgłosić problem techniczny, wybierz „Napisz do twórcy aplikacji”."], "Wiadomość pojawia się w historii, a kolejka e-mail pokazuje status dodatkowej wysyłki. Właściwa historia pozostaje w aplikacji.", ["tworzyć rozmowy z kilkoma osobami", "wysyłać tekst i pliki", "widzieć potwierdzenia"], ["usunąć audytu odczytu dyrektora", "przenieść danych uczniów do Messengera", "wysłać niedozwolonego typu pliku"], ["brak osoby: użyj wyszukiwarki albo sprawdź aktywne konto", "błąd e-mail: ponów kolejkę, ale nie duplikuj wiadomości", "na telefonie wybierz „Rozmowy”, aby wrócić do listy"], "Jedna sprawa powinna mieć jeden kanał. Nie twórz nowej rozmowy do każdego krótkiego zdania.", True),
        manual_entry("Umowy, kosztorysy i podpis", "Moduł wysyła rodzicowi niezmienną wersję PDF wraz z kosztorysem i harmonogramem.", "Menu → Umowy", "umowy.png", ["przygotuj zatwierdzony prawnie PDF", "powiąż rodzica z uczniem", "ustal kosztorys, raty i sposób zawarcia"], ["Wybierz „Nowa umowa”, rodzica i ucznia.", "Dodaj PDF oraz pakiet: kosztorys i harmonogram.", "Wybierz akceptację elektroniczną albo pobranie, podpisanie i wgranie skanu.", "Sprawdź podgląd dokładnej wersji i wyślij.", "Monitoruj otwarcie, decyzję i podpis; w razie potrzeby wyślij przypomnienie.", "Korektę utwórz jako nową wersję, nigdy przez edycję wysłanego pliku."], "Rodzic widzi dokładne dokumenty i skutek decyzji. System zachowuje datę, wersję, zdarzenia i dowód techniczny.", ["wysłać pakiet dokumentów", "zmieniać status administracyjny", "sprawdzić historię"], ["edytować wysłanego PDF", "uznać zwykłej akceptacji za podpis kwalifikowany", "ominąć informacji o odpłatności"], ["pusta lista rodziców: sprawdź role i relację z dzieckiem", "brak podglądu: sprawdź typ i skan pliku", "rodzic nie odpowiada: użyj przypomnienia w istniejącym kanale"], "Przed produkcją wzór umowy, RODO i komunikaty konsumenckie zatwierdza prawnik szkoły."),
        manual_entry("Płatności i raty", "Statusy rat są ręczną ewidencją szkoły opartą na kosztorysie z umowy.", "Menu → Płatności", "platnosci.png", ["sprawdź właściwą umowę i harmonogram rat", "zweryfikuj wpłatę poza systemem"], ["Wyszukaj rodzica, ucznia albo umowę.", "Kliknij liczbę rat, aby otworzyć ich pełną listę.", "Wybierz ratę i zmień status na oczekującą, opłaconą albo zaległą.", "Dodaj krótką notatkę bez danych rachunku i zapisz.", "Sprawdź datę oraz osobę zmieniającą status."], "Nowy status pojawia się rodzicowi i może utworzyć powiadomienie. Historia zmiany pozostaje w audycie.", ["zarządzać statusem każdej raty", "filtrować zaległości", "przejść do umowy"], ["pobrać płatności online", "automatycznie uzgodnić przelewu", "usunąć historii"], ["brak rat: popraw kosztorys przez nową wersję umowy", "status nie zapisany: sprawdź komunikat i uprawnienia", "rozbieżność: porównaj umowę z księgowością"], "System nie zastępuje banku ani księgowości. Status zmieniaj dopiero po rzeczywistej weryfikacji."),
        manual_entry("Materiały, zadania i postępy", "Dyrektor może nadzorować treści dydaktyczne, ich odbiorców, oddania zadań oraz opisowe postępy.", "Menu → Nauka albo Postępy", "nauka.png", ["ustal grupę lub konkretnych odbiorców", "przygotuj bezpieczny plik do 8 MB"], ["W Nauka wybierz materiał albo zadanie.", "Dodaj tytuł, opis, plik lub link i wyszukaj odbiorców.", "Dla zadania ustaw termin oraz instrukcję.", "Sprawdź publikację na liście i statusy oddań.", "W Postępy otwórz ucznia, dodaj konkretną obserwację, mocną stronę i następny krok.", "Obejrzyj trend wraz z obecnością, ale traktuj go jako pomoc opisową."], "Treść trafia wyłącznie do wybranych osób. Oddania są prywatne, a postępy widzą tylko uprawnione role.", ["publikować do grup i osób", "sprawdzać oddania", "dodawać obserwacje"], ["udostępnić oddania innym uczniom", "używać trendu jako diagnozy", "publikować pliku bez skanu"], ["materiał wywala widok: sprawdź format i zgłoś ekran błędu", "odbiorca niewidoczny: użyj wyszukiwarki i sprawdź przypisanie", "wykres pusty: dodaj obserwacje z różnych dat"], "Opisuj zachowanie na lekcji i konkretną umiejętność, a nie trwałą cechę dziecka."),
    ]


def teacher_functions():
    return [
        manual_entry("Pierwsze logowanie i pulpit wykładowcy", "Pulpit pokazuje najbliższe zajęcia, własne grupy i zadania bez danych całej szkoły.", "Logowanie → samouczek → menu Start", "wykladowca-start.png", ["użyj własnego zaproszenia", "przygotuj mocne hasło"], ["Ustaw hasło i potwierdź adres e-mail.", "Przejdź samouczek i pobierz podręcznik, jeśli chcesz mieć go offline.", "Na Start sprawdź najbliższą lekcję i powiadomienia.", "Otwórz kartę lekcji, aby zobaczyć grupę, miejsce i przygotowania."], "Konto pokazuje tylko przypisane grupy. Brak zajęć oznacza brak publikacji lub brak przypisania, a nie awarię całej szkoły.", ["widzieć własne grupy i zajęcia", "otworzyć własne wiadomości", "zgłosić problem"], ["widzieć cudzych grup", "edytować kont i umów", "publikować zmian grafiku bez zgody"], ["pusty pulpit: poproś dyrektora o przypisanie grupy", "brak e-maila: sprawdź spam", "zła rola: nie używaj konta innej osoby"], "Przed pierwszymi zajęciami sprawdź plan, lokalizacje i ustaw dostępność."),
        manual_entry("Dostępność według dnia i lokalizacji", "Możesz zapisać wiele różnych godzin i miejsc tego samego dnia, aby plan uwzględniał przejazdy.", "Start lub Profil → Dostępność", "wykladowca-plan.png", ["ustal realne godziny w każdym miejscu", "uwzględnij czas przejazdu"], ["Wybierz dzień tygodnia.", "Dodaj godzinę od - do i lokalizację.", "W tym samym dniu wybierz plus, aby dodać kolejny przedział.", "Powtórz dla pozostałych dni.", "Zapisz, poczekaj na komunikat sukcesu i przejdź do innej zakładki.", "Wróć i sprawdź, czy przedziały pozostały."], "Po zapisie wszystkie przedziały są widoczne, a generator może je wykorzystać. Nakładanie lub niemożliwy przejazd zostaną oznaczone.", ["dodać wiele przedziałów", "wybrać różne lokalizacje", "zmienić przyszłą dostępność"], ["zapisać nakładania", "udawać natychmiastowego przejazdu", "zmienić już opublikowanej lekcji przez samą dostępność"], ["widok chwilowo pusty: poczekaj na potwierdzenie albo odśwież raz", "brak plusa: upewnij się, że poprzedni wiersz ma komplet danych", "konflikt: zostaw realną przerwę na dojazd"], "Wpisuj tylko dostępność, którą rzeczywiście możesz utrzymać co tydzień."),
        manual_entry("Plan i propozycja zmiany", "Wykładowca widzi własny opublikowany plan i może zaproponować korektę dyrektorowi.", "Menu → Mój plan", "wykladowca-plan.png", ["sprawdź datę, grupę i miejsce", "przy zmianie przygotuj uzasadnienie"], ["Wybierz dzień i otwórz kartę lekcji.", "Sprawdź salę, lokalizację i uczestników.", "Jeśli potrzebna jest zmiana, wybierz „Zaproponuj zmianę”.", "Podaj nowy termin lub zasób i krótki powód.", "Wyślij do akceptacji i obserwuj powiadomienie o decyzji."], "Plan zmieni się dopiero po akceptacji dyrektora. Do tego czasu obowiązuje dotychczasowa lekcja.", ["oglądać własny plan", "zgłosić propozycję", "śledzić decyzję"], ["przeciągnąć lekcji na stałe", "zmienić sali bez akceptacji", "edytować cudzej grupy"], ["brak lekcji: sprawdź tydzień", "propozycja odrzucona: przeczytaj powód i napisz do dyrektora", "karta zasłonięta: zamknij inne okno"], "Nie informuj grupy o nowej godzinie, dopóki system nie pokaże akceptacji dyrektora."),
        manual_entry("Prowadzenie lekcji, temat i obecność", "Karta lekcji służy do zapisania rzeczywistego przebiegu zajęć i obecności uczniów.", "Mój plan → kliknij lekcję → Uzupełnij lekcję", "wykladowca-plan.png", ["otwórz właściwą datę", "przygotuj temat i listę obecności"], ["Kliknij kartę lekcji.", "Wpisz konkretny temat i zakres ćwiczeń.", "Przy każdym uczniu wybierz obecny, nieobecny albo nieustalony.", "Dodaj krótką notatkę wyłącznie wtedy, gdy jest potrzebna.", "Zapisz i sprawdź komunikat sukcesu."], "Temat i obecność pojawią się w historii lekcji, panelu rodzica, ucznia i postępach zgodnie z rolą.", ["uzupełnić własną lekcję", "poprawić omyłkę", "zobaczyć przypisanych uczniów"], ["edytować cudzej lekcji", "wpisywać diagnozy medycznej", "usunąć historii zmiany"], ["ucznia nie ma: dyrektor musi poprawić grupę", "zapis nie działa: sprawdź wymagany temat", "obecność rozjechana: odśwież po zapisie i zgłoś, jeśli wraca"], "Uzupełniaj lekcję od razu po zajęciach, zanim pamięć o obecności stanie się niepewna."),
        manual_entry("Odwołanie zajęć", "Odwołanie wymaga powodu i automatycznie informuje grupę oraz rodziny.", "Karta lekcji → Odwołaj zajęcia", "wykladowca-plan.png", ["upewnij się, że odwołujesz właściwą lekcję", "napisz informację zrozumiałą dla rodzica i ucznia"], ["Otwórz lekcję i wybierz „Odwołaj”.", "Wpisz powód oraz informację, czy termin odrobienia będzie podany później.", "Potwierdź skutek odwołania.", "Sprawdź powiadomienie oraz kanał grupy."], "Lekcja otrzymuje status odwołanej i znika ze zwykłego planu. Dyrektor, rodzice i uczniowie dostają informację.", ["zgłosić odwołanie własnej lekcji", "podać jasny powód", "zobaczyć odwołane po włączeniu filtra"], ["odwołać bez powodu", "trwale usunąć historii", "odwołać cudzej lekcji"], ["odwołana nadal widoczna: sprawdź filtr", "brak e-maila: informacja w aplikacji jest źródłem prawdy", "błąd: nie klikaj wielokrotnie, sprawdź status"], "Nie podawaj szczegółów zdrowotnych. Wystarczy neutralny powód organizacyjny."),
        manual_entry("Wiadomości i załączniki", "Wykładowca pisze do przypisanych grup, wysyła pliki i prosi o potwierdzenie przeczytania.", "Menu → Wiadomości", "wiadomosci-mobile.png", ["wybierz właściwą grupę", "przygotuj plik do 8 MB"], ["Otwórz rozmowę grupy.", "Wpisz wiadomość albo wybierz sam załącznik.", "Jeżeli informacja jest ważna, włącz potwierdzenie przeczytania.", "Wyślij i poczekaj, aż załącznik zniknie z pola.", "Sprawdź status oraz reakcje odbiorców.", "Pomoc techniczną otwórz przyciskiem do twórcy aplikacji."], "Wiadomość pojawia się w historii. Na telefonie historia przewija się osobno, a pole odpowiedzi zostaje na dole.", ["pisać do przypisanych kanałów", "wysłać sam plik", "dodać reakcję"], ["dodawać dowolnych osób do grupy", "wysłać pliku bez skanu", "ukryć wiadomości przed dyrektorem"], ["plik wywala widok: zgłoś problem z ekranu i podaj typ pliku", "brak grupy: sprawdź przypisanie", "e-mail oczekuje: historia w aplikacji już istnieje"], "Do materiału edukacyjnego używaj modułu Nauka; czat służy do rozmowy i krótkich załączników.", True),
        manual_entry("Materiały i zadania", "Moduł Nauka publikuje pliki, linki i zadania do grup albo konkretnych uczniów.", "Menu → Nauka", "nauka.png", ["przygotuj tytuł i krótki opis", "wybierz prawidłowych odbiorców"], ["Wybierz „Dodaj materiał” albo „Utwórz zadanie”.", "Dodaj plik lub bezpieczny link.", "Wyszukaj grupę lub uczniów; krótka lista pokazuje tylko podpowiedzi.", "Dla zadania wpisz instrukcję i termin.", "Opublikuj i sprawdź potwierdzenie.", "Otwórz pozycję ponownie, aby zobaczyć odbiorców."], "Po poprawnym zapisie okno się zamyka, a pozycja pojawia się na liście właściwych odbiorców.", ["publikować do własnych grup", "przypisać konkretnego ucznia", "dodać plik lub link"], ["publikować do cudzych grup", "ominąć skanowania pliku", "zobaczyć prywatne oddania innych uczniów"], ["okno nie znika: poczekaj na komunikat i nie klikaj drugi raz", "materiał niewidoczny: sprawdź odbiorców", "plik odrzucony: zmniejsz go lub użyj dozwolonego formatu"], "Tytuł powinien mówić uczniowi, co ma zrobić, bez otwierania pliku."),
        manual_entry("Oddania, informacja zwrotna i postępy", "Wykładowca sprawdza prace, odpowiada uczniowi i zapisuje opisowe postępy.", "Nauka → Zadania albo menu Postępy", "postepy.png", ["otwórz właściwego ucznia i zadanie", "przeczytaj oddanie przed oceną"], ["W zadaniu otwórz prywatne oddanie ucznia.", "Pobierz załącznik i zapisz rzeczową informację zwrotną.", "W Postępy wybierz ucznia.", "Dodaj konkretną umiejętność, mocną stronę i następny krok.", "Sprawdź trend z obecnością i historią lekcji."], "Uczeń oraz powiązany rodzic widzą informację zgodnie z uprawnieniami. Wykres aktualizuje się po nowych obserwacjach.", ["sprawdzić prace własnych grup", "dodać feedback", "zapisać obserwację"], ["porównywać dzieci publicznie", "stawiać diagnozy", "edytować cudzej grupy"], ["brak oddania: sprawdź termin i odbiorców", "wykres pusty: potrzebuje danych z kilku dat", "zła osoba: wróć bez zapisu i wybierz ponownie"], "Pisz o konkretnej czynności: „buduje pytania w Past Simple”, nie „jest słaby”."),
        manual_entry("Powiadomienia, instrukcja i zgłoszenie problemu", "Centrum powiadomień oraz podręcznik pomagają nie pominąć decyzji i szybko zgłosić błąd.", "Górny pasek → dzwonek, Instrukcja albo Zgłoś problem", "powiadomienia.png", ["sprawdź, którego dnia dotyczy powiadomienie", "przed zrzutem przejdź do miejsca błędu"], ["Kliknij dzwonek i filtruj źródło.", "Oznacz przeczytane po zapoznaniu się ze sprawą.", "Użyj „Przypomnij jutro”, jeśli sprawa naprawdę może poczekać.", "Pod „Instrukcja” pobierz zawsze najnowszy podręcznik wykładowcy.", "Przy błędzie otwórz właściwy ekran, wybierz „Zgłoś problem” i świadomie wykonaj zrzut."], "Powiadomienie zmienia stan z wyraźnym potwierdzeniem. Zgłoszenie trafia do obsługi z kontekstem ekranu, ale bez haseł.", ["zarządzać własnymi powiadomieniami", "pobrać podręcznik", "zgłosić problem"], ["zobaczyć powiadomień innych ról", "wykonać zrzutu bez podglądu", "wysłać sekretów"], ["licznik nie znika: wykonaj sprawę albo odśwież", "stary PDF: pobierz nowy z panelu", "pilna awaria: użyj także ustalonego kanału szkoły"], "Oznaczenie „przeczytane” znaczy, że informacja została sprawdzona, nie że zadanie zostało wykonane."),
    ]


def parent_functions():
    return [
        manual_entry("Pierwsze logowanie i wybór dziecka", "Konto rodzica pokazuje wyłącznie dzieci powiązane przez szkołę oraz ich bieżące sprawy.", "Link z zaproszenia → logowanie → samouczek → Start", "rodzic-start.png", ["użyj własnego zaproszenia", "przygotuj hasło mające co najmniej 12 znaków", "nie zakładaj drugiego konta dla kolejnego dziecka"], ["Otwórz link z zaproszenia, ustaw hasło i potwierdź adres e-mail.", "Zaloguj się i przejdź krótki samouczek.", "Po samouczku wybierz „Pobierz PDF”, aby zachować ten podręcznik, albo „Nie teraz”.", "Na górze panelu wybierz dziecko, jeżeli szkoła przypisała ich kilkoro.", "Sprawdź, czy imię, grupa i najbliższe zajęcia są poprawne."], "Panel zapamiętuje wybrane dziecko i pokazuje tylko jego plan, naukę, postępy oraz dokumenty powiązane z rodzicem.", ["przełączać się między własnymi dziećmi", "zmienić własne hasło", "pobrać aktualny podręcznik"], ["samodzielnie dodać dziecka", "zobaczyć dzieci innej rodziny", "użyć jednego zaproszenia do utworzenia kilku kont"], ["brak dziecka: napisz do dyrektora, aby poprawił przypisanie", "brak e-maila: sprawdź spam i poprawność adresu", "zły panel: wyloguj się z konta innej osoby"], "Jedno konto rodzica może obsługiwać kilkoro dzieci. Nie twórz osobnego konta dla każdego z nich."),
        manual_entry("Start i najbliższe zajęcia", "Pulpit rodzica zbiera najbliższą lekcję, pilne powiadomienia oraz skróty do spraw dziecka.", "Menu → Start", "rodzic-start.png", ["wybierz właściwe dziecko", "sprawdź datę widoczną przy najbliższej lekcji"], ["Otwórz Start po zalogowaniu.", "Przeczytaj kartę „Najbliższe zajęcia”: dzień, godzinę, lokalizację i wykładowcę.", "Kliknij kartę, aby zobaczyć pełne szczegóły lekcji.", "Sprawdź powiadomienia dotyczące zmian planu, zadań, umów lub rat.", "Użyj skrótu do planu, wiadomości, nauki albo postępów."], "Kliknięta karta prowadzi bezpośrednio do właściwej sprawy. Załatwione powiadomienie można oznaczyć jako przeczytane.", ["widzieć podsumowanie swoich dzieci", "przejść do szczegółów", "odłożyć przypomnienie do jutra"], ["edytować grafiku", "zmienić wykładowcy lub sali", "widzieć spraw całej szkoły"], ["brak najbliższej lekcji: sprawdź inne dziecko i tydzień", "stara informacja: odśwież ekran jeden raz", "brak dostępu: poproś szkołę o sprawdzenie przypisania"], "Przed wyjściem z domu zawsze otwórz szczegóły najbliższej lekcji — tam jest aktualna lokalizacja."),
        manual_entry("Plan i szczegóły lekcji", "Plan pokazuje opublikowane zajęcia dziecka w czytelnym widoku dnia na telefonie i tygodnia na komputerze.", "Menu → Mój plan → kliknij lekcję", "grafik.png", ["wybierz dziecko i właściwy tydzień", "na telefonie obróć ekran tylko wtedy, gdy chcesz zobaczyć więcej dni"], ["Otwórz „Mój plan”.", "Przesuwaj dni przyciskami, zamiast przewijać długi pusty kalendarz.", "Kliknij kartę lekcji.", "Sprawdź godzinę, lokalizację, salę, wykładowcę, temat i status obecności.", "Jeśli zajęcia są odwołane, przeczytaj powód i informację o dalszych krokach."], "Szczegóły otwierają się w oknie bez zmiany danych. Zmiana lub odwołanie tworzą powiadomienie.", ["oglądać plan swoich dzieci", "otworzyć szczegóły i obecność", "zobaczyć odwołane zajęcia"], ["przeciągać lekcji", "zmienić obecności zatwierdzonej przez wykładowcę", "otworzyć cudzej grupy"], ["plan pusty: sprawdź dziecko, tydzień i opublikowanie planu", "karta nie otwiera się: odśwież i zgłoś problem z tego ekranu", "inna lokalizacja niż w wiadomości: źródłem prawdy jest aktualna karta lekcji"], "Nie zapisuj planu na stałe jako zdjęcia. Otwieraj bieżący widok, bo szkoła może opublikować zmianę."),
        manual_entry("Wiadomości i potwierdzenie przeczytania", "Rodzic rozmawia ze szkołą w jednym służbowym miejscu i może świadomie potwierdzić ważną informację.", "Menu → Wiadomości", "wiadomosci-mobile.png", ["wybierz rozmowę dotyczącą właściwego dziecka", "przygotuj plik do 8 MB, jeśli jest potrzebny"], ["Otwórz listę rozmów i wybierz kanał grupy albo rozmowę prywatną.", "Przeczytaj historię; na telefonie przewija się tylko środkowa część, a pole odpowiedzi pozostaje na dole.", "Wpisz tekst albo wybierz sam załącznik.", "Wyślij i poczekaj na pojawienie się wiadomości w historii.", "Przy ważnej wiadomości wybierz „Przeczytałem/am”, jeśli szkoła prosi o potwierdzenie.", "Aby wrócić do listy na telefonie, użyj przycisku „Rozmowy”."], "Wiadomość i załącznik pozostają w historii aplikacji. Potwierdzenie zapisuje datę, ale nie oznacza automatycznie zgody na inną czynność.", ["pisać w przypisanych rozmowach", "wysłać sam plik", "dodać reakcję i potwierdzenie"], ["dodać dowolnych osób do rozmowy", "zobaczyć rozmów innej rodziny", "wysłać niedozwolonego pliku"], ["brak rozmowy: wejdź z kartoteki lub poproś szkołę o utworzenie kanału", "plik nie wyszedł: sprawdź rozmiar i format", "wiadomość e-mail nie przyszła: sprawdź historię w aplikacji"], "Wiadomości dotyczące zdrowia lub innych danych szczególnych przekazuj wyłącznie ustalonym, bezpiecznym kanałem szkoły."),
        manual_entry("Umowa, kosztorys i sposób podpisania", "Rodzic otrzymuje dokładną wersję PDF, kosztorys i harmonogram oraz wybiera przewidziany przez szkołę sposób zawarcia.", "Menu → Umowy → wybierz dokument", "umowy.png", ["wybierz właściwe dziecko", "przygotuj czas na przeczytanie całego PDF, kosztorysu i harmonogramu"], ["Otwórz umowę oznaczoną „Czeka na Twoją decyzję”.", "Przeczytaj PDF, RODO, kosztorys, liczbę i kwotę rat oraz harmonogram zajęć.", "Sprawdź jasny komunikat o odpłatności i skutku kliknięcia.", "Jeżeli wybrano formę elektroniczną, zaznacz wymagane oświadczenia i potwierdź decyzję przyciskiem jednoznacznie mówiącym o zawarciu odpłatnej umowy.", "Jeżeli wybrano podpis odręczny, pobierz PDF, podpisz go i wgraj czytelny skan lub zdjęcie.", "Pobierz własny egzemplarz oraz sprawdź datę i status."], "System zachowuje niezmienną wersję dokumentu, czas, metodę i historię zdarzeń. Korekta szkoły przychodzi jako nowa wersja do osobnej decyzji.", ["przeczytać wszystkie dokumenty przed decyzją", "odmówić lub poprosić szkołę o wyjaśnienie", "pobrać i wgrać podpisany egzemplarz, jeśli przewidziano tę metodę"], ["edytować PDF szkoły", "zaakceptować w imieniu innego rodzica bez umocowania", "uznać zwykłej akceptacji za kwalifikowany podpis elektroniczny"], ["brak dokumentu: poproś szkołę o ponowne przypisanie", "nieczytelny skan: wykonaj zdjęcie w dobrym świetle", "kwota się nie zgadza: nie akceptuj; napisz w sprawie umowy"], "Decyzję podejmuj dopiero po przeczytaniu wszystkich trzech części: umowy z RODO, kosztorysu i harmonogramu."),
        manual_entry("Płatności i raty", "Widok płatności pokazuje kosztorys z umowy oraz ręcznie oznaczony przez szkołę stan każdej raty.", "Menu → Płatności → kliknij liczbę rat", "platnosci.png", ["wybierz dziecko i właściwą umowę", "przygotuj własne potwierdzenie przelewu tylko do porównania"], ["Otwórz Płatności.", "Kliknij kartę umowy albo liczbę rat.", "Sprawdź kwotę całkowitą, liczbę rat, kwotę każdej raty, termin i status.", "Kliknij ratę, aby zobaczyć szczegóły zmiany statusu.", "Jeżeli widzisz rozbieżność, przejdź do rozmowy ze szkołą — nie wysyłaj danych logowania do banku."], "Rodzic widzi wyłącznie własne rozliczenia. Zmiana dokonana przez szkołę może utworzyć powiadomienie.", ["sprawdzić status i terminy", "przejść do powiązanej umowy", "napisać do szkoły"], ["samodzielnie zmienić status raty", "wykonać płatności przez system", "zobaczyć księgowości innych osób"], ["rata nadal oczekuje po przelewie: skontaktuj się ze szkołą", "brak harmonogramu: sprawdź umowę", "kwota różni się od PDF: wstrzymaj decyzję i zgłoś rozbieżność"], "Ten moduł jest ewidencją, a nie bankiem. Potwierdzeniem zapłaty pozostaje dokument bankowy lub pokwitowanie szkoły."),
        manual_entry("Materiały i zadania dziecka", "Nauka zbiera materiały, bezpieczne linki, zadania, terminy i informację zwrotną przypisane dziecku.", "Menu → Nauka", "nauka.png", ["wybierz właściwe dziecko", "sprawdź termin i nazwę grupy"], ["Otwórz listę materiałów i zadań.", "Użyj filtrów, aby zobaczyć pozycje nowe, terminowe lub zakończone.", "Kliknij materiał i pobierz plik albo otwórz link.", "W zadaniu przeczytaj instrukcję, termin oraz status oddania.", "Jeśli szkoła pozwala rodzicowi pomóc w przesłaniu, wybierz plik i poczekaj na potwierdzenie.", "Otwórz informację zwrotną po sprawdzeniu pracy."], "Lista pokazuje tylko treści przypisane dziecku. Oddanie i feedback są prywatne.", ["pobrać materiały dziecka", "sprawdzić termin i oddanie", "przeczytać feedback"], ["zobaczyć prac innych uczniów", "zmienić zadania wykładowcy", "publikować materiałów"], ["plik się nie otwiera: pobierz ponownie i sprawdź typ", "zadanie niewidoczne: sprawdź dziecko i grupę", "termin jest błędny: napisz do wykładowcy przed wysłaniem"], "Pomagaj organizacyjnie, ale nie wykonuj zadania za dziecko — feedback ma opisywać jego własną pracę."),
        manual_entry("Obecność i postępy", "Rodzic widzi zatwierdzoną obecność, opisowe obserwacje i trend nauki dziecka.", "Menu → Postępy albo szczegóły lekcji", "postepy.png", ["wybierz właściwe dziecko", "pamiętaj, że wykres jest pomocą, nie diagnozą"], ["Otwórz Postępy.", "Wybierz okres i obszar językowy.", "Kliknij punkt wykresu, aby zobaczyć obserwację z konkretnej daty.", "Porównaj trend z obecnością i historią lekcji.", "Przeczytaj mocną stronę oraz następny krok zapisany przez wykładowcę.", "W razie niezgodności obecności napisz do szkoły z datą lekcji."], "Widok łączy dane tylko powiązanego dziecka. Nowa obserwacja lub korekta obecności aktualizuje historię.", ["oglądać własne dzieci", "otwierać szczegóły wykresu", "zgłosić rozbieżność"], ["edytować obserwacji", "porównywać danych cudzych dzieci", "traktować predykcji jako diagnozy"], ["wykres pusty: potrzeba obserwacji z kilku dat", "obecność nie zgadza się: podaj konkretną lekcję", "stare dane: zmień okres i odśwież"], "Rozmawiaj o jednym następnym kroku, nie o samej linii wykresu. Najważniejsza jest opisowa informacja wykładowcy."),
        manual_entry("Powiadomienia, instrukcja i pomoc", "Centrum powiadomień pomaga zauważyć zmianę planu, nową wiadomość, dokument, ratę lub zadanie.", "Górny pasek → dzwonek, Instrukcja albo Zgłoś problem", "powiadomienia.png", ["najpierw wybierz właściwe dziecko", "przed zgłoszeniem przejdź do ekranu błędu"], ["Otwórz dzwonek i wybierz źródło powiadomienia.", "Kliknij pozycję, aby przejść do właściwego dokumentu lub rozmowy.", "Po zapoznaniu się wybierz „Oznacz jako przeczytane”.", "Jeśli sprawa może poczekać, wybierz „Przypomnij jutro”.", "Pod „Instrukcja” pobierz zawsze aktualny podręcznik rodzica.", "Przy błędzie użyj „Zgłoś problem” dopiero na ekranie, którego dotyczy problem."], "Akcja pokazuje potwierdzenie. Podręcznik można pobrać ponownie w każdej chwili.", ["zarządzać własnymi powiadomieniami", "pobrać instrukcję", "zgłosić problem z podglądem zrzutu"], ["zobaczyć powiadomień innej rodziny", "wysłać hasła lub kodu MFA w zgłoszeniu", "wykonać zrzutu bez świadomej zgody"], ["powiadomienie wraca: właściwa sprawa nadal wymaga działania", "nieaktualna instrukcja: pobierz nową z panelu", "pilna sprawa: skontaktuj się także ustalonym kanałem szkoły"], "Oznaczenie jako przeczytane nie podpisuje umowy, nie opłaca raty i nie potwierdza obecności — każda z tych czynności ma osobną akcję."),
    ]


def student_functions():
    return [
        manual_entry("Pierwsze logowanie i własny pulpit", "Konto ucznia pokazuje własne zajęcia, materiały, wiadomości i postępy bez spraw finansowych rodzica.", "Link z zaproszenia → logowanie → samouczek → Start", "uczen-start.png", ["użyj własnego konta", "jeżeli jesteś młodszym uczniem, poproś rodzica o pomoc przy pierwszym logowaniu"], ["Otwórz zaproszenie i ustaw własne hasło.", "Potwierdź e-mail, jeśli szkoła tego wymaga.", "Przejdź samouczek.", "Po samouczku pobierz ten PDF albo wybierz „Nie teraz”.", "Na Start sprawdź najbliższą lekcję, nowe zadania i wiadomości."], "System otwiera panel ucznia i nie pokazuje umów, rat ani prywatnych wiadomości rodzica.", ["widzieć własne sprawy", "zmienić swoje hasło", "pobrać instrukcję"], ["wejść do panelu dyrektora", "zobaczyć finansów rodzica", "użyć konta kolegi"], ["brak e-maila: poproś rodzica lub szkołę o sprawdzenie adresu", "zły panel: wyloguj się i użyj swojego konta", "brak lekcji: sprawdź tydzień"], "Hasło jest prywatne. Nie podawaj go koledze, wykładowcy ani w zgłoszeniu błędu."),
        manual_entry("Najbliższe zajęcia", "Karta najbliższej lekcji mówi, kiedy i gdzie masz być oraz kto prowadzi zajęcia.", "Menu → Start → Najbliższe zajęcia", "uczen-start.png", ["sprawdź aktualną datę", "upewnij się, że patrzysz na swoje konto"], ["Otwórz Start.", "Znajdź kartę „Najbliższe zajęcia”.", "Sprawdź dzień, godzinę, lokalizację i wykładowcę.", "Kliknij kartę, aby zobaczyć szczegóły oraz materiały do przygotowania.", "Jeśli lekcja jest odwołana, przeczytaj powód i powiadomienie."], "Po kliknięciu widzisz pełną kartę lekcji. Zmiana planu pojawia się także w powiadomieniach.", ["otworzyć własną lekcję", "sprawdzić miejsce i temat", "zobaczyć odwołanie"], ["zmienić godziny", "przenieść lekcji", "otworzyć cudzej grupy"], ["brak karty: nie ma opublikowanej lekcji w najbliższym czasie", "miejsce inne niż pamiętasz: sprawdź aktualny plan", "karta się nie otwiera: odśwież i zgłoś problem"], "Sprawdzaj kartę przed wyjściem, szczególnie gdy szkoła ma kilka lokalizacji."),
        manual_entry("Mój plan i szczegóły lekcji", "Plan pokazuje Twoje opublikowane zajęcia w krótkim widoku dnia na telefonie.", "Menu → Mój plan", "grafik.png", ["wybierz właściwy tydzień", "na telefonie używaj przycisków dnia"], ["Otwórz „Mój plan”.", "Przejdź do dnia, który chcesz sprawdzić.", "Kliknij lekcję.", "Przeczytaj godzinę, salę, wykładowcę, temat i status obecności.", "Zamknij okno krzyżykiem lub wróć do listy dni."], "Plan nie zmienia się od samego oglądania. Status obecności pojawia się po zapisaniu przez wykładowcę.", ["oglądać własny plan", "otwierać szczegóły", "sprawdzić obecność"], ["edytować plan", "ustawiać sali", "zatwierdzić obecności za wykładowcę"], ["kalendarz pusty: wybierz inny dzień lub tydzień", "lekcja znikła: sprawdź powiadomienie o odwołaniu", "obecność błędna: napisz do wykładowcy z datą"], "Nie przewijaj pustego dnia do końca — przełącz dzień albo wróć do Start i użyj najbliższej lekcji."),
        manual_entry("Obecność ucznia", "Możesz przekazać własną deklarację obecności, ale ostateczny zapis lekcji zatwierdza wykładowca.", "Szczegóły lekcji → Obecność", "wykladowca-plan.png", ["otwórz właściwą lekcję", "sprawdź, czy szkoła włączyła deklarację ucznia"], ["Kliknij swoją lekcję.", "Wybierz odpowiedź zgodną z zasadami szkoły, jeżeli przycisk jest dostępny.", "Potwierdź wybór.", "Poczekaj na zapis i nie klikaj drugi raz.", "Po lekcji sprawdź status zatwierdzony przez wykładowcę."], "Deklaracja jest widoczna prowadzącemu. Ostateczna obecność może zostać poprawiona na podstawie rzeczywistej listy zajęć.", ["zgłosić własny status", "zobaczyć zatwierdzony wynik", "napisać w razie pomyłki"], ["oznaczyć obecności kolegi", "zmienić listy grupy", "usunąć historii korekty"], ["brak przycisku: szkoła nie włączyła tej opcji lub lekcja jest poza dozwolonym czasem", "pomyłka: napisz do wykładowcy", "status nieustalony: poczekaj na zakończenie lekcji"], "Deklaruj zgodnie z prawdą. Ten przycisk nie służy do zwalniania się z zajęć."),
        manual_entry("Wiadomości i ważne potwierdzenia", "Uczeń czyta wiadomości swojej grupy, odpowiada i może świadomie potwierdzić zapoznanie się z informacją.", "Menu → Wiadomości", "wiadomosci-mobile.png", ["wybierz właściwą rozmowę", "nie wysyłaj haseł ani prywatnych danych innych osób"], ["Otwórz listę rozmów.", "Wybierz kanał grupy lub rozmowę z wykładowcą.", "Przeczytaj historię, przewijając środkową część ekranu.", "Wpisz odpowiedź albo wybierz sam załącznik.", "Przy ważnym ogłoszeniu wybierz „Przeczytałem/am”, jeśli pojawi się taki przycisk.", "Użyj reakcji tylko wtedy, gdy pasuje do szkolnej rozmowy."], "Odpowiedź pojawia się w historii. Potwierdzenie zapisuje tylko przeczytanie danej wiadomości.", ["pisać w przypisanych kanałach", "wysłać dozwolony plik", "potwierdzić przeczytanie"], ["dodać osób do rozmowy", "widzieć wiadomości rodzica", "potwierdzić umowy lub płatności"], ["brak kanału: poproś wykładowcę", "załącznik odrzucony: sprawdź format i rozmiar", "wiadomości nie przewijają się: przewijaj wewnątrz historii, nie całej strony"], "Pisz krótko i na temat. Sprawy prywatne wyślij w rozmowie prywatnej, nie na grupie."),
        manual_entry("Materiały do nauki", "Materiały zawierają pliki i linki przypisane Twojej grupie albo bezpośrednio Tobie.", "Menu → Nauka → Materiały", "nauka.png", ["sprawdź, czy masz Internet", "przygotuj aplikację do otwierania PDF, jeśli materiał jest plikiem"], ["Otwórz Nauka i wybierz „Materiały”.", "Kliknij tytuł materiału.", "Przeczytaj opis i sprawdź, dla kogo został opublikowany.", "Pobierz plik albo otwórz link.", "Wróć do listy i sprawdź, czy są kolejne nowe pozycje."], "Materiał otwiera się bez zmiany jego treści. Lista zawiera wyłącznie treści przeznaczone dla Ciebie.", ["pobrać własne materiały", "otworzyć bezpieczny link", "zgłosić uszkodzony plik"], ["publikować materiałów", "zobaczyć zasobów innych grup", "omijać ostrzeżenia przeglądarki"], ["plik nie działa: pobierz go ponownie", "link ostrzega: nie kontynuuj i napisz do wykładowcy", "materiał zniknął: sprawdź filtr i datę publikacji"], "Pobieraj materiały z systemu, nie z przypadkowych kopii przesłanych przez inne osoby."),
        manual_entry("Zadania i wysłanie pracy", "Zadanie ma instrukcję, termin i prywatne miejsce na odpowiedź lub plik.", "Menu → Nauka → Zadania", "nauka.png", ["przeczytaj całą instrukcję", "przygotuj plik w dozwolonym formacie i rozmiarze"], ["Otwórz zadanie i sprawdź termin.", "Przeczytaj instrukcję oraz wymagany sposób odpowiedzi.", "Wpisz odpowiedź albo wybierz załącznik.", "Wyślij i poczekaj na komunikat sukcesu oraz zamknięcie okna.", "Otwórz zadanie ponownie i sprawdź status oddania.", "Po sprawdzeniu przeczytaj feedback wykładowcy."], "Twoje oddanie jest prywatne. System zapisuje czas wysłania i pokazuje jego status.", ["wysłać własną pracę", "dodać dozwolony plik", "przeczytać feedback"], ["zobaczyć prac kolegów", "zmienić terminu", "edytować feedbacku"], ["okno nie znika: poczekaj na komunikat i nie wysyłaj drugi raz", "plik za duży: zmniejsz go lub zapytaj o inną formę", "błędne oddanie: napisz do wykładowcy przed terminem"], "Po wysłaniu zawsze otwórz zadanie ponownie i sprawdź, czy status mówi „Oddano”."),
        manual_entry("Moje postępy", "Postępy pokazują opis umiejętności, mocne strony, następny krok, obecność i przybliżony trend.", "Menu → Postępy", "postepy.png", ["wybierz okres", "pamiętaj, że wykres nie jest oceną Twojej wartości"], ["Otwórz Postępy.", "Wybierz obszar, na przykład mówienie, słuchanie lub gramatykę.", "Kliknij punkt wykresu, aby przeczytać obserwację z konkretnej lekcji.", "Sprawdź mocną stronę i następny krok.", "Porównaj trend z obecnością i wykonanymi zadaniami.", "Jeśli nie rozumiesz komentarza, zapytaj wykładowcę w wiadomości."], "Nowe obserwacje tworzą historię. Trend jest tylko pomocą opartą na dostępnych wpisach.", ["widzieć własne dane", "otworzyć szczegóły punktów", "napisać do wykładowcy"], ["widzieć wyników kolegów", "edytować obserwacji", "traktować prognozy jako pewnej oceny przyszłości"], ["wykres pusty: potrzeba kilku obserwacji", "brak nowego wpisu: wykładowca mógł go jeszcze nie dodać", "nie zgadza się obecność: wskaż datę lekcji"], "Skup się na jednym kolejnym kroku. Wykres pomaga zauważyć zmianę, ale najważniejsza jest regularna nauka."),
        manual_entry("Powiadomienia, instrukcja i zgłoszenie problemu", "Powiadomienia przypominają o lekcji, zmianie planu, wiadomości, materiale lub zadaniu — nigdy o prywatnej umowie rodzica.", "Górny pasek → dzwonek, Instrukcja albo Zgłoś problem", "powiadomienia.png", ["sprawdź datę i źródło", "przed zgłoszeniem przejdź do ekranu błędu"], ["Kliknij dzwonek.", "Wybierz źródło, na przykład Grafik, Wiadomości albo Nauka.", "Kliknij pozycję, aby otworzyć właściwą sprawę.", "Po przeczytaniu wybierz „Oznacz jako przeczytane”.", "Jeśli chcesz wrócić jutro, użyj „Przypomnij jutro”.", "Pod „Instrukcja” pobierz podręcznik ucznia.", "Przy błędzie użyj „Zgłoś problem” na ekranie, którego dotyczy problem."], "Lista nie pokazuje podpisu umowy ani statusu płatności rodzica. Każda akcja ma widoczne potwierdzenie.", ["zarządzać własnymi powiadomieniami", "pobrać instrukcję", "zgłosić błąd"], ["zobaczyć spraw finansowych rodzica", "wysłać hasła w zgłoszeniu", "wykonać zrzutu bez podglądu"], ["powiadomienie wraca: sprawa nadal może być aktualna", "stary PDF: pobierz ponownie", "pilna sprawa dotycząca bezpieczeństwa: powiedz także dorosłemu"], "Jeśli zobaczysz informację o umowie lub płatności rodzica, nie otwieraj jej — zgłoś to jako błąd uprawnień."),
    ]



def build_owner_manual(path: Path):
    story = cover(
        "Podręcznik właściciela",
        "Pierwsze uruchomienie, serwer Raspberry Pi, szyfrowanie, kopie, odtwarzanie, aktualizacje i diagnostyka.",
        "Wyłącznie dla właściciela technicznego. Tego pliku nie przekazuj zwykłym użytkownikom szkoły.",
        RELEASE["ownerChanges"],
        "tworca-start.png",
    )
    story += [
        Paragraph("Najważniejsza odpowiedzialność", S["h1"]),
        Paragraph("Konto właściciela ma najwyższe uprawnienia techniczne. Służy do utrzymania systemu, nie do codziennej pracy szkoły.", S["body"]),
        callout("Nigdy nie przechowuj razem", "Hasła LUKS, klucza recovery LUKS, klucza AGE do kopii, kodów MFA i samej kopii. Co najmniej jeden komplet odzyskiwania trzymaj poza Raspberry Pi.", "red"),
        Paragraph("Cztery różne sekrety", S["h2"]),
        *bullets(["hasło główne LUKS — otwiera zaszyfrowany dysk", "klucz recovery LUKS — awaryjnie otwiera dysk", "klucz AGE — odszyfrowuje eksporty i backupy, ale nie dysk", "klucz automatycznego startu — root-only na karcie systemowej; uruchamia serwer po zaniku prądu"]),
        PageBreak(),
    ]
    story += section("Pierwsze uruchomienie", "Pusta instalacja ma jednorazowy kod i nie zawiera szkoły ani kont. Pierwsza osoba staje się właścicielem systemu.", None, ["otworzyć /pierwsze-uruchomienie", "wpisać kod, nazwę szkoły, imię, e-mail i mocne hasło", "ustawić i przetestować SMTP albo świadomie przejść bez poczty", "zapisać klucz odzyskiwania pokazany tylko raz", "skonfigurować MFA i zapisać kody awaryjne", "dopiero potem zaprosić dyrektora i pozostałe role"], ["kod instalacyjny działa tylko raz", "bez SMTP nie działają zaproszenia, reset hasła i e-maile", "utworzenie pierwszego konta bez poczty jest możliwe tylko dzięki fizycznie kontrolowanemu kodowi", "klucza odzyskiwania nie można odzyskać z publicznej strony"], "Najpierw klucze i MFA, potem poczta, następnie pierwsze zaproszenia.")
    story += section("Centrum systemu", "To pulpit stanu Raspberry, usług, dysków, aktualizacji i integracji.", "tworca-start.png", ["sprawdzić aplikację, PostgreSQL, nginx, Cloudflare i antywirusa", "zobaczyć temperaturę, pamięć, dyski i stan zasilania", "sprawdzić datę ostatniej kopii i testu odtworzenia", "uruchomić kontrolowany restart lub test", "przejść do bezpieczeństwa, logów i ustawień"], ["historyczne flagi zasilania nie znikają po poprawie zasilacza", "temperatura i komunikat o undervoltage wymagają działania sprzętowego", "panel nie udostępnia ogólnej powłoki SSH ani dowolnych poleceń root"], "Wszystkie zielone usługi nie wystarczą: sprawdź także kopię, odtworzenie, auto-start i zasilanie.")
    story += section("Konta, kartoteki i awaryjny reset hasła", "Właściciel widzi wszystkie kartoteki szkoły, w tym archiwalne, i może pomóc każdej roli odzyskać dostęp bez poznawania starego hasła.", "kartoteki.png", ["otworzyć Kartoteki i przełączyć widok na aktywne albo archiwalne", "wyszukać osobę i otworzyć jej kartę", "wybrać standardowy link resetu wysyłany e-mailem", "w awaryjnej sytuacji wygenerować hasło tymczasowe", "skopiować je tylko raz albo wysłać przez skonfigurowane SMTP", "przywrócić omyłkowo zarchiwizowaną kartotekę"], ["hasło tymczasowe wygasa po 30 minutach", "wszystkie dotychczasowe sesje tej osoby są zamykane", "po pierwszym logowaniu system wymusza ustawienie własnego hasła", "starego hasła nie da się podejrzeć", "wycofanie kartoteki nie usuwa umów, płatności ani audytu"], "Zwykły link e-mail jest wariantem zalecanym. Hasło tymczasowe przekazuj prywatnym kanałem wyłącznie właściwej osobie.")
    story += section("Serwer, integracje i moduły ról", "Ustawienia techniczne są pogrupowane według celu: widoczność funkcji, poczta, backup, eksport/import, tryb publiczny i kontrolowane operacje.", "tworca-ustawienia.png", ["w macierzy modułów pozostawić włączone tylko funkcje używane przez każdą rolę i zapisać zmianę", "osobno zdecydować, czy dyrektor może edytować stronę i wykonywać masowy import lub eksport; transfer danych jest domyślnie wyłączony", "sprawdzić panel wybranej roli; wyłączony moduł znika z menu, pulpitu i samouczka", "zapisać SMTP dopiero po prawdziwym teście wysyłki", "wybrać wykryty, zamontowany dysk USB", "ustawić harmonogram i retencję", "skonfigurować SFTP z weryfikacją odcisku", "pobrać pełny zaszyfrowany eksport", "wgrać kopię i zweryfikować kluczem", "przełączyć stronę szkoły i prezentację produktu"], ["wyłączenie modułu nie kasuje jego danych", "właściciel zawsze zachowuje dostęp naprawczy", "Start, logowanie, MFA, pomoc i zgłoszenie problemu pozostają dostępne", "import, eksport i zapis strony sprawdzają uprawnienie również na serwerze", "aplikacja działa z NoNewPrivileges i nie wykonuje sudo", "operacje systemowe przechodzą przez zamknięty broker z listą dozwolonych akcji", "SSH pozostaje prywatnym kanałem operatora, nie terminalem w przeglądarce"], "Po zmianie macierzy sprawdź konto każdej dotkniętej roli. Jeżeli formularz serwera zwróci błąd, nie obchodź go ręcznym chmod lub szerokim sudo — sprawdź usługę kla-web-control.")
    story += [
        Paragraph("Co dokładnie zawiera pełna kopia", S["h1"]),
        Paragraph("Pełny eksport jest tym samym, zweryfikowanym formatem co kopia serwerowa.", S["body"]),
        *bullets(["pełny pg_dump PostgreSQL: szkoła, konta, role, kartoteki, relacje, grupy, sale, grafik, obecności, umowy, raty, materiały, postępy, wiadomości, powiadomienia, statystyki i audyt", "private-files: PDF-y, podpisane skany, materiały, zdjęcia i załączniki", "manifest z czasem oraz commitem aplikacji", "zaszyfrowane sekrety ciągłości aplikacji, bez prywatnego klucza AGE"]),
        callout("Weryfikacja 1:1", "Test sprawdza SHA-256, odszyfrowuje archiwum, odrzuca niebezpieczne ścieżki, skanuje pliki ClamAV i wykonuje prawdziwe pg_restore do tymczasowej bazy. Dopiero później pozwala zatwierdzić odtworzenie.", "green"),
        Paragraph("Pobranie na komputer", S["h2"]),
        *bullets(["wybierz „Przygotuj kopię do pobrania”", "pobierz plik .tar.age oraz zachowaj sumę SHA-256", "pobieranie obsługuje Range, więc przeglądarka może wznowić transfer", "link wygasa po 24 godzinach"]),
        Paragraph("Import i odtworzenie", S["h2"]),
        *bullets(["wybierz plik i wpisz właściwy klucz AGE", "poczekaj na pełny test bez zamykania strony", "porównaj datę, commit i sumę", "zaznacz potwierdzenie i dopiero wtedy uruchom odtworzenie", "serwer najpierw wykonuje kopię bieżącego stanu i ma automatyczny rollback"]),
        PageBreak(),
    ]
    story += section("Logi i bezpieczeństwo", "Dziennik właściciela łączy zdarzenia aplikacji, ruch, alarmy i stan serwera bez pokazywania sekretów.", "tworca-logi.png", ["filtrować po czasie, rodzaju akcji, koncie, adresie i wyniku", "otworzyć szczegóły pojedynczego zdarzenia", "sprawdzić mapę przybliżonego źródła ruchu", "odróżnić kontrolowany 401/403/429 od awarii 5xx", "zobaczyć próby naruszeń jako alerty najwyższego priorytetu", "eksportować bezpieczny raport dla analizy"], ["geolokalizacja IP jest przybliżona", "logi nie mogą zawierać haseł, tokenów, treści rozmów ani pełnych danych dzieci", "publiczny challenge nie upoważnia do łamania prawa ani uzyskiwania trwałego dostępu"], "Najpierw zabezpiecz dowody i sprawdź audyt. Nie kasuj logów przed wyjaśnieniem zdarzenia.")
    story += [
        Paragraph("Auto-start i watchdogi", S["h1"]),
        Paragraph("Po zaniku prądu system ma sam otworzyć sejf kluczem root-only, uruchomić bazę, aplikację, proxy i tunel.", S["body"]),
        *bullets(["systemd Restart=always dla aplikacji", "osobny restart tunelu Cloudflare", "minutowy healthcheck usług i bazy", "sprzętowy watchdog systemd", "trwały journal poprzedniego uruchomienia", "timery kopii, retencji, testu odtworzenia i kolejki e-mail"]),
        callout("Test po wdrożeniu", "Uruchom audyt startu, kontrolowany reboot i ponownie audyt. Awaryjne odłączenie zasilania testuj wyłącznie na kopii i po bezpiecznym zamknięciu procesów zapisu.", "gold"),
        Paragraph("Planowany restart aplikacji", S["h2"]),
        Paragraph("Otwórz Ustawienia właściciela, odszukaj sekcję Automatyczny restart aplikacji. Wybierz Codziennie lub Co niedzielę, wpisz godzinę i minuty według czasu polskiego. Zaznacz potwierdzenie i kliknij Zapisz harmonogram restartu. Po odświeżeniu sprawdź zapisany wybór. Wyłączony oznacza brak zaplanowanych restartów, a nie wyłączenie watchdogu.", S["body"]),
        Paragraph("Wybierz porę poza lekcjami. Restart dotyczy tylko aplikacji: nie wyłącza PostgreSQL, tunelu ani Raspberry. Niezapisany formularz może wymagać ponowienia. Operacja jest pomijana podczas backupu, importu i aktualizacji, bez kompletnej kopii z ostatnich 48 godzin lub w ciągu 15 minut od poprzedniej próby. Pominięty termin nie jest nadrabiany po włączeniu urządzenia.", S["body"]),
        Paragraph("Kontrola pamięci Linux", S["h2"]),
        Paragraph("Jeżeli widzisz, że systemowa kontrola pamięci nie jest aktywna, sam restart aplikacji nie wystarczy. Operator przygotowuje konfigurację startową i po kopii oraz audycie wykonuje kontrolowany restart całego urządzenia. Potem sprawdza kontroler memory oraz liczbowy pomiar MemoryCurrent. Sam zapis limitu w pliku usługi nie potwierdza jego działania.", S["body"]),
        Paragraph("Gdy sejf nie wstanie", S["h2"]),
        *bullets(["nie formatuj dysku", "sprawdź, czy system widzi właściwy UUID", "użyj hasła LUKS lub recovery LUKS — nie klucza AGE", "po otwarciu uruchom audyt startu", "wykonaj nową kopię i test odtworzenia"]),
        PageBreak(),
        Paragraph("Aktualizacje bez utraty danych", S["h1"]),
        *bullets(["wydanie powstaje z czystego, przetestowanego commita", "pakiet ma podpisany manifest i dokładne sumy", "przed migracją powstaje backup z testem odtworzenia", "migracje są rozszerzające i stosowane przez Prisma", "build powstaje w katalogu .new", "po healthchecku następuje atomowe przełączenie", "błąd uruchamia rollback aplikacji i bazy"]),
        callout("Nigdy z panelu", "Nie wykonuj npm update, apt upgrade ani dowolnych poleceń powłoki z przeglądarki. Panel może pokazać stan wersji i uruchomić wyłącznie podpisaną, wcześniej przygotowaną aktualizację.", "red"),
        Paragraph("Minimalna checklista wydania", S["h2"]),
        *bullets(["npm run check", "npm run build", "telefon 375 × 812 i komputer 1440 × 900", "brak błędów konsoli", "npm audit: 0 znanych podatności produkcyjnych", "npm run package:release i package:raspberry", "backup + realny test restore", "wdrożenie dokładnego commita", "publiczny HTTPS, logowanie i role", "reboot i ponowny status"]),
        PageBreak(),
        Paragraph("Plan awaryjny", S["h1"]),
        Paragraph("Kolejność działań ma znaczenie. Najpierw chroń dane, potem przywracaj usługę.", S["body"]),
        Paragraph("Aplikacja nie odpowiada", S["h2"]),
        *bullets(["sprawdź stan usług", "sprawdź sejf i PostgreSQL", "uruchom kontrolowany restart aplikacji", "sprawdź healthcheck lokalny i publiczny", "otwórz logi bieżącego i poprzedniego bootu"]),
        Paragraph("Podejrzenie włamania", S["h2"]),
        *bullets(["nie usuwaj zdarzeń", "zapisz czas i identyfikator alertu", "zablokuj narażone konto i unieważnij sesje", "zmień naruszone sekrety innym, bezpiecznym kanałem", "sprawdź integralność wydania i bazy", "w razie danych osobowych uruchom procedurę incydentu RODO"]),
        Paragraph("Awaria dysku", S["h2"]),
        *bullets(["nie zapisuj dalej na uszkodzonym nośniku", "przygotuj nowy zaszyfrowany wolumen", "zainstaluj zgodną wersję aplikacji", "wgraj kopię, podaj klucz AGE i wykonaj test", "odtwórz, sprawdź liczby rekordów oraz pliki", "dopiero potem przełącz ruch"]),
        Spacer(1, 5 * mm),
        callout("Stan sprzętu", "Raspberry zgłasza historię problemów z zasilaniem. Przed produkcją wymagane są stabilny zasilacz, chłodzenie i najlepiej UPS. Oprogramowanie nie naprawi spadków napięcia.", "red"),
    ]
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=18 * mm, title="eDziennik KLA — podręcznik właściciela systemu", author="Damian Eron", subject=f"KLA-MANUAL:{RELEASE['version']}:owner")
    doc.build(story, onFirstPage=lambda c, d: footer(c, d, "eDziennik KLA · tylko dla właściciela systemu"), onLaterPages=lambda c, d: footer(c, d, "eDziennik KLA · tylko dla właściciela systemu"))


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    build_role_manual(
        OUTPUT_DIR / "Podrecznik_eDziennika_KLA_dla_dyrektora.pdf",
        "director", "Dyrektor",
        "Pełna obsługa szkoły: konta, kartoteki, zasoby, grafik, lekcje, komunikacja, umowy, płatności, nauka i postępy.",
        "dyrektor-start.png",
        ["każda osoba używa własnego konta", "MFA dyrektora jest obowiązkowe przed użyciem prawdziwych danych", "publikuj grafik i dokumenty dopiero po podglądzie", "każda ważna zmiana pozostaje w historii"],
        director_functions(),
    )
    build_role_manual(
        OUTPUT_DIR / "Podrecznik_eDziennika_KLA_dla_wykladowcy.pdf",
        "teacher", "Wykładowca",
        "Codzienna praca z własnymi grupami: dostępność, plan, lekcja, obecność, wiadomości, materiały, zadania i postępy.",
        "wykladowca-start.png",
        ["widzisz wyłącznie przypisane grupy", "zmiana planu wymaga akceptacji dyrektora", "obecność zapisuj możliwie szybko po lekcji", "nie publikuj danych wrażliwych w wiadomościach"],
        teacher_functions(),
    )
    build_role_manual(
        OUTPUT_DIR / "Podrecznik_eDziennika_KLA_dla_rodzica.pdf",
        "parent", "Rodzic",
        "Wszystko o powiązanych dzieciach: najbliższe zajęcia, plan, wiadomości, umowy, raty, materiały i postępy.",
        "rodzic-start.png",
        ["jedno konto może obsługiwać kilkoro dzieci", "zawsze sprawdź wybrane dziecko", "nie udostępniaj hasła", "przed akceptacją przeczytaj cały pakiet dokumentów"],
        parent_functions(),
    )
    build_role_manual(
        OUTPUT_DIR / "Podrecznik_eDziennika_KLA_dla_ucznia.pdf",
        "student", "Uczeń",
        "Prosta obsługa własnych zajęć, wiadomości, materiałów, zadań, obecności i postępów.",
        "uczen-start.png",
        ["używaj tylko własnego konta", "sprawdzaj najbliższą lekcję przed wyjściem", "po wysłaniu zadania sprawdź status", "konto ucznia nie pokazuje umów ani płatności rodzica"],
        student_functions(),
    )
    build_owner_manual(OUTPUT_DIR / "Instrukcja_eDziennika_KLA_dla_wlasciciela_systemu.pdf")
    print("Wygenerowano pięć podręczników PDF: cztery role szkoły i właściciel systemu.")


if __name__ == "__main__":
    main()
