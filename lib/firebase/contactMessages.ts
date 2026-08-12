import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./config";
import type { ContactMessage, ContactMessageStatus } from "@/lib/types";

const CONTACT_MESSAGES_COLLECTION = "contactMessages";

export type ContactMessageInput = {
  name: string;
  phone: string;
  subject: string;
  message: string;
};

export async function createContactMessage(input: ContactMessageInput): Promise<void> {
  await addDoc(collection(db, CONTACT_MESSAGES_COLLECTION), {
    ...input,
    status: "new" satisfies ContactMessageStatus,
    createdAt: serverTimestamp(),
  });
}

function toContactMessage(id: string, data: Record<string, unknown>): ContactMessage {
  const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
  return {
    id,
    name: (data.name as string) ?? "",
    phone: (data.phone as string) ?? "",
    subject: (data.subject as string) ?? "",
    message: (data.message as string) ?? "",
    status: (data.status as ContactMessageStatus) ?? "new",
    createdAt: createdAt?.toMillis ? createdAt.toMillis() : Date.now(),
  };
}

export function subscribeToContactMessages(callback: (messages: ContactMessage[]) => void): Unsubscribe {
  const q = query(collection(db, CONTACT_MESSAGES_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toContactMessage(d.id, d.data())));
  });
}

export async function markContactMessageRead(id: string): Promise<void> {
  await updateDoc(doc(db, CONTACT_MESSAGES_COLLECTION, id), { status: "read" satisfies ContactMessageStatus });
}

export { CONTACT_MESSAGES_COLLECTION };
