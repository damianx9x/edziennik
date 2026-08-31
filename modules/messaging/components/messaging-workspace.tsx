"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCheck, ChevronRight, Clock3, Download, GripHorizontal, MailWarning, Megaphone, MessageSquarePlus, Paperclip, Plus, RefreshCw, Search, Send, ShieldCheck, Users, X } from "lucide-react";

import { useMovableDialog } from "@/modules/records/components/use-movable-dialog";
import { acknowledgeMessageAction, createDirectConversationAction, retryEmailQueueAction, sendAnnouncementAction, sendMessageAction, toggleMessageReactionAction } from "../actions";
import { initialMessagingState, messageReactionEmojis } from "../schema";
import { MessageReadTracker } from "./message-read-tracker";

type ChannelItem = { key: string; kind: "GROUP" | "DIRECT"; groupId: string | null; name: string; locationName: string; conversationId: string | null; messageCount: number; lastActivity: string | null; teacherCount: number; studentCount: number; participants: { id: string; name: string; role: string }[] };
type RecipientItem = { id: string; name: string; role: string; email: string; groupIds: string[] };
type MessageItem = { id: string; kind: "CHAT" | "ANNOUNCEMENT"; subject: string | null; body: string; createdAt: string; authorId: string; author: { name: string; role: string }; readByCurrent: boolean; requiresAcknowledgement: boolean; acknowledgedByCurrent: boolean; attachments: { id: string; storedFile: { originalName: string; sizeBytes: number; mimeType: string } }[]; reactionSummary: { emoji: string; count: number; reacted: boolean }[]; _count: { reads: number; acknowledgements: number }; delivery: { sent: number; pending: number; failed: number } };

