declare module "nodemailer" {
  export interface Transporter {
    sendMail(mail: any): Promise<any>;
    verify(): Promise<void>;
    options: {
      host?: string;
      port?: number;
      secure?: boolean;
      auth?: {
        user?: string;
        pass?: string;
      };
    };
  }

  export function createTransport(config: any): Transporter;
}