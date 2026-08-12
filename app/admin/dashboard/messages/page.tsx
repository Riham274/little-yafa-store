"use client";

import { useEffect, useState } from "react";
import { subscribeToContactMessages, markContactMessageRead } from "@/lib/firebase/contactMessages";
import type { ContactMessage } from "@/lib/types";
import { useAdminLanguage } from "@/context/AdminLanguageContext";
import StatCard from "@/components/admin/StatCard";

function NewBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex px-3 py-1 rounded-full font-label-sm text-label-sm font-bold bg-secondary-container text-on-secondary-container shrink-0">
      {label}
    </span>
  );
}

export default function AdminMessagesPage() {
  const { t } = useAdminLanguage();
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  useEffect(() => subscribeToContactMessages(setMessages), []);

  const newCount = messages.filter((m) => m.status === "new").length;

  const handleMarkAsRead = async (message: ContactMessage) => {
    if (message.status !== "new") return;
    await markContactMessageRead(message.id);
  };

  return (
    <div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-lg">{t.messages.title}</h1>

      <div className="grid grid-cols-2 gap-md mb-lg max-w-md">
        <StatCard label={t.messages.statTotal} value={messages.length} icon="mail" tone="primary" />
        <StatCard label={t.messages.statNew} value={newCount} icon="mark_email_unread" tone="secondary" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-surface-container-lowest rounded-2xl cloud-shadow border border-outline-variant/50 overflow-hidden">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase">
              <th className="py-3 px-md">{t.messages.tableName}</th>
              <th className="py-3 px-md">{t.messages.tablePhone}</th>
              <th className="py-3 px-md">{t.messages.tableSubject}</th>
              <th className="py-3 px-md text-end">{t.messages.tableDate}</th>
              <th className="py-3 px-md text-end normal-case">{t.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr
                key={message.id}
                className={`border-b border-outline-variant/50 align-top ${
                  message.status === "new" ? "bg-secondary-container/10" : ""
                }`}
              >
                <td className="py-3 px-md">
                  <div className="flex items-center gap-2">
                    {message.status === "new" && <NewBadge label={t.messages.newBadge} />}
                    <span className="font-body-md text-on-surface font-semibold">{message.name}</span>
                  </div>
                </td>
                <td className="py-3 px-md">
                  <a
                    href={`https://wa.me/${message.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="font-body-md text-primary hover:underline"
                  >
                    {message.phone}
                  </a>
                </td>
                <td className="py-3 px-md max-w-md">
                  <p className="font-body-md text-on-surface">{message.subject}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 whitespace-pre-wrap">
                    {message.message}
                  </p>
                </td>
                <td className="py-3 px-md text-end font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                  {new Date(message.createdAt).toLocaleString()}
                </td>
                <td className="py-3 px-md text-end">
                  {message.status === "new" && (
                    <button
                      onClick={() => handleMarkAsRead(message)}
                      title={t.messages.markAsRead}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">mark_email_read</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-on-surface-variant font-body-md">
                  {t.messages.noMessagesFound}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-2xl cloud-shadow p-md flex flex-col gap-2 ${
              message.status === "new" ? "bg-secondary-container/10" : "bg-surface-container-lowest"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {message.status === "new" && <NewBadge label={t.messages.newBadge} />}
                <span className="font-body-md text-on-surface font-semibold">{message.name}</span>
              </div>
              {message.status === "new" && (
                <button
                  onClick={() => handleMarkAsRead(message)}
                  title={t.messages.markAsRead}
                  className="text-on-surface-variant hover:text-primary shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
                </button>
              )}
            </div>
            <a
              href={`https://wa.me/${message.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              dir="ltr"
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              {message.phone}
            </a>
            <p className="font-label-md text-label-md text-on-surface">{message.subject}</p>
            <p className="font-body-md text-on-surface-variant whitespace-pre-wrap">{message.message}</p>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {new Date(message.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="py-8 text-center text-on-surface-variant font-body-md bg-surface-container-lowest rounded-2xl">
            {t.messages.noMessagesFound}
          </div>
        )}
      </div>
    </div>
  );
}
