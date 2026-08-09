#!/usr/bin/env bash

set -u

project_dir="$(cd "$(dirname "$0")" && pwd)"
desktop_dir="$HOME/Desktop"

clear
echo "King’s Language Academy — skróty obsługi demo"
echo

mkdir -p "$desktop_dir"

install_shortcut() {
  local source_name="$1"
  local shortcut_name="$2"
  local target="$desktop_dir/$shortcut_name"

  if [[ -e "$target" && ! -L "$target" ]]; then
    echo "Pomijam: $shortcut_name — na Biurku jest już zwykły plik o tej nazwie."
    return
  fi

  if [[ -L "$target" ]]; then
    rm -- "$target"
  fi
  ln -s "$project_dir/$source_name" "$target"
  echo "Gotowe: $shortcut_name"
}

install_shortcut "URUCHOM_DEMO.command" "KLA — START DEMO.command"
install_shortcut "ZATRZYMAJ_DEMO.command" "KLA — STOP DEMO.command"
install_shortcut "STATUS_DEMO.command" "KLA — STATUS DEMO.command"

echo
echo "Na Biurku są teraz trzy skróty. Możesz je także przeciągnąć do Docka."
read -r -n 1 -p "Naciśnij dowolny klawisz, aby zamknąć to okno…"
echo
