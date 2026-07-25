# Etap 1 — instrukcja sprawdzenia

## Co jest gotowe

- logowanie wyłącznie dla kont utworzonych przez szkołę,
- role: dyrektor, wykładowca, rodzic i uczeń,
- osobny, chroniony panel każdej roli,
- jednorazowe zaproszenia ważne 7 dni,
- reset hasła i przygotowana wysyłka e-mail przez Resend,
- obowiązkowe TOTP 2FA dyrektora z kodami awaryjnymi,
- limity prób logowania i resetu,
- audyt zaproszeń bez zapisywania tokenu lub pełnego e-maila w logu,
- automatyczne rozpoznanie roli w formularzu zgłoszenia błędu.

Etap 1 nie zawiera jeszcze kartotek, prawdziwego grafiku, umów, płatności,
wiadomości ani zadań. Ich kafle wyjaśniają, w którym etapie zostaną uruchomione.

## Uruchomienie na tym Macu

1. Upewnij się, że lokalna baza Prisma Dev działa.
2. W katalogu projektu uruchom:

```bash
npm run db:migrate:deploy
npm run db:seed:demo
npm run dev
```

3. Otwórz `http://localhost:3000/panel`.
4. Wybierz rolę i użyj odpowiedniego testowego e-maila:

| Rola | E-mail testowy |
|---|---|
| Dyrektor | `dyrektor.demo@invalid.example` |
| Wykładowca | `wykladowca.demo@invalid.example` |
| Rodzic | `rodzic.demo@invalid.example` |
| Uczeń | `uczen.panel.demo@invalid.example` |

Wszystkie konta używają lokalnego hasła z `KLA_DEMO_PASSWORD` w `.env`.
Nie wklejaj tego hasła do dokumentów, commita ani rozmowy z klientką.

## Test dyrektora

1. Zaloguj się jako dyrektor.
2. System musi od razu otworzyć konfigurację 2FA.
3. Zeskanuj QR aplikacją Hasła na iPhonie, Google Authenticator albo Microsoft
   Authenticator.
4. Wpisz kod 6-cyfrowy.
5. Zapisz kody awaryjne i potwierdź checkbox.
6. Wyloguj się i zaloguj ponownie — system musi poprosić o kod.

Reset bazy testowej usuwa tę konfigurację i tworzy czyste konto demo.

## Test ról

- rodzic otwiera `/panel/szkola` → widzi bezpieczną odmowę,
- uczeń otwiera `/panel/szkola` → widzi bezpieczną odmowę,
- wykładowca widzi wyłącznie panel wykładowcy,
- dyrektor otwiera „Zaproszenia”, tworzy testowy link i może go cofnąć,
- błędne hasło pokazuje prosty komunikat bez ujawniania, czy e-mail istnieje,
- każda rola otwiera czerwoną ikonę błędu i ma automatycznie ustawioną rolę.

## Dwie paczki

- `outputs/kla-szkielet-etap-0-5-home-pl.zip` — statyczny pokaz do
  `/kla-preview` przez FTP; nie ma działającego logowania,
- `outputs/edziennik-kla-stage-2.zip` — bieżąca pełna aplikacja; wymaga
  hostingu Node.js i PostgreSQL.

Nie wgrywaj paczki Node.js do zwykłego WebFTP home.pl. Po lokalnej akceptacji
aktualizujemy na FTP wyłącznie statyczny pokaz. Pełny Etap 1 wdrażamy na
stagingu zgodnie z `DEPLOYMENT_MYDEVIL.md`.
