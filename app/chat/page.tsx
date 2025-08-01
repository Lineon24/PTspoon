'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

    if (chatdata != null)  {
      alert('당신은 이미 생성한 채팅방이 있습니다.');
      return;
    }

    // 새 채팅방 생성
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        room_name: `${user.email}의 채팅방`,
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

  return (
    <div style={{ padding: '20px' }}>
      <h1>전체 채팅방 목록</h1>
      <button onClick={handleCreateRoom} style={{ marginBottom: '20px' }}>
        내 채팅방 만들기
      </button>

      <ul>
        {rooms.map((room) => (
          <li key={room.id} style={{ marginBottom: '10px' }}>
          <Link href={`/chat/${room.id}`}>
           <span>{room.room_name}</span>
          </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatRoomListPage;