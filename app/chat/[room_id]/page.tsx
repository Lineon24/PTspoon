'use client';
import {TagAutoSearch } from '@/components/TagAutoSearch';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation'; 
import HeaderWithBack from '@/components/HeaderWithBack';
import { RestaurantMessage } from '@/components/tag_restaurant';

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

interface Chat_rooms {
  id: string;
  room_name: string;
}

function getTagKeyword(text:string):string{
    const match=text.match(/#(\S+)$/);
    return match?match[1]:'';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRoom, setChatRoom] = useState<Chat_rooms | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { room_id } = useParams();


  // 로그인/프로필 불러오기
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

  useEffect(() => {
  if (!room_id) return;
  const fetchChatRoom = async () => {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('id, room_name')
      .eq('id', Number(room_id))
      .single();
    if (error) {
      console.error('방 이름 불러오기 실패:', error);
      setChatRoom(null);
    } else {
      setChatRoom(data);
    }
  };
  fetchChatRoom();
}, [room_id]);

  // 메시지 최초 불러오기
  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', room_id) // 해당 방 ID만 가져오기
        .order('created_at', { ascending: true });

      setMessages(data || []);
    };

    if (room_id) {
      fetchMessages();
    }
  }, [room_id]);




  // 실시간 구독
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
      { user_id: profile.id, room_id, username: profile.nickname, content: input }
    ]);
    setInput('');
  };

  if (loading) return (
    <main>
    <HeaderWithBack title={chatRoom?.room_name ?? '채팅방' } backTF= {true} /> {/* 상단 고정 헤더 */}
    <div style={{ margin: 60, textAlign: 'center' }}>로딩중...</div>
    </main>
  );
  // 없는 채팅방 접속금지
  if (chatRoom == null) return (
    <main>
    <HeaderWithBack title='채팅방' backTF= {true} /> {/* 상단 고정 헤더 */}
    <div style={{ margin: 60, textAlign: 'center' }}>해당 채팅방은 없는 채팅방 입니다.</div>
    </main>
  );
  if (!profile) return null;

  return (
    <main
        style={{
        maxWidth: 540,
        width: '100vw', 
        margin: '0 auto',
        minHeight: '100svh', 
        background: '#f5f8fb',
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderWithBack title={chatRoom?.room_name ?? '채팅방' } backTF= {true} /> {/* 상단 고정 헤더 */}
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
            {msg.content.startsWith('#')? (<RestaurantMessage tag={msg.content.slice(1)}/>):(msg.content)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div
        style={{
          width: '100%',
          padding: '10px 9px',
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