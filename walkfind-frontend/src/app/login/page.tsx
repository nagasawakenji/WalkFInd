"use client";

import Link from "next/link";

// .env からログインURLを読む
const COGNITO_LOGIN_URL =
  process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL ?? "";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333] flex flex-col">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
      </nav>

      <div className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-300 rounded-sm p-8 shadow-sm text-center">
          <div className="mb-6">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-black">Sign In</h1>
          <p className="text-sm text-gray-500 mb-8 font-mono">
            Please authenticate to continue.
          </p>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            onClick={() => {
              console.log("[LoginPage] Using COGNITO_LOGIN_URL:", COGNITO_LOGIN_URL);

              if (COGNITO_LOGIN_URL) {
                window.location.href = COGNITO_LOGIN_URL;
              } else {
                console.error("Cognito Login URL is not defined.");
                alert("Login configuration error.");
              }
            }}
          >
            <span>Sign in with Cognito</span>
            <span className="text-lg">→</span>
          </button>

          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
            &copy; WalkFind System
          </div>
        </div>
      </div>
    </main>
  );
}