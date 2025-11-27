import type { Mail } from "../types/mail";

export const fetchInbox = async (username: string): Promise<Mail[]> => {
  const res = await fetch(`http://localhost:5000/api/mail/inbox/${username}`);
  if (!res.ok) return [];
  return res.json();
};

export const fetchSent = async (username: string): Promise<Mail[]> => {
  const res = await fetch(`http://localhost:5000/api/mail/sent/${username}`);
  return res.json();
};

export const sendMail = async (mailData: Omit<Mail, "date">) => {
  const res = await fetch(`http://localhost:5000/api/mail/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mailData),
  });
  return res.json();
};