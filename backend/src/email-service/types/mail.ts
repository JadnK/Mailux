export interface Envelope {
  from?: string;
  to?: string | string[];
}

export interface MailAttachmentInput {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  envelope?: Envelope;
  attachments?: MailAttachmentInput[];
}
