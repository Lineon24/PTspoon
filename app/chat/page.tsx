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

const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png'; // public 폴더에 있는 이미지 경로

const ChatRoomListPage = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [user, setUser] = useState<any>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null); // hover 상태 관리
  const router = useRouter();

  // 사용자 정보 및 채팅방 목록 불러오기
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error('사용자 정보 가져오기 오류:', userError);
      }
      setUser(user);

      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) {
        console.error('채팅방 목록 가져오기 오류:', roomsError);
      } else {
        setRooms(roomsData || []);
      }
    };

    fetchData();
  }, []);

  // 채팅방 생성
  const handleCreateRoom = async () => {
    if (!user) {
      alert('로그인해야 채팅방을 만들 수 있습니다.');
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

  // 채팅방 삭제
  const handleDeleteRoom = async (roomId: string, creatorId: string) => {
    if (!user || user.id !== creatorId) {
      alert('본인이 만든 채팅방만 삭제할 수 있습니다.');
      return;
    }

    if (!window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) return;

    const { error } = await supabase.from('chat_rooms').delete().eq('id', roomId);
    if (error) {
      alert('채팅방 삭제 중 오류가 발생했습니다.');
      console.error(error);
      return;
    }

    setRooms((prev) => prev.filter((room) => room.id !== roomId));
    alert('채팅방이 삭제되었습니다.');
  };

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 540,
        margin: '0 auto',
        width: '100%',
        backgroundColor: '#f6faff',
        minHeight: '100vh',
      }}
    >
      <HeaderWithBack title="전체 채팅방 목록" backTF={false} />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 'bold' }}>전체 채팅방 목록</h2>
        <button
          onClick={handleCreateRoom}
          style={{
            backgroundColor: '#3478ff',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          내 채팅방 만들기
        </button>
      </div>

      <hr />
      <br />

      <ul style={{ listStyle: 'none', padding: 0 }}>
    {rooms.map((room) => {
      const isHovered = hoveredRoomId === room.id;
      return (
        <li
          key={room.id}
          onMouseEnter={() => setHoveredRoomId(room.id)}
          onMouseLeave={() => setHoveredRoomId(null)}
          style={{
            position: 'relative',
            padding: 14,
            border: `1px solid #ddd`,
            borderRadius: 10,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor:
              isHovered
              ? '#f0f0f0' // 마우스 올렸을 때는 항상 이 색
              : user?.id === room.creator_id
              ? '#eafff8ff' // 내가 만든 방이면 기본 배경색을 진하게
              : 'white',  // 기본은 흰색
            cursor: isHovered ? 'pointer' : 'default',
            transition: 'border-color 0.3s',
          }}
        >
          {/* 방 이미지 (없을 경우 기본 이미지 사용) */}
          <img
            src={room.room_image || DEFAULT_IMAGE_URL}
            alt={`${room.room_name} 대표 이미지`}
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              objectFit: 'cover', // 크기에 맞게 축소/자르기
              flexShrink: 0,
              border: `1px solid #ddd`, // 이미지 테두리도 동일하게 변경
              transition: 'border-color 0.3s',
            }}
          />

          {/* 방 이름 링크 */}
          <Link
            href={`/chat/${room.id}`}
            style={{
              textDecoration: 'none',
              color: '#333',
              flexGrow: 1,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>{room.room_name}</span>
              {room.room_description && (
                <span style={{ fontSize: 13, color: '#777', marginTop: 4 }}>
                  {room.room_description}
                </span>
              )}
            </div>
          </Link>

          {/* 만든 시간 */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              fontSize: 12,
              color: '#999',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {room.created_at ? new Date(room.created_at).toLocaleDateString() : ''}
          </div>

          {/* 삭제 버튼 (본인이 만든 방만 표시) */}
          {user?.id === room.creator_id && (
            <button
              onClick={() => handleDeleteRoom(room.id, room.creator_id)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'transparent',
                color: 'gray',
                border: '1px solid gray',
                padding: '2px 6px',
                borderRadius: '50%',
                fontSize: 14,
                cursor: 'pointer',
                lineHeight: 1,
                userSelect: 'none',
              }}
              aria-label="삭제"
              title="삭제"
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