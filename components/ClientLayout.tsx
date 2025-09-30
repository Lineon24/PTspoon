'use client'; // usePathname 훅을 사용하기 위해 필요합니다.

import { usePathname } from 'next/navigation';
import TabBar from '@/components/TabBar';
import AuthListener from "@/components/AuthListener";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname.startsWith('/chat/');

  const HEADER_HEIGHT = '44px';
  const TABBAR_HEIGHT = '60px';

  return (
    <>
      <AuthListener />
      {isChatPage ? (
        // 채팅 페이지일 경우: padding 없이 전체 공간을 자식에게 넘겨줌
        <div style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
      ) : (
        // 일반 페이지일 경우: 기존처럼 padding을 적용
        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          paddingTop: HEADER_HEIGHT,
          paddingBottom: TABBAR_HEIGHT,
        }}>
          {children}
        </div>
      )}
      {/* TabBar는 컴포넌트 내부에서 채팅방 여부를 판단한다고 하셨으므로 그대로 둡니다. */}
      <TabBar />
    </>
  );
}