'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Message {
  id: number;
  user_id: string; 
  username: string;
  content: string;
  created_at: string;
}
interface Profile {
  id: string;
  nickname: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 1. 로그인/프로필 불러오기
  useEffect(() => {
    supabase.auth.getUser().then(async (res) => {
      if (!res.data.user) {
        router.replace('/login');
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', res.data.user.id)
          .single();
        if (data) setProfile({ id: res.data.user.id, ...data });
        setLoading(false);
      }
    });
  }, [router]);

  // 2. 메시지 최초 불러오기
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
  }, []);

  // 3. 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);}
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. 메시지 전송
  const sendMessage = async () => {
    if (!profile || !input.trim()) return;
    await supabase.from('messages').insert([
      { user_id: profile.id, username: profile.nickname, content: input }
    ]);
    setInput('');
  };

  // 5. 로그아웃
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) return <div style={{ margin: 60, textAlign: 'center' }}>로딩중...</div>;
  if (!profile) return null;

  return (
    <main
        style={{
        maxWidth: 540,
        width: '100vw', // ★ '100vw'에서 '100%'로 변경하여 부모 너비에 맞춥니다.
        margin: '0 auto',
        minHeight: '100svh', // ★ '100svh'에서 'auto'로 변경하여 레이아웃 충돌을 방지합니다.
        background: '#f5f8fb',
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 상단바: '← 맛집 찾기'와 '닉네임 로그아웃'을 한 줄에 표시 */}
      <div style={{
          width: '100%', // ★ 여기에 width: '100%'를 명시적으로 추가합니다.
          padding: '10px 20px',
          background: '#fff',
          borderTop: '1px solid #e6eaf2',
          justifyContent: 'space-between',
          display: 'flex',
          gap: 7,
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 3,
          maxWidth: 540,
          margin: '0 auto',
          boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')} // 뒤로가기 버튼 기능
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              marginRight: '10px',
              color: '#333',
              lineHeight: '1',
              padding: '0'
            }}
          >
            ←
          </button>
          <span style={{fontWeight: 'bold', color: '#1d1d1f', fontSize: 15}}>채팅방</span> {/* 제목 */}
        </div>
        <div style={{
          color: '#3670ff', fontWeight: 'bold', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
        }}>
          {profile.nickname ?? ""}
          <button
            onClick={handleLogout}
            style={{
              marginLeft: 9,
              background: '#ecf2ff',
              border: 'none',
              borderRadius: 7,
              color: '#3770f8',
              fontWeight: 600,
              fontSize: 11.5,
              padding: '5.5px 12px',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 메시지 리스트 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '13px 9px 11px 9px',
          background: '#f6faff',
          fontSize: 15,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map(msg =>
          <div key={msg.id} style={{
            margin: '7px 0',
            padding: '8px 13px',
            borderRadius: 13,
            background: msg.user_id === profile.id ? '#e6f0ff' : '#fff',
            fontWeight: msg.user_id === profile.id ? 700 : 500,
            color: msg.user_id === profile.id ? '#3171e3' : '#1d1d1f',
            alignSelf: msg.user_id === profile.id ? 'flex-end' : 'flex-start',
            maxWidth: '86%',
            wordBreak: 'break-word',
            boxShadow: msg.user_id === profile.id ? '0 2px 7px #e5f0ff55' : '0 0.5px 2px #e0eaf766'
          }}>
            <span style={{
              fontSize: 13, color: '#b6c6e7', fontWeight: 600, marginRight: 7
            }}>{msg.username}</span>
            {msg.content}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div
        style={{
          width: '100%',
          padding: '14px 9px',
          background: '#fff',
          borderTop: '1.5px solid #e6eaf2',
          display: 'flex',
          gap: 7,
          alignItems: 'center',
          position: 'fixed',
          maxWidth: 540,
          margin: '0 auto',
          bottom: 0,
          zIndex: 3
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="메시지를 입력하세요"
          style={{
            flex: 1,
            borderRadius: 8,
            border: '1.2px solid #d2e0f4',
            fontSize: 15,
            padding: '11px 13px'
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            background: '#2e7fff',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '0 20px',
            fontWeight: 700,
            fontSize: 15,
            minHeight: 40,
            minWidth: 54
          }}
        >전송</button>
      </div>
    </main>
  );
}
