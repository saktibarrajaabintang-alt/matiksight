"use client";

import { GoogleLogin, GoogleOAuthProvider, type CredentialResponse, type GoogleLoginProps } from "@react-oauth/google";

type GoogleIdTokenButtonProps = {
  label: string;
  text: "signin_with" | "signup_with" | "continue_with";
  className: string;
  theme?: "outline" | "outline_dark" | "filled_blue" | "filled_black";
  containerClassName?: string;
  width?: number;
  onCredential: (idToken: string) => void | Promise<void>;
  onError: (message: string) => void;
};

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

function GoogleMark() {
  return <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z" /><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.1A20 20 0 0 0 24 44Z" /><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4v-5.1H5.8a20 20 0 0 0 0 17.6l6.8-5.1Z" /><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.2l6.8 5.1c1.6-4.8 6.1-8.4 11.4-8.4Z" /></svg>;
}

export function GoogleIdTokenButton({
  label,
  text,
  className,
  theme = "outline",
  containerClassName,
  width,
  onCredential,
  onError,
}: GoogleIdTokenButtonProps) {
  if (!clientId) {
    return (
      <button
        className={className}
        type="button"
        onClick={() => onError("Login Google belum dikonfigurasi. Atur NEXT_PUBLIC_GOOGLE_CLIENT_ID.")}
      >
        <GoogleMark />{label}
      </button>
    );
  }

  const handleSuccess = ({ credential }: CredentialResponse) => {
    if (!credential) {
      onError("Google tidak mengembalikan ID token. Silakan coba lagi.");
      return;
    }
    void onCredential(credential);
  };

  return (
    <div className={containerClassName}>
      <GoogleOAuthProvider clientId={clientId}>
        {/* The installed wrapper typings predate GIS's official outline_dark theme. */}
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => onError("Google sign-in gagal. Silakan coba lagi.")}
          text={text}
          theme={theme as GoogleLoginProps["theme"]}
          size="large"
          shape="rectangular"
          width={width}
        />
      </GoogleOAuthProvider>
    </div>
  );
}
