export type MailFolderId =
  | "INBOX"
  | "Sent"
  | "Drafts"
  | "Trash"
  | "Archive"
  | "Spam"
  | string;

export type Mail = {
  uid: number | string;
  from: string;
  to: string;
  subject: string;
  date: string;
  text?: string;
  html?: string;
  seen?: boolean;
  flagged?: boolean;
};

export type Session = {
  username: string;
  token: string;
};

export type ComposePayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type FolderItem = {
  id: MailFolderId;
  label: string;
  mailbox: string;
  system?: boolean;
  destructive?: boolean;
};

