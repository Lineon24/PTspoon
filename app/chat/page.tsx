'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';

interface ChatRoom {
  id: string;
  room_name: string;
  creator_id: string;
}

const ChatRoomListPage = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // 1. 사용자 정보 및 채팅방 목록 불러오기
  useEffect(() => {
    const fetchData = async () => {
      // 로그인 사용자 정보
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error('사용자 정보 가져오기 오류:', userError);
      }
      setUser(user);

      // 채팅방 목록
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

  // 2. 채팅방 생성 버튼 클릭
  const handleCreateRoom = async () => {
    if (!user) {
      alert('로그인해야 채팅방을 만들 수 있습니다.');
      return;
    }

    // 이미 생성한 방 있는지 확인
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

  // 3. 채팅방 삭제
  const handleDeleteRoom = async (roomId: string, creatorId: string) => {
    if (!user || user.id !== creatorId) {
      alert('본인이 만든 채팅방만 삭제할 수 있습니다.');
      return;
    }

    if (!window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) {
      return;
    }

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
        {rooms.map((room) => (
          <li
            key={room.id}
            style={{
              padding: 15,
              border: '1px solid #ddd',
              borderRadius: 10,
              marginBottom: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Link
              href={`/chat/${room.id}`}
              style={{
                textDecoration: 'none',
                color: '#333',
                flexGrow: 1,
                fontWeight: '500',
              }}
            >
              {room.room_name}
            </Link>

            {user?.id === room.creator_id && (
              <button
                onClick={() => handleDeleteRoom(room.id, room.creator_id)}
                style={{
                  marginLeft: 10,
                  backgroundColor: 'transparent',
                  color: 'gray',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '50%',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
                aria-label="삭제"
                title="삭제"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatRoomListPage;