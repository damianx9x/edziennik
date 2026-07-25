/**
 * Nazwy i liczebność grup pochodzą z materiału przekazanego przez właściciela.
 * Dane uczniów są celowo syntetyczne i nigdy nie powinny być odtwarzane ze
 * zrzutów ekranu ani komunikatorów.
 */
export const demoGroups = [
  {
    id: "monaco-8",
    name: "MONACO",
    classLabel: "klasa 8",
    schoolYear: "2025/26",
    studentCount: 3,
    subject: "angielski",
    accent: "red",
  },
  {
    id: "toronto-2d",
    name: "TORONTO",
    classLabel: "klasa 2D",
    schoolYear: "2025/26",
    studentCount: 5,
    subject: "angielski",
    accent: "blue",
  },
  {
    id: "orlando-6",
    name: "ORLANDO",
    classLabel: "klasa 6",
    schoolYear: "2025/26",
    studentCount: 6,
    subject: "angielski",
    accent: "yellow",
  },
  {
    id: "oxford",
    name: "OXFORD",
    classLabel: "grupa szkolna",
    schoolYear: "2025/26",
    studentCount: 4,
    subject: "angielski",
    accent: "navy",
  },
  {
    id: "barcelona-3",
    name: "BARCELONA",
    classLabel: "klasa 3",
    schoolYear: "2025/26",
    studentCount: 4,
    subject: "angielski",
    accent: "red",
  },
  {
    id: "london-sp38",
    name: "LONDON",
    classLabel: "SP 38",
    schoolYear: "2025/26",
    studentCount: 7,
    subject: "angielski",
    accent: "blue",
  },
  {
    id: "venice-1cd",
    name: "VENICE",
    classLabel: "klasa 1 C–D",
    schoolYear: "2025/26",
    studentCount: 4,
    subject: "angielski",
    accent: "yellow",
  },
  {
    id: "miami-4a",
    name: "MIAMI",
    classLabel: "klasa 4A",
    schoolYear: "2025/26",
    studentCount: 2,
    subject: "angielski",
    accent: "navy",
  },
] as const;

export const demoStudentCount = demoGroups.reduce(
  (total, group) => total + group.studentCount,
  0,
);
