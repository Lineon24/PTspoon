'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';

interface chat_rooms {
    id: string;
    room_name: string;
    creator_id: string;
}

const ChatRoomListPage = () => {
  const [rooms, setRooms] = useState<chat_rooms[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // 1. 로그인한 사용자 정보 가져오기
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    // 2. 채팅방 목록 불러오기
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setRooms(data);
      }
    };

    fetchUser();
    fetchRooms();
  }, []);

  // 3. 채팅방 생성 핸들러
  const handleCreateRoom = async () => {
    if (!user) {
      alert('로그인해야 채팅방을 만들 수 있습니다.');
      return;
    }

    // 이미 채팅방이 있는지 확인
    const { data : chatdata} = await supabase
      .from('chat_rooms')
      .select('creator_id')
      .eq('creator_id', user.id);

    if (chatdata && chatdata.length > 0)  {
      alert('당신은 이미 생성한 채팅방이 있습니다.');
      return;
    }

    // 새 채팅방 생성
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        room_name: `${user.nickname}의 채팅방`,
        creator_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('채팅방 생성 오류:', error);
      alert('채팅방 생성 중 오류가 발생했습니다.');
    } else {
      router.push(`/chat/${data.id}`); // 생성된 방으로 바로 이동
    }
  };

  // 채팅방 삭제 기능
  const handleDeleteRoom = async (roomId: string, creatorId: string) => {
    // 1. 현재 로그인한 사용자와 방을 만든 사람이 일치하는지 확인
    if (!user || user.id !== creatorId) {
      alert('본인이 만든 채팅방만 삭제할 수 있습니다.');
      return;
    }

    // 채팅방 삭제 시 확인 문구
    const confirmDelete = window.confirm('정말로 이 채팅방을 삭제하시겠습니까?');
    if (!confirmDelete) {
      return;
    }

    // 연동된 supabase에서 채팅방 삭제
    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.error('채팅방 삭제 오류:', error);
      alert('채팅방 삭제 중 오류가 발생했습니다.');
    } else {
      // 4. 삭제 성공 시, rooms 상태 업데이트
      setRooms(rooms.filter(room => room.id !== roomId));
      alert('채팅방이 삭제되었습니다.');
    }
  };


  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: 540, 
      margin: '0 auto',
      width: '100%',
      position: 'relative',
      
    }}>
      <HeaderWithBack title="전체 채팅방 목록" backTF= {true} /> {/* 상단 고정 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h1>전체 채팅방 목록</h1>
      <button 
        onClick={handleCreateRoom} 
        style={{ 
          backgroundColor: '#3478ff', 
          color: 'white', 
          border: 'none', 
          padding: '10px 15px', 
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        내 채팅방 만들기
      </button>
    </div>

<ul>
      {rooms.map((room) => (
        <li key={room.id} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href={`/chat/${room.id}`} style={{ flexGrow: 1 }}>
            <span>{room.room_name}</span>
          </Link>
          {user && user.id === room.creator_id && (
            <button onClick={() => handleDeleteRoom(room.id, room.creator_id)} style={{ marginLeft: '10px', backgroundColor: 'red', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px' }}>
              삭제
            </button>
          )}
        </li>
      ))}
    </ul>
  </div>
);
}

export default ChatRoomListPage;