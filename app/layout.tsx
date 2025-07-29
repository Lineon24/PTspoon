
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TabBar from '@/components/TabBar'; 
import AuthListener from "@/components/AuthListener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "맛집 찾기",
  description: "맛집 찾기",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const HEADER_HEIGHT = '44px'; // HeaderWithBack.tsx의 대략적인 높이
    const TABBAR_HEIGHT = '60px'; // TabBar.tsx에서 height: 60px
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh', // 뷰포트 전체 높이를 차지하도록
          margin: 0, // 기본 마진 제거
          padding: 0, // 기본 패딩 제거
        }}
      >
        <AuthListener />
        {/* 실제 페이지 콘텐츠를 담을 컨테이너 */}
        <div style={{
          flexGrow: 1, // 남은 수직 공간을 모두 차지하도록 설정
          overflowY: 'auto', // 내용이 넘칠 경우 스크롤 가능하게
          // 헤더와 탭바에 의해 가려지는 부분을 위한 패딩
          paddingTop: HEADER_HEIGHT,
          paddingBottom: TABBAR_HEIGHT,
          width: '100%', // 너비를 100%로 설정 (maxWidth 등은 각 페이지에서)
          boxSizing: 'border-box', // 패딩이 너비에 포함되도록
        }}>
          {children}
        </div>
        <TabBar /> {/* 하단 고정 탭바 */}
      </body>
    </html>
  );
}

