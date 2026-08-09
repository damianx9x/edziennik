"use client";

import { useActionState, useMemo, useRef } from "react";
import Link from "next/link";
import { CheckCheck, ChevronRight, Clock3, GripHorizontal, LockKeyhole, MailWarning, Megaphone, RefreshCw, Send, X } from "lucide-react";

import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";
import { grantDirectorConversationAccessAction, retryEmailQueueAction, sendAnnouncementAction, sendMessageAction } from "../actions";
import { initialMessagingState, purposeLabels } from "../schema";
import { MessageReadTracker } from "./message-read-tracker";

type GroupItem = { id: string; name: string; locationName: string; conversationId: string | null; messageCount: number; lastActivity: string | null };
type MessageItem = { id: string; kind: "CHAT" | "ANNOUNCEMENT"; subject: string | null; body: string; createdAt: string; authorId: string; author: { name: string; role: string }; readByCurrent: boolean; _count: { reads: number }; delivery: { sent: number; pending: number; failed: number } };

function newRequestId() { return crypto.randomUUID(); }
function formatTime(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }

export function MessagingWorkspace({ role, currentUserId, groups, selectedGroupId, canRead, messages, queueStats, errorMessage }: {
  role: "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";
  currentUserId: string; groups: GroupItem[]; selectedGroupId: string | null; canRead: boolean; messages: MessageItem[];
  queueStats: Record<string, number>; errorMessage: string | null; accessId: string | null;
}) {
  const [messageState, messageAction, messagePending] = useActionState(sendMessageAction, initialMessagingState);
  const [announcementState, announcementAction, announcementPending] = useActionState(sendAnnouncementAction, initialMessagingState);
  const messageRequestId = useRef<HTMLInputElement>(null);
  const announcementRequestId = useRef<HTMLInputElement>(null);
  const announcementDialog = useRef<HTMLDialogElement>(null);
  const accessDialog = useRef<HTMLDialogElement>(null);
  const { startDrag: dragAnnouncement, resetDialogPosition: resetAnnouncement } = useMovableDialog(announcementDialog);
  const { startDrag: dragAccess, resetDialogPosition: resetAccess } = useMovableDialog(accessDialog);
  const selected = groups.find((group) => group.id === selectedGroupId) ?? null;
  const unreadIds = useMemo(() => messages.filter((message) => message.authorId !== currentUserId && !message.readByCurrent).map((message) => message.id), [messages, currentUserId]);

  function closeDialog(ref: React.RefObject<HTMLDialogElement | null>, reset: () => void) { ref.current?.close(); reset(); }
  function rotateRequestId(ref: React.RefObject<HTMLInputElement | null>) {
    window.setTimeout(() => { if (ref.current) ref.current.value = newRequestId(); }, 0);
  }

  return (
    <section className="messaging-workspace">
      <MessageReadTracker messageIds={unreadIds} enabled={role !== "DIRECTOR" && canRead} />
      <aside className="messaging-groups" aria-label="Twoje grupy">
        <div className="messaging-groups-heading">
          <div><span className="section-kicker">Grupy</span><h2>{role === "DIRECTOR" ? "Kanały szkoły" : "Twoje rozmowy"}</h2></div>
          {role === "DIRECTOR" ? <button className="messaging-icon-button" type="button" aria-label="Utwórz ogłoszenie" onClick={() => announcementDialog.current?.showModal()}><Megaphone aria-hidden="true" /></button> : null}
        </div>
        <div className="messaging-group-list">
          {groups.map((group) => (
            <Link key={group.id} href={`/panel/wiadomosci?rozmowa=${group.id}`} className={group.id === selectedGroupId ? "active" : undefined}>
              <span className="messaging-group-avatar">{group.name.slice(0, 2).toUpperCase()}</span>
              <span><strong>{group.name}</strong><small>{group.locationName} · {group.messageCount} wiad.</small></span>
              <ChevronRight aria-hidden="true" />
            </Link>
          ))}
        </div>
        {role === "DIRECTOR" ? (
          <div className="messaging-queue-card">
            <span><MailWarning aria-hidden="true" /> Powiadomienia e-mail</span>
            <strong>{queueStats.SENT ?? 0} wysłanych</strong>
            <small>{(queueStats.QUEUED ?? 0) + (queueStats.SENDING ?? 0)} oczekuje · {queueStats.FAILED ?? 0} do ponowienia</small>
            <form action={retryEmailQueueAction}><button type="submit"><RefreshCw aria-hidden="true" /> Ponów kolejkę</button></form>
          </div>
        ) : null}
      </aside>

      <div className="messaging-thread">
        {!selected ? (
          <div className="messaging-thread-empty"><Megaphone aria-hidden="true" /><h2>Wybierz grupę</h2><p>Zobaczysz aktywność kanału bez ujawniania treści.</p></div>
        ) : role === "DIRECTOR" && !canRead ? (
          <div className="messaging-thread-locked">
            <LockKeyhole aria-hidden="true" /><span className="section-kicker">Chroniona treść</span><h2>{selected.name}</h2>
            <p>Dyrektor nie czyta rozmów „na wszelki wypadek”. Otwórz ją tylko dla konkretnego celu służbowego.</p>
            {selected.conversationId ? <button type="button" onClick={() => accessDialog.current?.showModal()}>Podaj cel i otwórz na 15 minut</button> : <small>Rozmowa nie ma jeszcze żadnych wiadomości.</small>}
            {errorMessage ? <p className="messaging-status error" role="alert">{errorMessage}</p> : null}
          </div>
        ) : (
          <>
            <header className="messaging-thread-header"><div><span className="section-kicker">{selected.locationName}</span><h2>{selected.name}</h2></div><span><Clock3 aria-hidden="true" /> Odświeżanie co 15 s</span></header>
            <div className="messaging-message-list" aria-live="polite">
              {messages.length === 0 ? <div className="messaging-thread-empty"><Send aria-hidden="true" /><h3>Zacznij rozmowę</h3><p>Napisz krótką informację dla grupy. Powiadomienia e-mail trafią do kolejki.</p></div> : messages.map((message) => {
                const own = message.authorId === currentUserId;
                return <article key={message.id} className={`messaging-message ${own ? "own" : ""} ${message.kind === "ANNOUNCEMENT" ? "announcement" : ""}`}>
                  <div className="messaging-message-meta"><strong>{message.kind === "ANNOUNCEMENT" ? "Ogłoszenie szkoły" : message.author.name}</strong><time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div>
                  {message.subject ? <h3>{message.subject}</h3> : null}<p>{message.body}</p>
                  {(own || role === "TEACHER" || role === "DIRECTOR") ? <footer><CheckCheck aria-hidden="true" /> {message._count.reads} odczyt. {message.delivery.failed ? `· ${message.delivery.failed} e-mail do ponowienia` : message.delivery.pending ? `· ${message.delivery.pending} e-mail oczekuje` : message.delivery.sent ? `· ${message.delivery.sent} e-mail wysłano` : ""}</footer> : null}
                </article>;
              })}
            </div>
            {role !== "DIRECTOR" ? <form className="messaging-composer" action={messageAction} onSubmit={() => rotateRequestId(messageRequestId)}>
              <input type="hidden" name="groupId" value={selected.id} /><input ref={messageRequestId} type="hidden" name="clientRequestId" defaultValue={newRequestId()} />
              <label htmlFor="message-body">Wiadomość do całej grupy</label><div><textarea id="message-body" name="body" maxLength={2000} rows={2} placeholder="Np. Czy możemy prosić o przypomnienie materiału na czwartek?" required /><button disabled={messagePending} type="submit" aria-label="Wyślij wiadomość"><Send aria-hidden="true" /></button></div>
              {messageState.message ? <p className={`messaging-status ${messageState.status}`} role="status">{messageState.message}</p> : null}
            </form> : null}
          </>
        )}
      </div>

      {role === "DIRECTOR" ? <>
        <dialog className="messaging-dialog" ref={announcementDialog} onClose={resetAnnouncement}>
          <div className="messaging-dialog-handle" onPointerDown={dragAnnouncement}><GripHorizontal aria-hidden="true" /><span>Przeciągnij lub zmień rozmiar okna</span><button type="button" aria-label="Zamknij" onClick={() => closeDialog(announcementDialog, resetAnnouncement)}><X aria-hidden="true" /></button></div>
          <form action={announcementAction} onSubmit={() => rotateRequestId(announcementRequestId)} className="messaging-dialog-body"><span className="section-kicker">Ogłoszenie masowe</span><h2>Jedna wiadomość, wybrane grupy</h2><p>Odbiorcy zobaczą ogłoszenie w swoich rozmowach. E-mail jest dodatkowym powiadomieniem.</p>
            <input ref={announcementRequestId} type="hidden" name="clientRequestId" defaultValue={newRequestId()} />
            <fieldset><legend>Wybierz grupy</legend><div className="messaging-checkboxes">{groups.map((group) => <label key={group.id}><input type="checkbox" name="groupIds" value={group.id} /><span><strong>{group.name}</strong><small>{group.locationName}</small></span></label>)}</div></fieldset>
            <label>Temat<input name="subject" maxLength={120} placeholder="Np. Zmiana godziny zajęć w piątek" required /></label>
            <label>Treść<textarea name="body" rows={5} maxLength={3000} placeholder="Napisz konkretnie, co się zmienia i czy odbiorca musi coś zrobić." required /></label>
            {announcementState.message ? <p className={`messaging-status ${announcementState.status}`} role="status">{announcementState.message}</p> : null}
            <div className="messaging-dialog-actions"><button type="button" onClick={() => closeDialog(announcementDialog, resetAnnouncement)}>Anuluj</button><button type="submit" disabled={announcementPending}><Megaphone aria-hidden="true" /> {announcementPending ? "Wysyłanie…" : "Wyślij ogłoszenie"}</button></div>
          </form>
        </dialog>
        <dialog className="messaging-dialog compact" ref={accessDialog} onClose={resetAccess}>
          <div className="messaging-dialog-handle" onPointerDown={dragAccess}><GripHorizontal aria-hidden="true" /><span>Jawny dostęp służbowy</span><button type="button" aria-label="Zamknij" onClick={() => closeDialog(accessDialog, resetAccess)}><X aria-hidden="true" /></button></div>
          <form action={grantDirectorConversationAccessAction} className="messaging-dialog-body"><LockKeyhole className="messaging-dialog-icon" aria-hidden="true" /><span className="section-kicker">Audytowany dostęp</span><h2>Dlaczego otwierasz tę rozmowę?</h2><p>Cel, czas i Twoje konto zostaną zapisane. Dostęp wygaśnie automatycznie po 15 minutach.</p>
            <input type="hidden" name="conversationId" value={selected?.conversationId ?? ""} />
            <label>Cel<select name="purpose" defaultValue="COMPLAINT">{Object.entries(purposeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Uzasadnienie<textarea name="reason" minLength={10} maxLength={300} rows={4} placeholder="Np. Rodzic zgłosił obraźliwą wiadomość z 8 sierpnia; sprawdzam wyłącznie wskazaną rozmowę." required /></label>
            <div className="messaging-dialog-actions"><button type="button" onClick={() => closeDialog(accessDialog, resetAccess)}>Anuluj</button><button type="submit"><LockKeyhole aria-hidden="true" /> Otwórz na 15 minut</button></div>
          </form>
        </dialog>
      </> : null}
    </section>
  );
}
