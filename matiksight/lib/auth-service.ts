export type LoginCredentials = {
  identifier: string;
  password: string;
  remember: boolean;
};

export type RegistrationDetails = {
  name: string;
  email: string;
  username: string;
  password: string;
};

export class AuthenticationUnavailableError extends Error {
  constructor() {
    super("Layanan autentikasi belum tersedia. Hubungi administrator MatikSight untuk informasi lebih lanjut.");
    this.name = "AuthenticationUnavailableError";
  }
}

export async function signIn(credentials: LoginCredentials): Promise<never> {
  void credentials;
  throw new AuthenticationUnavailableError();
}

export async function registerAccount(details: RegistrationDetails): Promise<never> {
  void details;
  throw new AuthenticationUnavailableError();
}

export async function signInWithGoogle(): Promise<never> {
  throw new AuthenticationUnavailableError();
}
