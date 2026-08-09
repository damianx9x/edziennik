import { z } from "zod";

export const messageSchema = z.object({
  groupId: z.string().uuid("Wybierz grupę."),
  body: z.string().trim().min(1, "Napisz wiadomość.").max(2000, "Wiadomość może mieć maksymalnie 2000 znaków."),
  clientRequestId: z.string().uuid("Odśwież formularz i spróbuj ponownie."),
});

export const announcementSchema = z.object({
  groupIds: z.array(z.string().uuid()).min(1, "Wybierz co najmniej jedną grupę.").max(30, "Jednocześnie wybierz maksymalnie 30 grup."),
  subject: z.string().trim().min(3, "Temat musi mieć co najmniej 3 znaki.").max(120, "Temat może mieć maksymalnie 120 znaków."),
  body: z.string().trim().min(1, "Napisz treść ogłoszenia.").max(3000, "Ogłoszenie może mieć maksymalnie 3000 znaków."),
  clientRequestId: z.string().uuid("Odśwież formularz i spróbuj ponownie."),
});

export const directorAccessSchema = z.object({
  conversationId: z.string().uuid("Nieprawidłowa rozmowa."),
  purpose: z.enum(["SAFETY", "COMPLAINT", "LEGAL", "SUPPORT", "OTHER"]),
  reason: z.string().trim().min(10, "Opisz konkretny powód (minimum 10 znaków).").max(300, "Powód może mieć maksymalnie 300 znaków."),
});

export type MessagingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialMessagingState: MessagingActionState = { status: "idle" };

export const purposeLabels = {
  SAFETY: "Bezpieczeństwo dziecka lub grupy",
  COMPLAINT: "Rozpatrzenie zgłoszenia lub skargi",
  LEGAL: "Obowiązek prawny",
  SUPPORT: "Pomoc w rozwiązaniu problemu",
  OTHER: "Inny uzasadniony cel służbowy",
} as const;
