export type MailFolderId =
  | "INBOX"
  | "Sent"
  | "Drafts"
  | "Trash"
  | "Archive"
  | "Spam"
  | string;

export type MailAttachment = {
  index: number;
  filename: string;
  contentType: string;
  size: number;
};

export type Mail = {
  uid: number | string;
  from: string;
  to: string;
  subject: string;
  date: string;
  text?: string;
  html?: string;
  attachments: MailAttachment[];
  seen: boolean;
  flagged: boolean;
};

export type MailboxResponse = {
  mails: Mail[];
  /** false when this account has no such IMAP folder. */
  folderExists: boolean;
};

export type DeleteResult = {
  /** true if the message was moved to Trash; false if it was deleted for good. */
  movedToTrash: boolean;
};

export type Session = {
  username: string;
  token: string;
  /** True for root and for any account in the system's sudo/wheel group. */
  isAdmin: boolean;
};

export type ComposePayload = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: File[];
};

export type MailFolder = {
  /** Full IMAP mailbox path, e.g. "Projects/Website" for a nested folder. */
  name: string;
  delimiter: string;
};

export type FolderItem = {
  id: MailFolderId;
  label: string;
  mailbox: string;
  system?: boolean;
  destructive?: boolean;
};

export type MailTemplate = {
  id: string;
  name: string;
  body: string;
};

export type UserSettings = {
  name: string;
  signature: string;
  canReceiveMail: boolean;
  vacationMode: boolean;
  vacationMessage?: string;
  forwardingAddress: string | null;
  templates: MailTemplate[];
};

export type GlobalSettings = {
  defaultSignature: string;
  maxStorageMB: number;
};

export type MailboxUsage = {
  usedBytes: number;
  limitBytes: number;
};
