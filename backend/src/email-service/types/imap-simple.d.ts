declare module "imap-simple";
declare module "imap-simple" {
  export interface ImapConfig {
    imap: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      authTimeout: number;
    };
  }

  export interface Connection {
    openBox(mailbox: string): Promise<void>;
    search(criteria: string[], options: any): Promise<any[]>;
    end(): Promise<void>;
    imap: {
      append(raw: string, options: any): Promise<void>;
    };
  }

  export function connect(config: ImapConfig): Promise<Connection>;
}