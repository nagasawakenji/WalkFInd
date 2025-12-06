"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

type JwtPayload = {
  sub?: string;
  "cognito:username"?: string;
  userId?: string;
  username?: string;
  [key: string]: unknown;
};

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload) as JwtPayload;
  } catch (e) {
    console.error("Failed to parse JWT", e);
    return null;
  }
}

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;

    const login = async () => {
      try {
        const res = await axios.post(
          "http://localhost:8080/api/auth/cognito/login",
          { code },
          { withCredentials: true }
        );

        const { accessToken } = res.data;

        // ローカル保存（本番では HttpOnly Cookie 推奨）
        localStorage.setItem("access_token", accessToken);

        // アクセストークンからユーザーIDを抽出して保存
        const payload = parseJwt(accessToken);
        if (payload) {
          const userId =
            payload.sub ||
            payload["cognito:username"] ||
            payload.userId ||
            payload.username;

          if (userId && typeof userId === "string") {
            localStorage.setItem("user_id", userId);
          }
        }

        // ✅ ログイン前に保存していた遷移先へ復帰
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