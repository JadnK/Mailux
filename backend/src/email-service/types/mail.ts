export interface Envelope {
  from?: string;
  to?: string | string[];
}

export interface MailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  envelope?: Envelope;
}
