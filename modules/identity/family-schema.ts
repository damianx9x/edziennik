import { z } from "zod";

export const childRequestSchema = z.object({
  kind: z.literal("CHILD_ENROLLMENT"),
  name: z.string().trim().min(3, "Wpisz imię i nazwisko dziecka.").max(120),
});
export const childPasswordSchema = z.object({
  childId: z.uuid(),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków.").max(128),
  repeatPassword: z.string(),
}).refine((value) => value.password === value.repeatPassword, {
  message: "Hasła różnią się. Wpisz dwa razy to samo hasło.", path: ["repeatPassword"],
});
export const childLoginDomain = "children.kla.invalid";
export const childGroupRequestSchema = z.object({
  kind: z.literal("CHILD_GROUP"),
  childId: z.uuid(),
  name: z.string().trim().min(3).max(120),
  locationId: z.uuid(),
  groupId: z.uuid(),
});
export const createChildSchema = z.object({
  name: z.string().trim().min(3, "Wpisz imię i nazwisko dziecka.").max(120),
  locationId: z.uuid("Wybierz lokalizację z listy."),
  groupId: z.uuid("Wybierz grupę z listy."),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków. Możesz użyć kilku łatwych do zapamiętania słów.").max(128),
  repeatPassword: z.string(),
}).refine((value) => value.password === value.repeatPassword, {
  message: "Hasła różnią się. Wpisz dwa razy to samo hasło.", path: ["repeatPassword"],
});
export function childLogin(email: string) {
  return email.endsWith(`@${childLoginDomain}`) ? email.split("@")[0] : email;
}
