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

export type FolderItem = {
  id: MailFolderId;
  label: string;
  mailbox: string;
  system?: boolean;
  destructive?: boolean;
};

export type UserSettings = {
  name: string;
  signature: string;
  canReceiveMail: boolean;
  vacationMode: boolean;
  vacationMessage?: string;
};

export type GlobalSettings = {
  defaultSignature: string;
  maxStorageMB: number;
};
