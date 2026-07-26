export type InvitationActionState = {
  status: "idle" | "success" | "error";
  message: string;
  invitationLink?: string;
  emailSent?: boolean;
  invitationKind?: "EMAIL" | "ROLE_QR";
  roleLabel?: string;
  expiresAt?: string;
};

export const initialInvitationActionState: InvitationActionState = {
  status: "idle",
  message: "",
};
