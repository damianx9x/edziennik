#!/usr/bin/env python3
"""Generate illustrated KLA manuals from synthetic QA screenshots."""

from __future__ import annotations

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
SCREEN_DIR = ROOT / "tmp" / "manual-screens"
OUTPUT_DIR = ROOT / "output" / "pdf"
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


def cover(title: str, subtitle: str, audience: str, image_name: str | None = None):
    story = [
        Spacer(1, 18 * mm),
        Paragraph("eDZIENNIK KLA · INSTRUKCJA", S["cover_kicker"]),
        Paragraph(title, S["cover_title"]),
        Paragraph(subtitle, S["cover_subtitle"]),
        callout("Dla kogo jest ten poradnik?", audience, "green"),
        Spacer(1, 12 * mm),
    ]
    if image_name:
        story += [screenshot(image_name, 164 * mm, 86 * mm), Spacer(1, 10 * mm)]
    story += [
        Paragraph("Wersja 1.1 · 31 sierpnia 2026", S["small"]),
        Paragraph("Zrzuty pokazują wyłącznie bezpieczne dane demonstracyjne.", S["small"]),
        PageBreak(),
    ]
    return story


def section(title: str, intro: str, screenshot_name: str | None, actions: list[str], limits: list[str] | None = None, tip: str | None = None, mobile: bool = False):
    story = [Paragraph(title, S["h1"]), Paragraph(intro, S["body"])]
    if screenshot_name:
        story += [Spacer(1, 3 * mm), screenshot(screenshot_name, 174 * mm if not mobile else 72 * mm, 95 * mm if not mobile else 115 * mm), Spacer(1, 4 * mm)]
    story += [Paragraph("Co możesz tutaj zrobić", S["h2"]), *bullets(actions)]
    if limits:
        story += [Paragraph("Ważne ograniczenia", S["h2"]), *bullets(limits)]
    if tip:
        story += [Spacer(1, 3 * mm), callout("Najprostsza zasada", tip, "gold")]
    story.append(PageBreak())
    return story


