'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation'; 
import HeaderWithBack from '@/components/HeaderWithBack';
import { RestaurantMessage } from '@/components/tag_restaurant';
import { SendHorizontal } from 'lucide-react';

interface Message {
  id: number;
  user_id: string; 
  username: string;
  content: string;
  created_at: string;
  msg_image?: string | null;
}
interface Profile {
  id: string;
  nickname: string;
}

interface Chat_rooms {
  id: string;
  room_name: string;
}


export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRoom, setChatRoom] = useState<Chat_rooms | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { room_id } = useParams();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    imageInputRef.current && (imageInputRef.current.value = '');
  };

  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : null;

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
        .eq('room_id', room_id)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    };

    if (room_id) {
      fetchMessages();
    }
  }, [room_id]);

  // 채팅방 진입 시 맨 아래로 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // 새 메시지 도착 시, 스크롤이 맨 아래일 때만 자동 스크롤
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 스크롤 위치 추적
  const handleScroll = () => {
    const el = chatListRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    setIsAtBottom(atBottom);
  };

  // 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ 메시지 전송
  const sendMessage = async () => {
    if (!profile || (!input.trim() && !imageFile)) return;

    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const safeFileName = `${Date.now()}.${ext}`;
      const filePath = `${profile.id}/${safeFileName}`;

      const { error } = await supabase.storage
        .from("chat-images")
        .upload(filePath, imageFile);

      if (error) {
        console.error("이미지 업로드 실패:", error.message || error);
        return;
      } else {
        const { data: urlData } = supabase.storage
          .from("chat-images")
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
    }

    await supabase.from("messages").insert([
      {
        user_id: profile.id,
        room_id,
        username: profile.nickname,
        content: input,
        msg_image: imageUrl,
      },
    ]);

    setInput("");
    setImageFile(null);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return (
    <main>
      <HeaderWithBack title={chatRoom?.room_name ?? '채팅방'} backTF={true} />
      <div style={{ margin: 60, textAlign: 'center' }}>로딩중...</div>
    </main>
  );

  if (chatRoom == null) return (
    <main>
      <HeaderWithBack title='채팅방' backTF={true} />
      <div style={{ margin: 60, textAlign: 'center' }}>해당 채팅방은 없는 채팅방 입니다.</div>
    </main>
  );
  if (!profile) return null;

  return (
    <main
      style={{
        maxWidth: 540,
        width: '100%',
        margin: '0 auto',
        height: '100svh',
        background: '#f5f8fb',
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderWithBack title={chatRoom?.room_name ?? '채팅방'} backTF={true} />
      
      {/* 메시지 리스트 */}
      <div
        ref={chatListRef}
        onScroll={handleScroll}
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
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.user_id === profile.id ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            {/* 닉네임 */}
            <span
              style={{
                fontSize: 12,
                color: msg.user_id === profile.id ? '#3171e3' : '#6c7a89',
                fontWeight: 600,
                marginBottom: 3,
                paddingLeft: 5,
                paddingRight: 5,
              }}
            >
              {msg.username}
            </span>

            {/* 메시지 박스 */}
            <div
              style={{
                position: 'relative',
                padding: '8px 13px',
                borderRadius: 13,
                background: msg.user_id === profile.id ? '#e6f0ff' : '#fff',
                fontWeight: 500,
                color: '#1d1d1f',
                maxWidth: '86%',
                wordBreak: 'break-word',
                boxShadow: msg.user_id === profile.id
                  ? '0 2px 7px #e5f0ff55'
                  : '0 0.5px 2px #e0eaf75d',
              }}
            >
              {msg.content && (
                msg.content.startsWith('#')
                  ? <RestaurantMessage tag={msg.content.slice(1)} />
                  : <span style={{ fontSize: 15 }}>{msg.content}</span>
              )}

              {msg.msg_image && (
                <img
                  src={msg.msg_image}
                  alt="msg-img"
                  style={{ marginTop: 8, maxWidth: '100%', borderRadius: 8 }}
                />
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div
        style={{
          width: '100%',
          padding: '8px 6px',
          background: '#fff',
          borderTop: '1.5px solid #e6eaf2',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          position: 'fixed',
          maxWidth: 540,
          margin: '0 auto',
          bottom: 0,
          zIndex: 3
        }}
      >
        {/* 이미지 미리보기 */}
        {previewUrl && (
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img
              src={previewUrl}
              alt="preview"
              style={{ maxHeight: 70, borderRadius: 8 }}
            />
            <button
              onClick={handleRemoveImage}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ff4d4f',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ❌ 제거
            </button>
          </div>
        )}

        {/* 입력 영역 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'nowrap'
        }}>
          {/* 이미지 업로드 버튼 */}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="image-upload"
            ref={imageInputRef}
          />
          <label
            htmlFor="image-upload"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: '#2e7fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: 18,
              color: 'white',
              fontWeight: 'bold',
              lineHeight: 1,
            }}>+</span>
          </label>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="메시지를 입력하세요"
            style={{
              flex: 1,
              borderRadius: 8,
              border: '1.2px solid #d2e0f4',
              fontSize: 14,
              padding: '7px 9px',
              minWidth: 0
            }}
          />
          <button
            onClick={sendMessage}
            style={{
              flexShrink: 0,
              background: '#2e7fff',
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              padding: '0 9px',
              fontWeight: 600,
              fontSize: 13,
              minHeight: 36
            }}
          >
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}