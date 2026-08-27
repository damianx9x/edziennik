on run
  set appPath to POSIX path of (path to me)
  set baseDir to do shell script "/usr/bin/dirname " & quoted form of appPath
  set backend to baseDir & "/kla-server-control.sh"
  repeat
    set choices to {"Stan serwera", "Uruchom", "Zatrzymaj", "Restart", "Otwórz publiczne demo", "Otwórz lokalnie przez SSH", "Utwórz backup", "Test odtworzenia", "Zapisz jedyny klucz odzyskiwania", "Pokaż logi", "Skonfiguruj e-mail", "Wygeneruj kod pierwszego uruchomienia", "Kopiuj kod pierwszego uruchomienia", "Wgraj aktualizację", "Włącz automatyczny start po zaniku prądu", "Odblokuj po restarcie", "Ustaw połączenie", "Uruchom ponownie Raspberry", "Bezpiecznie wyłącz Raspberry", "Zamknij panel"}
    set picked to choose from list choices with title "KLA — Raspberry Serwer" with prompt "Wybierz działanie:" default items {"Stan serwera"} OK button name "Wykonaj" cancel button name "Zamknij"
    if picked is false then return
    set actionName to item 1 of picked
    if actionName is "Zamknij panel" then return
    try
      if actionName is "Stan serwera" then
        set resultText to do shell script quoted form of backend & " status"
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
      else if actionName is "Utwórz backup" then
        set resultText to do shell script quoted form of backend & " backup"
      else if actionName is "Test odtworzenia" then
        set resultText to do shell script quoted form of backend & " restore-test"
      else if actionName is "Zapisz jedyny klucz odzyskiwania" then
        display dialog "Klucz zostanie pokazany przez serwer tylko raz i zapisany w pliku na tym Macu. Bez niego pełnego eksportu nie da się odtworzyć. Kontynuować?" buttons {"Anuluj", "Zapisz klucz"} default button "Anuluj" with icon caution
        set resultText to do shell script quoted form of backend & " recovery-key-once"
      else if actionName is "Pokaż logi" then
        set resultText to do shell script quoted form of backend & " logs"
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
        set resultText to do shell script quoted form of backend & " auto-unlock-enable"
      else if actionName is "Odblokuj po restarcie" then
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
  end repeat
end run