def build_client_manual(path: Path):
    story = cover(
        "eDziennik bez stresu",
        "Pełna instrukcja dla dyrektora, wykładowcy, rodzica i ucznia — krok po kroku, zwykłym językiem.",
        "Dla osób, które chcą po prostu wykonać swoją pracę. Nie trzeba znać informatyki ani działania serwera.",
        "dyrektor-start.png",
    )
    story += [
        Paragraph("Jak korzystać z tej instrukcji", S["h1"]),
        Paragraph("Znajdź swoją rolę i interesującą funkcję. Każdy rozdział mówi: co zobaczysz, co możesz zrobić i czego system celowo Ci nie pozwoli zrobić.", S["body"]),
        callout("Na początek", "Zaloguj się swoim adresem lub loginem. Nie używaj konta innej osoby. Przy pierwszym wejściu wykonaj krótki samouczek i — jeśli system o to poprosi — skonfiguruj MFA.", "blue"),
        Paragraph("Spis funkcji", S["h2"]),
        *[Paragraph(item, S["toc"]) for item in [
            "1. Role i bezpieczeństwo", "2. Start dyrektora", "3. Kartoteki i przypisania", "4. Grafik i obecność", "5. Umowy", "6. Płatności i raty", "7. Wiadomości", "8. Powiadomienia", "9. Materiały i zadania", "10. Postępy", "11. Panel wykładowcy", "12. Panel rodzica", "13. Panel ucznia", "14. Zgłoszenie problemu i ograniczenia pilota",
        ]],
        PageBreak(),
        Paragraph("Role i bezpieczeństwo", S["h1"]),
        Paragraph("System sam dopasowuje widok do konta. Ukrycie funkcji jest dodatkowo sprawdzane na serwerze.", S["body"]),
    ]
    role_rows = [
        [Paragraph("Rola", S["body"]), Paragraph("Widoczność i odpowiedzialność", S["body"])],
        [Paragraph("Dyrektor", S["body"]), Paragraph("Zarządza szkołą, planem, kartotekami, umowami, płatnościami i zaproszeniami. Zatwierdza zmiany innych osób.", S["body"])],
        [Paragraph("Wykładowca", S["body"]), Paragraph("Widok własnych grup, lekcji, obecności, materiałów i postępów. Zmiana grafiku wymaga akceptacji dyrektora.", S["body"])],
        [Paragraph("Rodzic", S["body"]), Paragraph("Tylko powiązane dzieci: plan, umowy, płatności, wiadomości, materiały i postępy.", S["body"])],
        [Paragraph("Uczeń", S["body"]), Paragraph("Własny plan, materiały, zadania, wiadomości, obecność i postępy. Bez danych finansowych i umów rodzica.", S["body"])],
    ]
    table = Table(role_rows, colWidths=[34 * mm, 140 * mm], repeatRows=1)
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
    story += [table, Spacer(1, 5 * mm), callout("Pamiętaj", "Dyrektor ma jawny służbowy wgląd w komunikator. Otwarcie cudzej rozmowy jest zapisywane w historii bezpieczeństwa. W wiadomościach nie wpisuj haseł ani danych medycznych.", "red"), PageBreak()]
    story += section("Start dyrektora", "To centrum najważniejszych spraw szkoły. Najpierw zwróć uwagę na elementy oznaczone jako wymagające decyzji.", "dyrektor-start.png", ["otworzyć powiadomienia i sprawy wymagające reakcji", "sprawdzić najbliższe lekcje i stan grafiku", "przejść do kartotek, umów, płatności, materiałów i statystyk", "ponownie uruchomić samouczek z górnego paska"], ["centrum pokazuje skrót; szczegóły są po kliknięciu w kartę", "funkcje serwera i klucze nie są częścią panelu dyrektora"], "Najpierw powiadomienia, potem grafik, na końcu sprawy administracyjne.")
    story += section("Kartoteki i przypisania", "Kartoteki są źródłem prawdy o osobach, grupach, salach i lokalizacjach.", "kartoteki.png", ["wyszukać osobę lub zasób", "otworzyć kartę i edytować dozwolone pola", "przypisać rodzicowi jedno lub kilka dzieci", "przypisać ucznia i wykładowcę do grupy", "ustawić sale, lokalizacje i dostępność", "sprawdzić historię zmian w oknie szczegółów", "importować albo eksportować dane według instrukcji CSV"], ["nie usuwaj osoby tylko dlatego, że kończy kurs — użyj archiwizacji", "zmiana powiązań wpływa na widoczność planu, wiadomości i dokumentów", "dyrektor nie może resetować konta właściciela systemu"], "Najpierw dodaj lokalizacje i sale, potem ludzi, a na końcu grupy i przypisania.")
    story += section("Grafik i obecność", "Grafik łączy grupę, salę, lokalizację i wykładowcę. Na telefonie pokazuje dzień, na komputerze tydzień.", "grafik.png", ["filtrować według lokalizacji, grupy, sali lub wykładowcy", "dodać i przeciągnąć lekcję ręcznie", "uruchomić generator i obejrzeć propozycję przed publikacją", "zaakceptować poprawne propozycje i poprawić braki", "otworzyć lekcję, uzupełnić temat i obecność", "odwołać zajęcia z powodem; odbiorcy dostają wiadomość", "pokazać lub ukryć odwołane zajęcia"], ["publikacja należy do dyrektora", "system blokuje kolizję sali, wykładowcy i grupy", "propozycja automatu nie jest planem, dopóki dyrektor jej nie zatwierdzi", "wykładowca zgłasza zmianę; dyrektor ją przyjmuje lub odrzuca"], "Jeśli automat pokazuje braki, popraw dostępność lub zasoby wskazanej grupy i uruchom podgląd ponownie.")
    story += section("Umowy", "Dyrektor wysyła rodzicowi dokładną wersję PDF oraz powiązane dokumenty: kosztorys i harmonogram.", "umowy.png", ["wybrać rodzica i ucznia", "dodać właściwy PDF oraz pakiet dokumentów", "ustawić sposób zawarcia: akceptacja elektroniczna albo pobranie, podpis i wgranie skanu", "wysłać przypomnienie bez szukania osobnej rozmowy", "sprawdzić wyświetlenie, decyzję, podpis i historię wersji", "zmienić status administracyjny zgodnie z rzeczywistym stanem"], ["wysłanego dokumentu nie edytuje się — korekta tworzy nową wersję", "zwykła akceptacja w systemie nie jest kwalifikowanym podpisem elektronicznym", "ostateczne wzory, RODO i informacje konsumenckie muszą być zatwierdzone dla działalności szkoły przez prawnika"], "Rodzic przed decyzją widzi dokładną wersję dokumentu oraz jasny skutek: zawarcie odpłatnej umowy lub obowiązek wgrania podpisanego egzemplarza.")
    story += section("Płatności i raty", "Kwoty wynikają z przypisanego kosztorysu. Szkoła ręcznie oznacza stan poszczególnych rat.", "platnosci.png", ["filtrować należności według osoby, umowy i statusu", "otworzyć szczegóły i zobaczyć wszystkie raty", "oznaczyć ratę jako opłaconą, zaległą lub oczekującą", "zapisać bezpieczną notatkę i historię zmiany", "przejść z płatności do umowy oraz kartoteki"], ["system nie pobiera pieniędzy i nie łączy automatycznie przelewów", "nie wpisuj numerów rachunków ani pełnej treści przelewu w notatce", "rodzic widzi tylko własne rozliczenia"], "Zmieniaj status dopiero po sprawdzeniu wpłaty w księgowości lub banku.")
    story += section("Wiadomości", "Rozmowa na telefonie zajmuje cały ekran. Lista rozmów i otwarty kanał są osobnymi widokami.", "output/qa/stage-7/mobile-messaging.png", ["wybrać grupę albo prywatną rozmowę", "wysłać tekst, sam załącznik lub oba elementy", "dodać emoji i reakcję", "poprosić o świadome potwierdzenie przeczytania", "utworzyć rozmowę z pojedynczymi osobami lub całą grupą", "wysłać ogłoszenie do kilku grup"], ["uczestników rozmowy ustala dyrektor", "e-mail jest dodatkiem; właściwa historia pozostaje w aplikacji", "system przechowuje ostatnie 100 wiadomości w widoku, a starsza historia pozostaje w bazie", "załącznik może mieć maksymalnie 8 MB i dozwolony format"], "Przycisk „Rozmowy” wraca do listy. W kanale przewija się tylko historia, a pole pisania pozostaje zawsze na dole.", True)
    story += section("Powiadomienia", "To skrzynka spraw wymagających uwagi: terminy, umowy, płatności, lekcje i wiadomości.", "powiadomienia.png", ["filtrować według źródła", "zaznaczyć wybrane pozycje", "oznaczyć wybrane albo wszystkie jako przeczytane", "odłożyć przypomnienie do jutra", "kliknąć pozycję i przejść do właściwej sprawy"], ["powiadomienie nie zastępuje właściwego dokumentu lub rozmowy", "uczeń nie dostaje powiadomień o podpisie umowy ani płatnościach rodzica"], "Po akcji pojawia się wyraźne potwierdzenie — nie trzeba klikać drugi raz.")
    story += section("Materiały i zadania", "Wykładowca dodaje plik albo bezpieczny link i wybiera odbiorców. Uczeń i rodzic widzą tylko przypisane treści.", "nauka.png", ["dodać PDF, JPG, PNG albo link", "przypisać materiał do grup, uczniów lub wykładowców", "utworzyć zadanie z terminem", "oddać zadanie z odpowiedzią lub załącznikiem", "sprawdzić pracę i przekazać informację zwrotną"], ["lista pokazuje kilka podpowiedzi; pozostałe osoby znajdziesz wyszukiwarką", "nie publikuj danych wrażliwych ani niepotrzebnych danych dziecka", "duży lub niedozwolony plik zostanie odrzucony z instrukcją"], "Po poprawnym wysłaniu okno zamyka się, a nowa pozycja pojawia się na liście.")
    story += section("Postępy", "Postępy są opisową pomocą w nauce, a nie automatyczną diagnozą dziecka.", "postepy.png", ["zapisać obserwacje umiejętności językowych", "dodać mocną stronę i kolejny mały krok", "oglądać wykres zmian, obecność i historię lekcji", "filtrować uczniów zgodnie z rolą"], ["wykres przewiduje trend wyłącznie na podstawie dostępnych danych", "wynik nie jest oceną medyczną, psychologiczną ani gwarancją", "uczeń i rodzic widzą tylko własne lub powiązane dane"], "Opisuj konkretne zachowanie na lekcji, nie cechę osoby.")
    story += section("Panel wykładowcy", "Wykładowca ma szybki dostęp do najbliższej lekcji, własnych grup, dostępności i komunikacji.", "wykladowca-start.png", ["sprawdzić najbliższe zajęcia", "ustawić różne godziny dostępności dla poszczególnych dni i lokalizacji", "uzupełnić temat, obecność i materiały", "zgłosić zmianę grafiku do akceptacji", "napisać do przypisanej grupy"], ["nie widzi cudzych grup", "nie publikuje samodzielnie zmiany planu", "lokalizacje i czas przejazdu muszą być realne; system blokuje niemożliwe nakładanie"], "Najpierw ustaw tygodniową dostępność, potem sprawdź plan i każdą lekcję uzupełnij z jej okna.", True)
    story += section("Panel rodzica", "Rodzic widzi jedno spokojne podsumowanie swoich dzieci.", "rodzic-start.png", ["sprawdzić najbliższe zajęcia", "otworzyć plan, wiadomości, materiały i postępy", "przeczytać i zaakceptować umowę albo wgrać podpisany skan", "sprawdzić raty i ich status"], ["widzi wyłącznie powiązane dzieci", "nie edytuje planu ani statusu płatności", "nie dodaje samodzielnie dziecka — robi to dyrektor"], "Jeśli brakuje dziecka lub grupy, napisz do szkoły; nie zakładaj drugiego konta.", True)
    story += section("Panel ucznia", "Uczeń widzi własne codzienne sprawy bez danych finansowych rodzica.", "uczen-start.png", ["sprawdzić najbliższą lekcję i cały plan", "odczytać wiadomości grupy", "pobrać materiały i oddać zadanie", "zaznaczyć wymagane potwierdzenie lub obecność zgodnie z zasadami szkoły", "obejrzeć własne postępy"], ["nie widzi umów, płatności i rozmów rodzica", "nie zmienia grafiku ani ocen innych osób", "samodzielne zgłoszenie obecności nie zastępuje zatwierdzenia wykładowcy"], "Na start sprawdź lekcję, potem zadania i powiadomienia.", True)
    story += [
        Paragraph("Gdy coś nie działa", S["h1"]),
        Paragraph("Każdy ekran ma przycisk „Zgłoś problem”. Najpierw przejdź do miejsca, w którym wystąpił błąd, dopiero potem uruchom zgłoszenie i świadomie wykonaj zrzut.", S["body"]),
        *bullets(["napisz, co kliknięto i czego oczekiwano", "nie wpisuj hasła, kodu MFA ani klucza kopii", "sprawdź Internet i spróbuj raz ponownie", "w nagłej sprawie skontaktuj się ze szkołą innym kanałem"]),
        Spacer(1, 4 * mm),
        callout("Ograniczenia pilota", "Brak płatności online, automatycznej księgowości, kwalifikowanego podpisu i pełnej bramki SMS. Produkcyjne użycie prawdziwych danych wymaga zamknięcia checklisty bezpieczeństwa, regulaminów i zatwierdzenia wzorów prawnych.", "red"),
        Spacer(1, 8 * mm),
        Paragraph("Krótka lista odbioru", S["h2"]),
        *bullets(["sprawdź swoją rolę na telefonie i komputerze", "otwórz najbliższą lekcję", "wyślij testową wiadomość i załącznik", "sprawdź umowę i płatność na koncie rodzica", "dodaj materiał na koncie wykładowcy", "zgłoś każdą niejasność przed użyciem prawdziwych danych"]),
    ]

    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=18 * mm, title="eDziennik KLA — instrukcja dla szkoły", author="Damian Eron")
    doc.build(story, onFirstPage=lambda c, d: footer(c, d, "eDziennik KLA · instrukcja dla szkoły"), onLaterPages=lambda c, d: footer(c, d, "eDziennik KLA · instrukcja dla szkoły"))


