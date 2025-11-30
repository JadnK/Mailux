export interface Mail {
  uid?: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  text: string;
  html: string;
}