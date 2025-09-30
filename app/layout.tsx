import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout"; // 1. 새로 만든 컴포넌트 import

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 2. 'use client'가 없으므로 metadata를 그대로 사용할 수 있습니다.
export const metadata: Metadata = {
  title: "피티스푼",
  description: "평택대 주변 맞집을 공유하는 사이트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          margin: 0,
        }}
      >
        {/* 3. 동적 로직을 ClientLayout 컴포넌트에 위임 */}
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}