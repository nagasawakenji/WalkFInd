"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

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

        // ログイン後の遷移
        router.replace("/");
      } catch (err) {
        console.error("ログイン失敗", err);
        router.replace("/login");
      }
    };

    login();
  }, [searchParams, router]);

  return <p>ログイン処理中...</p>;
}