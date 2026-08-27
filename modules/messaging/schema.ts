import { z } from "zod";

export const messageSchema = z.object({
  groupId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  body: z.string().trim().min(1, "Napisz wiadomość.").max(2000, "Wiadomość może mieć maksymalnie 2000 znaków."),
  requiresAcknowledgement: z.boolean().default(false),
  clientRequestId: z.string().uuid("Odśwież formularz i spróbuj ponownie."),
}).refine((value) => Boolean(value.groupId) !== Boolean(value.conversationId), "Wybierz jedną rozmowę.");

export const directConversationSchema = z.object({
  title: z.string().trim().min(3, "Nadaj rozmowie krótką nazwę.").max(80, "Nazwa może mieć maksymalnie 80 znaków."),
  participantIds: z.array(z.string().uuid()).min(1, "Wybierz co najmniej jednego odbiorcę.").max(20, "Do jednej rozmowy możesz dodać maksymalnie 20 osób."),
});

export const announcementSchema = z.object({
  groupIds: z.array(z.string().uuid()).min(1, "Wybierz co najmniej jedną grupę.").max(30, "Jednocześnie wybierz maksymalnie 30 grup."),
  subject: z.string().trim().min(3, "Temat musi mieć co najmniej 3 znaki.").max(120, "Temat może mieć maksymalnie 120 znaków."),
  body: z.string().trim().min(1, "Napisz treść ogłoszenia.").max(3000, "Ogłoszenie może mieć maksymalnie 3000 znaków."),
  requiresAcknowledgement: z.boolean().default(false),
  clientRequestId: z.string().uuid("Odśwież formularz i spróbuj ponownie."),
});

export const messageReactionEmojis = ["👍", "❤️", "😊", "🎉"] as const;
export const messageReactionSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.enum(messageReactionEmojis),
});

export type MessagingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialMessagingState: MessagingActionState = { status: "idle" };
