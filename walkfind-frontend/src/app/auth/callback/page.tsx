"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    const login = async () => {
      try {
        // サーバが code を交換し、HttpOnly Cookie（access_token/refresh_token）をセットする
        await api.post("/auth/cognito/login", { code });

        const redirectPath =
          localStorage.getItem("redirect_after_login") || "/";

        localStorage.removeItem("redirect_after_login");

        router.replace(redirectPath);
      } catch (err) {
        console.error("ログイン失敗", err);
        router.replace("/login");
      }
    };

    login();
  }, [searchParams, router]);

  return <p>ログイン処理中...</p>;
}