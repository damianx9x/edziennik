export type InvitationActionState = {
  status: "idle" | "success" | "error";
  message: string;
  invitationLink?: string;
  emailSent?: boolean;
};

export const initialInvitationActionState: InvitationActionState = {
  status: "idle",
  message: "",
};
