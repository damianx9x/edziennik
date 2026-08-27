import { describe, expect, it } from "vitest";

import { directConversationSchema, messageReactionSchema, messageSchema } from "./schema";

const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("messaging schemas", () => {
  it("accepts exactly one group or direct conversation target", () => {
    expect(messageSchema.safeParse({ groupId: id, body: "Dzień dobry", requiresAcknowledgement: false, clientRequestId: secondId }).success).toBe(true);
    expect(messageSchema.safeParse({ conversationId: id, body: "Dzień dobry", requiresAcknowledgement: false, clientRequestId: secondId }).success).toBe(true);
    expect(messageSchema.safeParse({ groupId: id, conversationId: secondId, body: "Błąd", requiresAcknowledgement: false, clientRequestId: id }).success).toBe(false);
    expect(messageSchema.safeParse({ body: "Błąd", requiresAcknowledgement: false, clientRequestId: id }).success).toBe(false);
  });

  it("requires at least one participant and a useful title", () => {
    expect(directConversationSchema.safeParse({ title: "Organizacja zajęć", participantIds: [id] }).success).toBe(true);
    expect(directConversationSchema.safeParse({ title: "OK", participantIds: [id] }).success).toBe(false);
    expect(directConversationSchema.safeParse({ title: "Organizacja zajęć", participantIds: [] }).success).toBe(false);
  });

  it("accepts only the small, consistent set of message reactions", () => {
    expect(messageReactionSchema.safeParse({ messageId: id, emoji: "👍" }).success).toBe(true);
    expect(messageReactionSchema.safeParse({ messageId: id, emoji: "🔥" }).success).toBe(false);
    expect(messageReactionSchema.safeParse({ messageId: "not-an-id", emoji: "❤️" }).success).toBe(false);
  });
});
