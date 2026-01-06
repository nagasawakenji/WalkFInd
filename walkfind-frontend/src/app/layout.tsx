import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


const siteUrl = "https://walkfind.vercel.app";

export const metadata: Metadata = {
  // これがないと画像が相対パスで解決できず、表示されないことがあります
  metadataBase: new URL(siteUrl),

  title: {
    default: "WalkFind",
    template: "見つけましょう",
  },
  description: "歩いて、探して、見つけましょう",

  // NoteやLINE, Facebookなどで使われる設定
  openGraph: {
    title: "WalkFind",
    description: "見つけましょう",
    url: siteUrl,
    siteName: "WalkFind",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        // ★ここ重要: OGP用の画像を指定します
        // icon.jpg をそのまま使うこともできますが、推奨は横長画像です
        url: "/og-image.jpeg", 
        width: 1200,
        height: 630,
        alt: "WalkFind",
      },
    ],
  },

  // X (Twitter) 用の設定
  twitter: {
    card: "summary_large_image",
    title: "WalkFind",
    description: "見つけましょう",
    images: ["/og-image.jpeg"], 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 言語設定を日本語に変更
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}