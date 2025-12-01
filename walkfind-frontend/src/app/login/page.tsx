"use client";

import { COGNITO_LOGIN_URL } from "@/lib/cognito";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        className="rounded bg-blue-600 px-6 py-3 text-white"
        onClick={() => {
          window.location.href = COGNITO_LOGIN_URL;
        }}
      >
        Cognitoでログイン
      </button>
    </div>
  );
}