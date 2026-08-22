try {
  const storedTheme = localStorage.getItem("kla-color-theme");
  const theme =
    storedTheme === "dark" || storedTheme === "light"
      ? storedTheme
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
} catch {
  // Brak dostępu do localStorage nie może zatrzymać renderowania strony.
}