function newRequestId() { return crypto.randomUUID(); }
function formatTime(value: string) { return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatChannelTime(value: string | null) { return value ? new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Nowa rozmowa"; }

export function MessagingWorkspace({ role, currentUserId, channels, selectedKey, canRead, messages, queueStats, errorMessage, recipientDirectory }: {
  role: "DIRECTOR" | "TEACHER" | "PARENT" | "STUDENT";
  currentUserId: string; channels: ChannelItem[]; selectedKey: string | null; canRead: boolean; messages: MessageItem[];
  queueStats: Record<string, number>; errorMessage: string | null; recipientDirectory: RecipientItem[];
}) {
  const [messageState, messageAction, messagePending] = useActionState(sendMessageAction, initialMessagingState);
  const [announcementState, announcementAction, announcementPending] = useActionState(sendAnnouncementAction, initialMessagingState);
  const [query, setQuery] = useState("");
  const [channelKind, setChannelKind] = useState<"ALL" | "GROUP" | "DIRECT">("ALL");
  const [location, setLocation] = useState("ALL");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientRole, setRecipientRole] = useState("ALL");
  const [recipientGroup, setRecipientGroup] = useState("ALL");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const messageFormRef = useRef<HTMLFormElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  const attachmentDetailsRef = useRef<HTMLDetailsElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageRequestId = useRef<HTMLInputElement>(null);
  const announcementRequestId = useRef<HTMLInputElement>(null);
  const announcementDialog = useRef<HTMLDialogElement>(null);
  const directDialog = useRef<HTMLDialogElement>(null);
  const { startDrag: dragAnnouncement, resetDialogPosition: resetAnnouncement } = useMovableDialog(announcementDialog);
  const { startDrag: dragDirect, resetDialogPosition: resetDirect } = useMovableDialog(directDialog);
  const selected = channels.find((channel) => channel.key === selectedKey) ?? null;
  const groups = channels.filter((channel) => channel.kind === "GROUP");
  const locations = useMemo(() => [...new Set(groups.map((group) => group.locationName))].sort((a, b) => a.localeCompare(b, "pl")), [groups]);
  const visibleChannels = useMemo(() => channels.filter((channel) => (channelKind === "ALL" || channel.kind === channelKind) && (channel.kind === "DIRECT" || location === "ALL" || channel.locationName === location) && `${channel.name} ${channel.locationName} ${channel.participants.map((item) => item.name).join(" ")}`.toLocaleLowerCase("pl").includes(query.trim().toLocaleLowerCase("pl"))), [channelKind, channels, location, query]);
  const unreadIds = useMemo(() => messages.filter((message) => message.authorId !== currentUserId && !message.readByCurrent).map((message) => message.id), [messages, currentUserId]);
  const visibleRecipients = useMemo(() => {
    const needle = recipientQuery.trim().toLocaleLowerCase("pl");
    const filtered = recipientDirectory.filter((person) => (recipientRole === "ALL" || person.role === recipientRole) && (recipientGroup === "ALL" || person.groupIds.includes(recipientGroup)) && (!needle || `${person.name} ${person.email}`.toLocaleLowerCase("pl").includes(needle)));
    return filtered.sort((left, right) => Number(selectedRecipients.includes(right.id)) - Number(selectedRecipients.includes(left.id)) || left.name.localeCompare(right.name, "pl")).slice(0, needle || recipientGroup !== "ALL" ? 30 : 8);
  }, [recipientDirectory, recipientGroup, recipientQuery, recipientRole, selectedRecipients]);

  function closeDialog(ref: React.RefObject<HTMLDialogElement | null>, reset: () => void) { ref.current?.close(); reset(); }
  function rotateRequestId(ref: React.RefObject<HTMLInputElement | null>) {
    window.setTimeout(() => { if (ref.current) ref.current.value = newRequestId(); }, 0);
  }
  function addEmoji(emoji: string) {
    const field = draftRef.current;
    if (!field) return;
    field.value = `${field.value}${field.value && !field.value.endsWith(" ") ? " " : ""}${emoji}`;
    field.focus();
  }

  useEffect(() => {
    if (messageState.status !== "success") return;
    messageFormRef.current?.reset();
    if (messageRequestId.current) messageRequestId.current.value = newRequestId();
    if (attachmentDetailsRef.current) attachmentDetailsRef.current.open = false;
    const timer = window.setTimeout(() => {
      setSelectedAttachment(null);
      setAttachmentError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [messageState]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!selected || !messageList) return;
    messageList.scrollTop = messageList.scrollHeight;
  }, [messages.length, selected]);

  function selectAttachment(file: File | undefined) {
    setAttachmentError(null);
    if (!file) { setSelectedAttachment(null); return; }
    if (file.size > 8 * 1024 * 1024) {
      if (attachmentRef.current) attachmentRef.current.value = "";
      setSelectedAttachment(null);
      setAttachmentError("Załącznik może mieć maksymalnie 8 MB.");
      return;
    }
    setSelectedAttachment(file.name);
    if (attachmentDetailsRef.current) attachmentDetailsRef.current.open = false;
  }

  return (
    <section className={`messaging-workspace${selected ? " has-selection" : ""}`}>
      <MessageReadTracker messageIds={unreadIds} enabled={role !== "DIRECTOR" && canRead} />
      <aside className="messaging-groups" aria-label="Twoje grupy">
        <div className="messaging-groups-heading">
          <div><span className="section-kicker">Rozmowy</span><h2>{role === "DIRECTOR" ? "Skrzynka szkoły" : "Twoje wiadomości"}</h2></div>
          {role === "DIRECTOR" ? <div className="messaging-heading-actions"><button className="messaging-icon-button" type="button" onClick={() => directDialog.current?.showModal()}><MessageSquarePlus aria-hidden="true" /><span>Nowa</span></button><button className="messaging-icon-button" type="button" onClick={() => announcementDialog.current?.showModal()}><Megaphone aria-hidden="true" /><span>Ogłoszenie</span></button></div> : null}
        </div>
        <div className="messaging-group-tools"><label><Search aria-hidden="true" /><span className="sr-only">Szukaj rozmowy</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj osoby lub grupy" /></label><div className="messaging-kind-filter" aria-label="Rodzaj rozmowy">{(["ALL", "GROUP", "DIRECT"] as const).map((kind) => <button key={kind} type="button" className={channelKind === kind ? "active" : undefined} onClick={() => setChannelKind(kind)}>{kind === "ALL" ? "Wszystkie" : kind === "GROUP" ? "Grupy" : "Prywatne"}</button>)}</div>{channelKind !== "DIRECT" ? <select aria-label="Filtruj według lokalizacji" value={location} onChange={(event) => setLocation(event.target.value)}><option value="ALL">Wszystkie lokalizacje</option>{locations.map((item) => <option key={item}>{item}</option>)}</select> : null}</div>
        <div className="messaging-group-list">
          {visibleChannels.map((channel) => (
            <Link key={channel.key} href={`/panel/wiadomosci?rozmowa=${encodeURIComponent(channel.key)}`} className={channel.key === selectedKey ? "active" : undefined}>
              <span className="messaging-group-avatar">{channel.kind === "DIRECT" ? <Users aria-hidden="true" /> : channel.name.slice(0, 2).toUpperCase()}</span>
              <span><strong>{channel.name}</strong><small>{channel.kind === "DIRECT" ? `${channel.participants.length} uczestników` : channel.locationName}</small><em>{formatChannelTime(channel.lastActivity)}</em></span>
              <span className="messaging-channel-tail">{channel.messageCount > 0 ? <b>{channel.messageCount}</b> : null}<ChevronRight aria-hidden="true" /></span>
            </Link>
          ))}
          {visibleChannels.length === 0 ? <div className="messaging-list-empty"><Search aria-hidden="true" /><strong>Brak pasujących rozmów</strong><small>Zmień filtr albo wpisz inną nazwę.</small></div> : null}
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
        {errorMessage ? <p className="messaging-status error" role="alert">{errorMessage}</p> : null}
        {!selected ? (
          <div className="messaging-thread-empty"><Megaphone aria-hidden="true" /><h2>Wybierz rozmowę</h2><p>Otworzysz kanał grupy albo rozmowę z wybranymi osobami. Dostęp dyrektora zostanie zapisany automatycznie.</p></div>
        ) : (
          <>
            <header className="messaging-thread-header"><Link className="messaging-mobile-back" href="/panel/wiadomosci" onClick={(event) => { event.preventDefault(); window.location.assign("/panel/wiadomosci"); }}><ArrowLeft aria-hidden="true" /> Rozmowy</Link><div><span className="section-kicker">{selected.locationName}</span><h2>{selected.name}</h2><small><Users aria-hidden="true" /> {selected.kind === "DIRECT" ? selected.participants.map((item) => item.name).join(", ") : `${selected.studentCount} uczniów · ${selected.teacherCount} wykładowców · rodzice powiązani z uczniami`}</small></div><span><Clock3 aria-hidden="true" /> Ostatnie 100 wiadomości</span>{role === "DIRECTOR" && selected.kind === "GROUP" ? <Link className="messaging-members-link" href="/panel/szkola/kartoteki#grupy">Zarządzaj składem grupy</Link> : null}</header>
            <p className="messaging-oversight-note"><ShieldCheck aria-hidden="true" /> Dyrektor ma służbowy wgląd w wiadomości; otwarcia są zapisywane w historii bezpieczeństwa.</p>
            <div ref={messageListRef} className="messaging-message-list" aria-live="polite" tabIndex={0} aria-label={`Wiadomości: ${selected.name}`}>
              {messages.length === 0 ? <div className="messaging-thread-empty"><Send aria-hidden="true" /><h3>Zacznij rozmowę</h3><p>Napisz krótką informację dla grupy. Powiadomienia e-mail trafią do kolejki.</p></div> : messages.map((message) => {
                const own = message.authorId === currentUserId;
                return <article key={message.id} className={`messaging-message ${own ? "own" : ""} ${message.kind === "ANNOUNCEMENT" ? "announcement" : ""}`}>
                  <div className="messaging-message-meta"><strong>{message.kind === "ANNOUNCEMENT" ? "Ogłoszenie szkoły" : message.author.name}</strong><time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div>
                  {message.subject ? <h3>{message.subject}</h3> : null}{message.body ? <p>{message.body}</p> : null}
                  {message.attachments.length ? <div className="messaging-attachments">{message.attachments.map((attachment) => <a key={attachment.id} href={`/panel/wiadomosci/zalacznik/${attachment.id}`}><Paperclip aria-hidden="true" /><span><strong>{attachment.storedFile.originalName}</strong><small>{Math.ceil(attachment.storedFile.sizeBytes / 1024)} KB</small></span><Download aria-hidden="true" /></a>)}</div> : null}
                  <div className="messaging-reactions" aria-label="Reakcje na wiadomość">{messageReactionEmojis.map((emoji) => { const summary = message.reactionSummary.find((item) => item.emoji === emoji); return <form action={toggleMessageReactionAction} key={emoji}><input type="hidden" name="messageId" value={message.id} /><input type="hidden" name="emoji" value={emoji} /><button type="submit" className={summary?.reacted ? "active" : undefined} aria-label={`${summary?.reacted ? "Usuń" : "Dodaj"} reakcję ${emoji}`}>{emoji}{summary?.count ? <span>{summary.count}</span> : null}</button></form>; })}</div>
                  {message.requiresAcknowledgement && !own ? message.acknowledgedByCurrent ? <span className="messaging-acknowledged"><CheckCheck /> Potwierdzono</span> : <form action={acknowledgeMessageAction} className="messaging-ack-form"><input type="hidden" name="messageId" value={message.id} /><button type="submit"><CheckCheck /> Potwierdzam, że przeczytałem/am</button></form> : null}
                  {(own || role === "TEACHER" || role === "DIRECTOR") ? <footer><CheckCheck aria-hidden="true" /> {message._count.reads} odczyt. {message.requiresAcknowledgement ? `· ${message._count.acknowledgements} potwierdzeń` : ""} {message.delivery.failed ? `· ${message.delivery.failed} e-mail do ponowienia` : message.delivery.pending ? `· ${message.delivery.pending} e-mail oczekuje` : message.delivery.sent ? `· ${message.delivery.sent} e-mail wysłano` : ""}</footer> : null}
                </article>;
              })}
            </div>
            <form ref={messageFormRef} className="messaging-composer" action={messageAction} onSubmit={() => rotateRequestId(messageRequestId)}>
              {selected.kind === "GROUP" ? <input type="hidden" name="groupId" value={selected.groupId ?? ""} /> : <input type="hidden" name="conversationId" value={selected.conversationId ?? ""} />}<input ref={messageRequestId} type="hidden" name="clientRequestId" defaultValue={newRequestId()} />
              <label htmlFor="message-body">{selected.kind === "DIRECT" ? "Wiadomość do wybranych osób" : "Wiadomość do całej grupy"}</label><div className="messaging-composer-main"><textarea ref={draftRef} id="message-body" name="body" maxLength={2000} rows={2} placeholder="Napisz wiadomość albo wyślij sam załącznik…" /><button disabled={messagePending} type="submit" aria-label="Wyślij wiadomość"><Send aria-hidden="true" /></button></div>
              {selectedAttachment ? <div className="messaging-selected-attachment"><Paperclip aria-hidden="true" /><span>{selectedAttachment}</span><button type="button" aria-label="Usuń wybrany załącznik" onClick={() => { if (attachmentRef.current) attachmentRef.current.value = ""; setSelectedAttachment(null); }}><X aria-hidden="true" /></button></div> : null}
              <div className="messaging-composer-toolbar"><div aria-label="Dodaj emoji">{["👋", "👍", "😊", "🎉"].map((emoji) => <button key={emoji} type="button" onClick={() => addEmoji(emoji)} aria-label={`Dodaj ${emoji}`}>{emoji}</button>)}</div><details ref={attachmentDetailsRef}><summary><Plus aria-hidden="true" /> Załącznik i opcje</summary><div className="messaging-composer-options"><label><Paperclip /><span>Dodaj PDF, JPG lub PNG</span><input ref={attachmentRef} type="file" name="attachment" accept="application/pdf,image/jpeg,image/png" onChange={(event) => selectAttachment(event.target.files?.[0])} /></label>{["DIRECTOR", "TEACHER"].includes(role) ? <label><input type="checkbox" name="requiresAcknowledgement" /><span>Poproś o świadome potwierdzenie przeczytania</span></label> : null}</div></details></div>
              {attachmentError ? <p className="messaging-status error" role="alert">{attachmentError}</p> : null}
              {messageState.message ? <p className={`messaging-status ${messageState.status}`} role="status">{messageState.message}</p> : null}
            </form>
          </>
        )}
      </div>

      {role === "DIRECTOR" ? <>
        <dialog className="messaging-dialog" ref={announcementDialog} onClose={resetAnnouncement}>
          <div className="messaging-dialog-handle" onPointerDown={dragAnnouncement}><GripHorizontal aria-hidden="true" /><span>Przeciągnij lub zmień rozmiar okna</span><button type="button" aria-label="Zamknij" onClick={() => closeDialog(announcementDialog, resetAnnouncement)}><X aria-hidden="true" /></button></div>
          <form action={announcementAction} onSubmit={() => rotateRequestId(announcementRequestId)} className="messaging-dialog-body"><span className="section-kicker">Ogłoszenie masowe</span><h2>Jedna wiadomość, wybrane grupy</h2><p>Odbiorcy zobaczą ogłoszenie w swoich rozmowach. E-mail jest dodatkowym powiadomieniem.</p>
            <input ref={announcementRequestId} type="hidden" name="clientRequestId" defaultValue={newRequestId()} />
            <fieldset><legend>Wybierz grupy</legend><div className="messaging-checkboxes">{groups.map((group) => <label key={group.key}><input type="checkbox" name="groupIds" value={group.groupId ?? ""} /><span><strong>{group.name}</strong><small>{group.locationName}</small></span></label>)}</div></fieldset>
            <label>Temat<input name="subject" maxLength={120} placeholder="Np. Zmiana godziny zajęć w piątek" required /></label>
            <label>Treść<textarea name="body" rows={5} maxLength={3000} placeholder="Napisz konkretnie, co się zmienia i czy odbiorca musi coś zrobić." required /></label>
            <label className="messaging-file-field"><Paperclip /><span>Załącz PDF, JPG lub PNG (maks. 8 MB)</span><input type="file" name="attachment" accept="application/pdf,image/jpeg,image/png" /></label>
            <label className="messaging-ack-option"><input type="checkbox" name="requiresAcknowledgement" /><span><strong>Wymagaj potwierdzenia</strong><small>Odbiorca wybierze „Potwierdzam, że przeczytałem/am”. Samo otwarcie wiadomości nie wystarczy.</small></span></label>
            {announcementState.message ? <p className={`messaging-status ${announcementState.status}`} role="status">{announcementState.message}</p> : null}
            <div className="messaging-dialog-actions"><button type="button" onClick={() => closeDialog(announcementDialog, resetAnnouncement)}>Anuluj</button><button type="submit" disabled={announcementPending}><Megaphone aria-hidden="true" /> {announcementPending ? "Wysyłanie…" : "Wyślij ogłoszenie"}</button></div>
          </form>
        </dialog>
        <dialog className="messaging-dialog" ref={directDialog} onClose={resetDirect}>
          <div className="messaging-dialog-handle" onPointerDown={dragDirect}><GripHorizontal aria-hidden="true" /><span>Nowa rozmowa</span><button type="button" aria-label="Zamknij" onClick={() => closeDialog(directDialog, resetDirect)}><X aria-hidden="true" /></button></div>
          <form action={createDirectConversationAction} className="messaging-dialog-body"><MessageSquarePlus className="messaging-dialog-icon" aria-hidden="true" /><span className="section-kicker">Wybrani odbiorcy</span><h2>Utwórz prywatną rozmowę</h2><p>Wybierz pojedyncze osoby albo od razu skład aktywnej grupy. Dyrektor pozostaje uczestnikiem rozmowy.</p>
            <label>Nazwa rozmowy<input name="title" minLength={3} maxLength={80} placeholder="Np. Organizacja zajęć Ani" required /></label>
            <fieldset><legend>Dodaj osoby</legend>
              <div className="messaging-recipient-tools"><label><Search aria-hidden="true" /><span className="sr-only">Szukaj osoby</span><input type="search" value={recipientQuery} onChange={(event) => setRecipientQuery(event.target.value)} placeholder="Imię, nazwisko lub e-mail" /></label><select value={recipientRole} onChange={(event) => setRecipientRole(event.target.value)} aria-label="Filtr roli"><option value="ALL">Wszystkie role</option><option value="PARENT">Rodzice</option><option value="STUDENT">Uczniowie</option><option value="TEACHER">Wykładowcy</option></select></div>
              <div className="messaging-group-recipient-picker"><select value={recipientGroup} onChange={(event) => setRecipientGroup(event.target.value)} aria-label="Wybierz grupę"><option value="ALL">Wszystkie grupy</option>{groups.map((group) => <option key={group.groupId} value={group.groupId ?? ""}>{group.name} · {group.locationName}</option>)}</select><button type="button" disabled={recipientGroup === "ALL"} onClick={() => setSelectedRecipients((current) => [...new Set([...current, ...recipientDirectory.filter((person) => person.groupIds.includes(recipientGroup)).map((person) => person.id)])])}><Users aria-hidden="true" /> Dodaj całą grupę</button><span>{selectedRecipients.length} wybranych</span></div>
              <div className="messaging-checkboxes messaging-recipient-list">{recipientDirectory.map((person) => <label key={person.id} hidden={!visibleRecipients.some((visible) => visible.id === person.id)}><input type="checkbox" name="participantIds" value={person.id} checked={selectedRecipients.includes(person.id)} onChange={(event) => setSelectedRecipients((current) => event.target.checked ? [...new Set([...current, person.id])] : current.filter((id) => id !== person.id))} /><span><strong>{person.name}</strong><small>{person.role === "PARENT" ? "Rodzic" : person.role === "STUDENT" ? "Uczeń" : "Wykładowca"} · {person.email}</small></span></label>)}</div>
              {!recipientQuery.trim() && recipientGroup === "ALL" && recipientDirectory.length > 8 ? <p className="messaging-status">Pokazujemy 8 propozycji. Wpisz imię albo wybierz grupę, aby znaleźć pozostałe osoby.</p> : null}
              {visibleRecipients.length === 0 ? <p className="messaging-status">Brak osób pasujących do filtra.</p> : null}
            </fieldset>
            <p className="messaging-oversight-note"><ShieldCheck aria-hidden="true" /> Skład rozmowy ustala dyrektor. Uczestnicy nie mogą samodzielnie dodawać kolejnych osób.</p>
            <div className="messaging-dialog-actions"><button type="button" onClick={() => closeDialog(directDialog, resetDirect)}>Anuluj</button><button type="submit"><MessageSquarePlus aria-hidden="true" /> Utwórz rozmowę</button></div>
          </form>
        </dialog>
      </> : null}
    </section>
  );
}
