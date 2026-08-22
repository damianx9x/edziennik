export type BackupDestinationKind = "LOCAL_FOLDER" | "MOUNTED_STORAGE" | "SFTP";

export const backupDestinationOptions = [
  {
    kind: "LOCAL_FOLDER" as const,
    label: "Folder na serwerze",
    description: "Szybka kopia robocza, ale pozostaje na tym samym urządzeniu.",
  },
  {
    kind: "MOUNTED_STORAGE" as const,
    label: "Dysk lub NAS",
    description: "Osobny dysk albo zasób sieciowy widoczny jako folder.",
  },
  {
    kind: "SFTP" as const,
    label: "Zewnętrzny serwer SFTP",
    description: "Szyfrowany transfer poza serwer aplikacji — wariant zalecany.",
  },
] as const;

export function backupRequirements(kind: BackupDestinationKind) {
  if (kind === "SFTP") {
    return [
      "adres serwera, port i nazwa użytkownika SFTP",
      "docelowy folder oraz odcisk klucza serwera",
      "osobne hasło albo klucz SSH przekazany poza e-mailem i czatem",
      "potwierdzenie dostępnego miejsca i polityki retencji",
    ];
  }

  if (kind === "MOUNTED_STORAGE") {
    return [
      "podłączony dysk lub NAS dostępny po restarcie serwera",
      "pełna ścieżka do wybranego folderu",
      "uprawnienie aplikacji do zapisu i odczytu",
      "potwierdzenie dostępnego miejsca i polityki retencji",
    ];
  }

  return [
    "pełna ścieżka do prywatnego folderu poza katalogiem publicznym",
    "uprawnienie aplikacji do zapisu i odczytu",
    "potwierdzenie dostępnego miejsca i polityki retencji",
    "drugie miejsce przechowywania na wypadek awarii urządzenia",
  ];
}
