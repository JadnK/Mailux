declare module "authenticate-pam" {
  function authenticate(service: string, username: string, password: string, callback: (err: Error | null) => void): void;
  export = authenticate;
}
