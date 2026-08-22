"use client";

import { FileUp, LoaderCircle, ShieldCheck } from "lucide-react";
import { useActionState } from "react";

import { uploadSignedContractAction } from "../actions";

export function SignedContractForm({ assignmentId }: { assignmentId: string }) {
  const [state, action, pending] = useActionState(uploadSignedContractAction, { status: "idle" as const });
  if (state.status === "success") {
    return <div className="stage4-acceptance-receipt" role="status"><span><ShieldCheck aria-hidden="true" /> {state.message}</span></div>;
  }
  return <form action={action} className="signed-contract-form">
    <input type="hidden" name="assignmentId" value={assignmentId} />
    <label><FileUp aria-hidden="true" /><span><strong>Wgraj podpisaną umowę</strong><small>Kompletny PDF, JPG lub PNG · maks. 10 MB</small></span><input type="file" name="signedDocument" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required /></label>
    <label className="stage4-check"><input type="checkbox" name="confirmation" value="signed" required /><span>Potwierdzam, że dokument jest kompletny i podpisany przez rodzica.</span></label>
    {state.message ? <p className={`stage4-feedback ${state.status}`} role="status">{state.message}</p> : null}
    <button className="stage4-primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <ShieldCheck />} {pending ? "Bezpiecznie zapisuję…" : "Przekaż do sprawdzenia"}</button>
  </form>;
}
