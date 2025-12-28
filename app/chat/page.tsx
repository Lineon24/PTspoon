'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';

interface ChatRoom {
  id: string;
  room_name: string;
  created_at: string;
  creator_id: string;
  room_image?: string;
  room_description?: string;
}

const DEFAULT_IMAGE_URL = '/image/logo_bg.jpg';

const ChatRoomListPage = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [user, setUser] = useState<any>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [myRoomIds, setMyRoomIds] = useState<string[]>([]);
  const router = useRouter();

  // [추가] '방 만들기' 버튼의 호버 상태를 관리하기 위한 state
  const [isCreateHovered, setIsCreateHovered] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) console.error('사용자 정보 가져오기 오류:', userError);
      setUser(user);

      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) {
        setRooms([]);
        return;
      }

      setRooms(roomsData || []);

      if (user) {
        const { data: myMsgs } = await supabase
          .from('messages')
          .select('room_id')
          .eq('user_id', user.id);

        const ids = Array.from(new Set((myMsgs || []).map((msg: any) => msg.room_id)));
        setMyRoomIds(ids);
      }
    };

    fetchData();
  }, [user]);

  const handleCreateRoom = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    const { data: chatdata } = await supabase
      .from('chat_rooms')
      .select('creator_id')
      .eq('creator_id', user.id);

    if (chatdata && chatdata.length > 0) {
      alert('이미 생성한 채팅방이 있습니다.');
      return;
    }
    router.push('/chat/chat_create');
  };

  const handleDeleteRoom = async (roomId: string, creatorId: string) => {
    if (!user || user.id !== creatorId) {
      alert('본인이 만든 채팅방만 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) return;

    const { data: roomData } = await supabase
      .from('chat_rooms')
      .select('room_image')
      .eq('id', roomId)
      .single();

    const { error: deleteError } = await supabase.from('chat_rooms').delete().eq('id', roomId);

    if (!deleteError) {
      if (roomData?.room_image && !roomData.room_image.includes(DEFAULT_IMAGE_URL)) {
        const parts = roomData.room_image.split('/room-images/');
        if (parts.length > 1) {
          await supabase.storage.from('room-images').remove([parts[1]]);
        }
      }
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      alert('채팅방이 삭제되었습니다.');
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 540, margin: '0 auto', width: '100%', backgroundColor: '#f6faff', minHeight: '100vh' }}>
      <HeaderWithBack title="전체 채팅방 목록" backTF={false} />

      {/* 하단 플로팅 AI 버튼 영역 */}
      <div className="fixed bottom-[70px] z-10 flex flex-col items-end w-full max-w-[540px] mx-auto p-7 gap-3 pointer-events-none">
  
        <div className="relative pointer-events-auto group">

          {/* 1. 안내 말풍선 (툴팁) */}
          <div className="absolute bottom-full right-0 mb-3 hidden group-hover:block transition-all duration-300 ease-out transform translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
            <div className="bg-[#3268f8] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md whitespace-nowrap relative">
              피투 AI 에게 물어보세요! ✨
              <div className="absolute -bottom-1 right-6 w-3 h-3 bg-[#3268f8] rotate-45"></div>
            </div>
          </div>

          {/* 2. 파동 애니메이션 (횟수 1회로 제한) */}
          {/* animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1] -> 마지막의 _1이 1회 실행을 의미합니다. */}
          <span className="absolute inset-0 -m-1 rounded-full bg-[#3268f8] opacity-40 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_1_forwards] pointer-events-none"></span>
          {/* 3. 메인 버튼 */}
          <button 
            onClick={() => router.push('/chat/ai')} 
            className="relative h-14 w-14 rounded-full bg-white shadow-[0_4px_15px_rgba(50,104,248,0.3)] flex flex-col justify-center items-center overflow-hidden transition-transform active:scale-95 border-2 border-white"
          >
            <img src="/image/logo_bgx.png" alt="AI" className="w-8 h-8 object-contain mb-0.5" />
            <span className="text-[10px] font-black text-[#3268f8] leading-none">AI</span>
          </button>

        </div>
      </div>

      {/* 상단 필터 및 생성 버튼 줄 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 6 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('all')}
            style={{
              backgroundColor: viewMode === 'all' ? '#3478ff' : '#eee',
              color: viewMode === 'all' ? 'white' : '#333',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 16,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 12,
              transition: 'all 0.2s'
            }}
          >
            전체 채팅방
          </button>
          <button
            onClick={() => setViewMode('mine')}
            style={{
              backgroundColor: viewMode === 'mine' ? '#3478ff' : '#eee',
              color: viewMode === 'mine' ? 'white' : '#333',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 16,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 12,
              transition: 'all 0.2s'
            }}
          >
            참여한 방
          </button>
        </div>

        {/* [옵션 3] 아웃라인 스타일 '방 만들기' 버튼 */}
        <button
          onClick={handleCreateRoom}
          onMouseEnter={() => setIsCreateHovered(true)}
          onMouseLeave={() => setIsCreateHovered(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: isCreateHovered ? '#3478ff' : 'white', // 호버 시 파란색 배경
            color: isCreateHovered ? 'white' : '#3478ff',           // 호버 시 흰색 글자
            border: '1.5px solid #3478ff',                         // 블루 테두리
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '800',
            transition: 'all 0.2s ease',
            boxShadow: isCreateHovered ? '0 4px 10px rgba(52, 120, 255, 0.2)' : 'none',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 0 }}>+</span>
          방 만들기
        </button>
      </div>

      {/* 채팅방 리스트 영역 */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {(viewMode === 'all' ? rooms : rooms.filter((room) => myRoomIds.includes(room.id))).map((room) => {
          const isHovered = hoveredRoomId === room.id;
          return (
            <li
              key={room.id}
              onMouseEnter={() => setHoveredRoomId(room.id)}
              onMouseLeave={() => setHoveredRoomId(null)}
              style={{
                position: 'relative',
                padding: 12,
                border: `1px solid #ddd`,
                borderRadius: 10,
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: isHovered ? '#f0f0f0' : user?.id === room.creator_id ? '#eafff8ff' : 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <img
                src={room.room_image || DEFAULT_IMAGE_URL}
                alt="room"
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: `1px solid #ddd` }}
              />

              <Link href={`/chat/${room.id}`} style={{ textDecoration: 'none', color: '#333', flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold', fontSize: 15, wordBreak: 'break-word' }}>{room.room_name}</span>
                  {room.room_description && (
                    <span style={{ fontSize: 12, color: '#777', marginTop: 3, marginBottom: '7px', wordBreak: 'break-word' }}>
                      {room.room_description}
                    </span>
                  )}
                </div>
              </Link>

              <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 11, color: '#999', userSelect: 'none' }}>
                {room.created_at ? new Date(room.created_at).toLocaleDateString() : ''}
              </div>

              {user?.id === room.creator_id && (
                <button
                  onClick={() => handleDeleteRoom(room.id, room.creator_id)}
                  style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'transparent', color: 'gray', border: '1px solid gray', padding: '2px 6px', borderRadius: '50%', fontSize: 12, cursor: 'pointer', lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChatRoomListPage;