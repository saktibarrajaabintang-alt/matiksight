import { apiRequest, AuthUser, storeAccessToken } from "@/lib/api-client";

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

type AuthResponse = {
  success: true;
  data: {
    user: AuthUser;
    accessToken: string;
  };
};

export async function signIn(credentials: LoginCredentials): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { identifier: credentials.identifier, password: credentials.password },
  });
  if (!response.data.accessToken) {
    throw new Error("Layanan autentikasi tidak mengembalikan token akses.");
  }
  storeAccessToken(response.data.accessToken, credentials.remember);
  return response.data.user;
}

export async function signInWithGoogle(idToken: string, remember: boolean): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>("/auth/google", {
    method: "POST",
    auth: false,
    body: { idToken },
  });
  if (!response.data.accessToken) {
    throw new Error("Layanan autentikasi tidak mengembalikan token akses.");
  }
  storeAccessToken(response.data.accessToken, remember);
  return response.data.user;
}

export async function linkGoogleAccount(idToken: string): Promise<void> {
  await apiRequest<{ success: true }>("/auth/google/link", {
    method: "POST",
    body: { idToken },
  });
}

export async function registerAccount(details: RegistrationDetails): Promise<AuthUser> {
  await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: {
      fullName: details.name,
      email: details.email,
      username: details.username,
      password: details.password,
    },
  });
  return signIn({ identifier: details.username, password: details.password, remember: false });
}