def build_owner_manual(path: Path):
    story = cover(
        "Podręcznik właściciela systemu",
        "Pierwsze uruchomienie, serwer Raspberry Pi, szyfrowanie, kopie, odtwarzanie, aktualizacje i diagnostyka.",
        "Wyłącznie dla właściciela technicznego. Tego pliku nie przekazuj zwykłym użytkownikom szkoły.",
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
    story += section("Serwer i integracje", "Ustawienia techniczne są pogrupowane według celu: poczta, backup, eksport/import, tryb publiczny i kontrolowane operacje.", "tworca-ustawienia.png", ["zapisać SMTP dopiero po prawdziwym teście wysyłki", "wybrać wykryty, zamontowany dysk USB", "ustawić harmonogram i retencję", "skonfigurować SFTP z weryfikacją odcisku", "pobrać pełny zaszyfrowany eksport", "wgrać kopię i zweryfikować kluczem", "przełączyć stronę szkoły i prezentację produktu"], ["aplikacja działa z NoNewPrivileges i nie wykonuje sudo", "operacje systemowe przechodzą przez zamknięty broker z listą dozwolonych akcji", "SSH pozostaje prywatnym kanałem operatora, nie terminalem w przeglądarce"], "Jeżeli formularz zwróci błąd, nie obchodź go ręcznym chmod lub szerokim sudo — sprawdź usługę kla-web-control.")
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
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=17 * mm, bottomMargin=18 * mm, title="eDziennik KLA — podręcznik właściciela systemu", author="Damian Eron")
    doc.build(story, onFirstPage=lambda c, d: footer(c, d, "eDziennik KLA · tylko dla właściciela systemu"), onLaterPages=lambda c, d: footer(c, d, "eDziennik KLA · tylko dla właściciela systemu"))


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    build_client_manual(OUTPUT_DIR / "Instrukcja_eDziennika_KLA_dla_szkoly.pdf")
    build_owner_manual(OUTPUT_DIR / "Instrukcja_eDziennika_KLA_dla_wlasciciela_systemu.pdf")
    print("Wygenerowano dwa podręczniki PDF.")


if __name__ == "__main__":
    main()
