// 하단바 출력 부분입니다. 넣고 싶으면 밑의 변수에 정적, 동적에 따라서 넣어주세요.
"use client";

import Link from 'next/link';
import { usePathname } from "next/navigation";
import { Home, Newspaper, MessageSquare, SquarePen } from "lucide-react";
// 특정 페이지들만 하단바를 출력을 위해 출력할 페이지들 적는 부분
const staticPaths = ['/', '/login', '/signup', '/posts', '/posts/write', '/chat', '/restaurants', '/map']; 
const dynamicPatterns = [/^\/posts\/[^/]+$/, /^\/restaurants\/[^/]+$/]; 

const navItems = [
  {href: "/", label: "홈", icon: <Home size={20} />},
  {href: "/posts", label: "게시판", icon: <Newspaper size={20} />},
  {href: "/posts/write", label: "게시글 작성", icon: <SquarePen size={20} />},
  {href: "/chat", label: "채팅방", icon: <MessageSquare size={20} />},
];

const navLabelStyle = {
  marginTop: 3,
  fontSize: 13,
};

export default function TabBar() {
  const pathname = usePathname();
  const showTabBar =
  staticPaths.includes(pathname) ||
  dynamicPatterns.some((pattern) => pattern.test(pathname)); // 하단바 추가할 페이지 기록

  if (!showTabBar) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 540,
        margin: '0 auto',
        height: 60,
        background: '#fff',
        borderTop: '1.5px solid #e7eaf1',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 2000,
        boxShadow: '0 -1.5px 8px #e2eaf980',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => { // 위에 적었던 네이게이션 배열들 모두 출력
        const isActive = pathname === item.href;

        const navBtnStyle = {
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          color: isActive ? '#3268f8' : '#888', // 접속된 사이트일 경우 해당 버튼은 파란색, 나머지는 회색
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          flex: 1,
          padding: '4px 0',
        };

        return (
          <Link key={item.label} href={item.href} style={navBtnStyle}>
            <span>{item.icon}</span>
            <span style={navLabelStyle }>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}