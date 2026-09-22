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
    closeBox(autoExpunge?: boolean): Promise<void>;
    search(criteria: any[], options: any): Promise<any[]>;
    end(): void;

    append(
      message: string | Buffer,
      options?: { mailbox?: string; flags?: string | string[] }
    ): Promise<void>;

    addFlags(uid: number | string | Array<number | string>, flags: string | string[]): Promise<void>;
    delFlags(uid: number | string | Array<number | string>, flags: string | string[]): Promise<void>;

    /** Moves message(s) to another mailbox - uses the server's MOVE extension
     *  if available, otherwise falls back to copy+flag+expunge. */
    moveMessage(uid: number | string | Array<number | string>, boxName: string): Promise<void>;

    /** Flags message(s) \Deleted and expunges them - a real, permanent delete. */
    deleteMessage(uid: number | string | Array<number | string>): Promise<void>;

    /** Creates a mailbox. Rejects if it already exists. */
    addBox(boxName: string): Promise<string>;
    getBoxes(): Promise<any>;

    imap: {
      expunge(cb?: (err: Error | null) => void): void;
    };
  }

  export function connect(config: ImapConfig): Promise<Connection>;
}
