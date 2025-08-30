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
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all');
  const [myRoomIds, setMyRoomIds] = useState<string[]>([]);
  const router = useRouter();

  // 사용자 정보 및 채팅방 목록 불러오기
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) console.error('사용자 정보 가져오기 오류:', userError);
      setUser(user);

      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (roomsError) {
        console.error('채팅방 목록 가져오기 오류:', roomsError);
        setRooms([]);
        return;
      }

      setRooms(roomsData || []);

      // 내가 메시지를 남긴 채팅방 id 목록 가져오기
      if (user) {
        const { data: myMsgs } = await supabase
          .from('messages')
          .select('room_id')
          .eq('user_id', user.id);

        // 중복 제거
        const ids = Array.from(new Set((myMsgs || []).map((msg: any) => msg.room_id)));
        setMyRoomIds(ids);
      }
    };

    fetchData();
  }, [user]);

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

  // 채팅방 삭제 + 버킷 이미지 삭제
  const handleDeleteRoom = async (roomId: string, creatorId: string) => {
    if (!user || user.id !== creatorId) {
      alert('본인이 만든 채팅방만 삭제할 수 있습니다.');
      return;
    }

    if (!window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) return;

    // 1. 삭제할 방 정보 가져오기 (이미지 경로 확인)
    const { data: roomData, error: fetchError } = await supabase
      .from('chat_rooms')
      .select('room_image')
      .eq('id', roomId)
      .single();

    if (fetchError) {
      console.error('채팅방 정보 가져오기 오류:', fetchError);
      return;
    }

    // 2. DB에서 방 삭제
    const { error: deleteError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (deleteError) {
      alert('채팅방 삭제 중 오류가 발생했습니다.');
      console.error(deleteError);
      return;
    }

    // 3. 버킷에서 이미지 삭제 (기본 이미지 제외)
    if (roomData?.room_image && !roomData.room_image.includes(DEFAULT_IMAGE_URL)) {
      try {
        const url = roomData.room_image;
        const parts = url.split('/room-images/'); // 버킷 이름 "room-images" 가정
        if (parts.length > 1) {
          const filePath = parts[1]; // 실제 파일 경로
          const { error: storageError } = await supabase
            .storage
            .from('room-images')
            .remove([filePath]);

          if (storageError) console.error('이미지 삭제 오류:', storageError);
          else console.log('이미지 삭제 완료:', filePath);
        }
      } catch (err) {
        console.error('이미지 삭제 처리 오류:', err);
      }
    }

    // 4. 프론트엔드 상태 업데이트
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

      {/* 슬라이드 토글 버튼 + 채팅방 만들기 버튼 한 줄에 배치 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setViewMode('all')}
            style={{
              backgroundColor: viewMode === 'all' ? '#3478ff' : '#eee',
              color: viewMode === 'all' ? 'white' : '#333',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 15,
              transition: 'background 0.2s',
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
              padding: '8px 16px',
              borderRadius: 20,
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 15,
              transition: 'background 0.2s',
            }}
          >
            참여한 방
          </button>
        </div>
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
            display: 'block'
          }}
        >
          내 채팅방 만들기
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >

      </div>

      {/* rooms 목록 필터링 */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {(viewMode === 'all'
          ? rooms
          : rooms.filter(room => myRoomIds.includes(room.id))
        ).map((room) => {
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
                    ? '#f0f0f0'
                    : user?.id === room.creator_id
                      ? '#eafff8ff'
                      : 'white',
                cursor: isHovered ? 'pointer' : 'default',
                transition: 'border-color 0.3s',
              }}
            >
              <img
                src={room.room_image || DEFAULT_IMAGE_URL}
                alt={`${room.room_name} 대표 이미지`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: `1px solid #ddd`,
                  transition: 'border-color 0.3s',
                }}
              />

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
                  {/* 최근 메시지 내용/이미지 관련 코드 삭제 */}
                </div>
              </Link>

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
