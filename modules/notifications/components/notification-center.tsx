"use client";

import { BellRing, CheckCheck, Clock3, MessageCircleMore, TriangleAlert } from "lucide-react";
import { startTransition, useMemo, useState } from "react";
import Link from "next/link";

import { updateNotificationsAction } from "@/modules/notifications/actions";

type NotificationView = {
  key: string;
  kind: "ACTION" | "WARNING" | "INFO" | "MESSAGE";
  title: string;
  description: string;
  href: string;
  occurredAt: string;
  read: boolean;
};

const sourceLabels = {
  contracts: "Umowy",
  payments: "Płatności",
  messages: "Wiadomości",
  schedule: "Grafik",
  records: "Kartoteki",
  system: "System",
} as const;
type Source = keyof typeof sourceLabels;

function sourceFor(key: string): Source {
  if (key.startsWith("contract") || key.startsWith("signed-contract")) return "contracts";
  if (key.startsWith("payment")) return "payments";
  if (key.startsWith("message") || key.startsWith("email")) return "messages";
  if (key.startsWith("lesson") || key.startsWith("schedule")) return "schedule";
  if (key.startsWith("record")) return "records";
  return "system";
}

export function NotificationCenter({ initialItems }: { initialItems: NotificationView[] }) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<string[]>([]);
  const [source, setSource] = useState<"ALL" | Source>("ALL");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const visible = useMemo(() => items.filter((item) => source === "ALL" || sourceFor(item.key) === source), [items, source]);

  function run(action: "read" | "unread" | "snooze", keys: string[]) {
    if (!keys.length || pending) return;
    setPending(true);
    setFeedback("");
    startTransition(async () => {
      const formData = new FormData();
      keys.forEach((key) => formData.append("key", key));
      formData.set("action", action);
      const result = await updateNotificationsAction(formData);
      if (result.ok) {
        setItems((current) => action === "snooze"
          ? current.filter((item) => !keys.includes(item.key))
          : current.map((item) => keys.includes(item.key) ? { ...item, read: action === "read" } : item));
        setSelected([]);
      }
      setFeedback(result.message);
      setPending(false);
      window.setTimeout(() => setFeedback(""), 2600);
    });
  }

  const unreadKeys = items.filter((item) => !item.read).map((item) => item.key);
  return <>
    <section className="notification-toolbar" aria-label="Porządkowanie powiadomień">
      <label><span>Źródło</span><select value={source} onChange={(event) => setSource(event.target.value as "ALL" | Source)}><option value="ALL">Wszystkie źródła</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" onClick={() => run("read", unreadKeys)} disabled={!unreadKeys.length || pending}><CheckCheck aria-hidden="true" /> Oznacz wszystko jako przeczytane</button>
      <button type="button" onClick={() => run("snooze", selected)} disabled={!selected.length || pending}><Clock3 aria-hidden="true" /> Przypomnij wybrane jutro</button>
      <span>{selected.length ? `Wybrano: ${selected.length}` : "Zaznacz kilka spraw, aby działać grupowo"}</span>
    </section>
    {feedback ? <div className="notification-feedback" role="status"><CheckCheck aria-hidden="true" /> {feedback}</div> : null}
    {visible.length === 0 ? <section className="notification-empty"><CheckCheck aria-hidden="true" /><h2>Wszystko uporządkowane</h2><p>W tym filtrze nie ma spraw wymagających uwagi.</p></section> : <section className="notification-feed" aria-label="Lista powiadomień">
      {visible.map((item) => <article key={item.key} className={`${item.read ? "read" : "unread"} ${pending && selected.includes(item.key) ? "is-updating" : ""}`}>
        <label className="notification-select"><input type="checkbox" checked={selected.includes(item.key)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key))} /><span className="sr-only">Zaznacz {item.title}</span></label>
        <span className={`notification-kind notification-${item.kind.toLowerCase()}`}>{item.kind === "WARNING" ? <TriangleAlert /> : item.kind === "MESSAGE" ? <MessageCircleMore /> : item.kind === "ACTION" ? <BellRing /> : <Clock3 />}</span>
        <Link href={item.href}><span>{sourceLabels[sourceFor(item.key)]} · {item.read ? "Przeczytane" : "Nowe"}</span><h2>{item.title}</h2><p>{item.description}</p><time>{formatDate(item.occurredAt)}</time></Link>
        <div className="notification-actions"><button type="button" onClick={() => run(item.read ? "unread" : "read", [item.key])} disabled={pending}>{item.read ? "Oznacz jako nowe" : "Oznacz jako przeczytane"}</button><button type="button" onClick={() => run("snooze", [item.key])} disabled={pending}><Clock3 /> Przypomnij jutro</button></div>
      </article>)}
    </section>}
  </>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Warsaw" }).format(new Date(value));
}
