import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../lib/server/db";
import { createRecordsCsv } from "../modules/imports/export";
import { loadSchoolExportRows } from "../modules/imports/export-school";

const slug = process.env.KLA_PUBLIC_SCHOOL_SLUG ?? "kings-language-academy-demo";
const school = await db.school.findUnique({ where: { slug }, select: { id: true } });
if (!school) throw new Error(`Nie znaleziono szkoły demo: ${slug}`);

const { rows } = await loadSchoolExportRows(school.id);
const target = path.resolve("outputs/przykladowa-kartoteka-calej-szkoly.csv");
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, createRecordsCsv(rows), "utf8");
console.log(`Zapisano ${rows.length} wierszy: ${target}`);
await db.$disconnect();
