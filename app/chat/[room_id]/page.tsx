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
  const [isAtBottom, setIsAtBottom] = useState(true); // 초기값을 true로 시작하면 좋습니다.
  const [justSentMessage, setJustSentMessage] = useState(false);

  const chatListRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams(); // { room_id } 대신 params 사용
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const room_id = Array.isArray(params.room_id) ? params.room_id[0] : params.room_id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : null;

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

  useEffect(() => {
    const chatContainer = chatListRef.current;
    if (!chatContainer) return;

    // --- 조건 1: 내가 메시지를 보냈을 경우 ---
    // justSentMessage가 true이면, 현재 스크롤 위치와 상관없이 무조건 맨 아래로 이동합니다.
    if (justSentMessage) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
      setJustSentMessage(false); // 신호를 사용했으니 다시 false로 바꿔줍니다.
      return;
    }

    // --- 조건 2: 상대방의 메시지를 받았을 경우 ---
    // isAtBottom이 true일 때만 (즉, 사용자가 이미 맨 아래에 있을 때만) 스크롤합니다.
    if (isAtBottom) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = chatListRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    setIsAtBottom(atBottom);
  };

useEffect(() => {
  // profile이 로드되기 전에는 구독을 시작하지 않도록 return 처리
  if (!room_id || !profile) return;

  const channel = supabase
    .channel(`public:messages:room_id=eq.${room_id}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room_id}` },
      (payload) => {
        //  핵심: 새로 도착한 메시지가 내가 보낸 것이 아닌지 확인하는 조건
        if ((payload.new as Message).user_id !== profile.id) {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [room_id, profile]);

  const sendMessage = async () => {
    if (!profile || !room_id || (!input.trim() && !imageFile)) return;
    const textToSend = input;
    const fileToSend = imageFile;
    setInput("");
    setImageFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setJustSentMessage(true);

    setMessages(prev => [...prev, {
        id: Date.now(), user_id: profile.id, username: profile.nickname, content: textToSend,
        created_at: new Date().toISOString(), msg_image: fileToSend ? URL.createObjectURL(fileToSend) : null
    }]);

    let imageUrl: string | null = null;
    if (fileToSend) {
      const filePath = `${profile.id}/${Date.now()}.${fileToSend.name.split(".").pop()}`;
      await supabase.storage.from("chat-images").upload(filePath, fileToSend);
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }
    await supabase.from("messages").insert([{
      user_id: profile.id, room_id, username: profile.nickname, content: input, msg_image: imageUrl,
    }]);

    textareaRef.current?.focus();
  };
  // 버튼 클릭 이벤트 처리
  const handleSendClick = (e: React.MouseEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // ⭐ 4. autoResize 함수를 스크롤까지 처리하는 개선된 버전으로 교체합니다.
  const autoResize = (el: HTMLTextAreaElement) => {
    const chatContainer = chatListRef.current;
    if (!chatContainer) return;
    const isScrolledToBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 5;

    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";

    if (isScrolledToBottom) {
      setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 0);
    }
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
    // ⭐ 1. main 태그는 Flexbox 컨테이너 역할을 합니다.
    <main
      style={{
        maxWidth: 540,
        width: '100%',
        margin: '0 auto',
        paddingTop: '44px',
        height: '100dvh',
        background: '#f5f8fb',
        fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderWithBack title={chatRoom?.room_name ?? '채팅방'} backTF={true} />
      
      {/* ⭐ 2. 메시지 리스트는 남는 공간을 모두 차지합니다. */}
      <div
        ref={chatListRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '13px 9px',
          background: '#f6faff',
          fontSize: 15,
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
            <span style={{ fontSize: 12, color: msg.user_id === profile.id ? '#3171e3' : '#6c7a89', fontWeight: 600, marginBottom: 3, padding: '0 5px' }}>
              {msg.username}
            </span>
            <div style={{ padding: '8px 13px', borderRadius: 13, background: msg.user_id === profile.id ? '#e6f0ff' : '#fff', fontWeight: 500, color: '#1d1d1f', maxWidth: '86%', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {msg.msg_image && (<img src={msg.msg_image} alt="msg-img" style={{ marginTop: 8, marginBottom: 10, maxWidth: '100%', borderRadius: 8, display: 'block' }}/>)}
              {msg.content && (msg.content.startsWith('#') ? <RestaurantMessage tag={msg.content.slice(1)} /> : <span>{msg.content}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* ⭐ 3. 입력창에서 position: fixed 관련 스타일을 모두 제거합니다. */}
      <div
        style={{
          width: '100%',
          padding: '8px 6px',
          background: '#fff',
          borderTop: '1.5px solid #e6eaf2',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0, // 입력창이 찌그러지는 것을 방지
        }}
      >
        {previewUrl && (
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={previewUrl} alt="preview" style={{ maxHeight: 70, borderRadius: 8 }}/>
            <button onClick={handleRemoveImage} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', fontSize: 13, cursor: 'pointer' }}>
              ❌ 제거
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, flexWrap: 'nowrap' }}>
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} id="image-upload" ref={imageInputRef} />
          <label htmlFor="image-upload" style={{ flexShrink: 0, display: 'flex', marginBottom: '3px', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', backgroundColor: '#2e7fff', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
            <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>+</span>
          </label>
          <textarea
            maxLength={300}
            rows={1}
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="메시지를 입력하세요"
            style={{ flex: 1, borderRadius: 8, border: "1.2px solid #d2e0f4", fontSize: 14, padding: "7px 9px", resize: "none", overflow: "hidden" }}
          />
          <button onClick={handleSendClick} style={{ flexShrink: 0, background: '#2e7fff', color: '#fff', border: 'none', borderRadius: 50, padding: '0 9px', fontWeight: 600, fontSize: 13, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SendHorizontal size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}