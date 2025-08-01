'use client';//이 파일은 클라이언트임을 명시

import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';


export default function MainPage() {
  const router = useRouter();

  return (
    <main style={{
      maxWidth: 540,
      margin: '0 auto',
      padding: 24,
      fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
      background: '#f7f8fa',
      minHeight: '100vh'
    }}>
      <HeaderWithBack title="PTU 맛집 찾기" iconColor='#3878ff' iconIndex={0} backTF= {false} /> {/* 상단 고정 헤더 */}

      <div style={{ color: '#3478ff', fontWeight: 700, fontSize: 25 }} role="img" aria-label="pin">📍 실시간 맞집 찾기</div>
      <div style={{ color: '#787b88', fontSize: 15, marginBottom: 16 }}>
        마음이 맞는 사람과 맛집을 찾아보세요!
      </div>
            {/* 채팅방 입장 버튼 (누구나 노출, 클릭 시 로그인 필요하면 /login 이동) 과 게시글 보기 버튼*/}
      <button
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 11,
          background: '#3478ff',
          color: '#fff',
          fontWeight: 700,
          fontSize: 17,
          border: 'none',
          marginTop: 40,
        }}
        onClick={() => {router.push('/posts')}}
      >
        <span role="img" aria-label="posts" style={{ marginRight: 6 }}>📝</span>
        게시글 보기
      </button>
      <button
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 11,
          background: '#3478ff',
          color: '#fff',
          fontWeight: 700,
          fontSize: 17,
          border: 'none',
          marginTop: 40,
        }}
        onClick={() => {
          router.push('/login');
        }}
      >
        <span role="img" aria-label="chat" style={{ marginRight: 6 }}>💬</span>
        채팅방 입장
      </button>
    </main>
  );
}