on run
  set appPath to POSIX path of (path to me)
  set baseDir to do shell script "/usr/bin/dirname " & quoted form of appPath
  set backend to baseDir & "/kla-server-control.sh"
  repeat
    set sections to {"Serwer — codzienna obsługa", "Kopie i odzyskiwanie", "Pierwsze uruchomienie i ustawienia", "Aktualizacja i diagnostyka", "Zamknij panel"}
    set pickedSection to choose from list sections with title "KLA — Raspberry Serwer" with prompt "Co chcesz zrobić?" default items {"Serwer — codzienna obsługa"} OK button name "Dalej" cancel button name "Zamknij"
    if pickedSection is false then return
    set sectionName to item 1 of pickedSection
    if sectionName is "Zamknij panel" then return
    if sectionName is "Serwer — codzienna obsługa" then
      set choices to {"Stan serwera", "Uruchom", "Zatrzymaj", "Restart", "Otwórz publiczne demo", "Otwórz lokalnie przez SSH", "Uruchom ponownie Raspberry", "Bezpiecznie wyłącz Raspberry"}
    else if sectionName is "Kopie i odzyskiwanie" then
      set choices to {"Utwórz, przetestuj i pobierz backup na Maca", "Pobierz ostatni backup na Maca", "Utwórz backup na Raspberry", "Test odtworzenia", "Zapisz klucz kopii age (tylko raz)"}
    else if sectionName is "Pierwsze uruchomienie i ustawienia" then
      set choices to {"Pokaż folder kluczy i kopii", "Skonfiguruj e-mail", "Wygeneruj kod pierwszego uruchomienia", "Kopiuj kod pierwszego uruchomienia", "Włącz automatyczny start po zaniku prądu", "Odblokuj sejf po restarcie", "Ustaw połączenie"}
    else
      set choices to {"Audyt startu po zaniku prądu", "Pokaż logi", "Wgraj aktualizację"}
    end if
    set picked to choose from list choices with title "KLA — " & sectionName with prompt "Wybierz działanie:" default items {item 1 of choices} OK button name "Wykonaj" cancel button name "Wróć"
    if picked is false then
      set actionName to ""
    else
      set actionName to item 1 of picked
    end if
    if actionName is "" then
      -- Powrót do listy działów bez wykonywania polecenia.
    else
    try
      if actionName is "Stan serwera" then
        set resultText to do shell script quoted form of backend & " status"
      else if actionName is "Audyt startu po zaniku prądu" then
        set resultText to do shell script quoted form of backend & " startup-audit"
      else if actionName is "Uruchom" then
        set resultText to do shell script quoted form of backend & " start"
      else if actionName is "Zatrzymaj" then
        set confirmStop to display dialog "Zatrzymać aplikację i publiczny tunel?" buttons {"Anuluj", "Zatrzymaj"} default button "Zatrzymaj" with icon caution
        set resultText to do shell script quoted form of backend & " stop"
      else if actionName is "Restart" then
        set resultText to do shell script quoted form of backend & " restart"
      else if actionName is "Otwórz publiczne demo" then
        set resultText to do shell script quoted form of backend & " public-preview"
      else if actionName is "Otwórz lokalnie przez SSH" then
        set resultText to do shell script quoted form of backend & " local-preview"
      else if actionName is "Utwórz, przetestuj i pobierz backup na Maca" then
        set resultText to do shell script quoted form of backend & " verified-backup-download"
      else if actionName is "Pobierz ostatni backup na Maca" then
        set resultText to do shell script quoted form of backend & " download-backup"
      else if actionName is "Utwórz backup na Raspberry" then
        set resultText to do shell script quoted form of backend & " backup"
      else if actionName is "Test odtworzenia" then
        set resultText to do shell script quoted form of backend & " restore-test"
      else if actionName is "Zapisz klucz kopii age (tylko raz)" then
        display dialog "To klucz do odszyfrowania plików backupu age, a nie hasło partycji LUKS. Serwer pokaże go tylko raz i zapisze na tym Macu. Kontynuować?" buttons {"Anuluj", "Zapisz klucz"} default button "Anuluj" with icon caution
        set resultText to do shell script quoted form of backend & " recovery-key-once"
      else if actionName is "Pokaż logi" then
        set resultText to do shell script quoted form of backend & " logs"
      else if actionName is "Pokaż folder kluczy i kopii" then
        set resultText to do shell script quoted form of backend & " open-storage-folder"
      else if actionName is "Skonfiguruj e-mail" then
        tell application "Terminal"
          activate
          do script quoted form of backend & " email-config"
        end tell
        set resultText to "Dokończ konfigurację w Terminalu. Hasło nie pojawi się na ekranie ani w historii panelu."
      else if actionName is "Wygeneruj kod pierwszego uruchomienia" then
        display dialog "Stary kod przestanie działać. Nowy zostanie zapisany w Pęku kluczy tego Maca." buttons {"Anuluj", "Generuj"} default button "Anuluj" with icon caution
        set resultText to do shell script quoted form of backend & " bootstrap-code"
      else if actionName is "Kopiuj kod pierwszego uruchomienia" then
        set resultText to do shell script quoted form of backend & " copy-bootstrap-code"
      else if actionName is "Wgraj aktualizację" then
        set packageFile to choose file with prompt "Wybierz edziennik-kla-raspberry-source.tar.gz"
        set resultText to do shell script quoted form of backend & " update " & quoted form of POSIX path of packageFile
      else if actionName is "Włącz automatyczny start po zaniku prądu" then
        display dialog "Raspberry będzie uruchamiać zaszyfrowany sejf i aplikację bez pytania o hasło. Chroni to ciągłość pracy, ale urządzenie i karta systemowa przechowywane razem są słabszą ochroną przed fizyczną kradzieżą. Kontynuować?" buttons {"Anuluj", "Włącz auto-start"} default button "Anuluj" with icon caution
        tell application "Terminal"
          activate
          do script quoted form of backend & " auto-unlock-enable"
        end tell
        set resultText to "Dokończ jednorazowe włączenie w Terminalu. Jeżeli system poprosi, wpisz dotychczasowe hasło sejfu; hasło nie zostanie zapisane."
      else if actionName is "Odblokuj sejf po restarcie" then
        tell application "Terminal"
          activate
          do script quoted form of backend & " unlock"
        end tell
        set resultText to "W Terminalu wpisz hasło sejfu. Po zakończeniu wróć do panelu i wybierz Stan serwera."
      else if actionName is "Ustaw połączenie" then
        set hostName to text returned of (display dialog "Nazwa Raspberry w sieci:" default answer "kingslanguageacademy.local")
        set sshPort to text returned of (display dialog "Port SSH:" default answer "22")
        set sshUser to text returned of (display dialog "Użytkownik SSH:" default answer "icex")
        set keyPath to text returned of (display dialog "Ścieżka klucza SSH:" default answer ((POSIX path of (path to home folder)) & ".ssh/kla_raspberry_ed25519"))
        set resultText to do shell script quoted form of backend & " configure " & quoted form of hostName & " " & quoted form of sshPort & " " & quoted form of sshUser & " " & quoted form of keyPath
      else if actionName is "Uruchom ponownie Raspberry" then
        display dialog "Raspberry uruchomi się ponownie. Sejf może wymagać ręcznego odblokowania." buttons {"Anuluj", "Restartuj"} default button "Anuluj" with icon caution
        set resultText to do shell script quoted form of backend & " reboot"
      else if actionName is "Bezpiecznie wyłącz Raspberry" then
        display dialog "Po wyłączeniu trzeba fizycznie uruchomić Raspberry i odblokować sejf." buttons {"Anuluj", "Wyłącz"} default button "Anuluj" with icon stop
        set resultText to do shell script quoted form of backend & " poweroff"
      end if
      if resultText is not "" then display dialog resultText with title "KLA — wynik" buttons {"OK"} default button "OK"
    on error errorMessage number errorNumber
      if errorNumber is not -128 then display dialog errorMessage with title "Nie udało się wykonać działania" buttons {"OK"} default button "OK" with icon stop
    end try
    end if
  end repeat
end run
