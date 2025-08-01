'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

const ChatRoomPage = () => {
  const params = useParams();
  const roomId = params.room_id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!roomId) return;

    // 1. 로그인한 사용자 정보 가져오기
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    // 2. 초기 메시지 목록 불러오기
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId) // 특정 채팅방 메시지만 불러오기
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
      }
    };

    fetchUser();
    fetchMessages();

    // 3. 실시간 구독 설정
    const subscription = supabase
      .channel(`room_${roomId}`) // 채널을 채팅방 ID별로 구분
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}` // 특정 채팅방 메시지만 구독
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prevMessages) => [...prevMessages, newMsg]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !roomId) return;

    await supabase.from('chat_messages').insert({
      content: newMessage,
      user_id: user.id,
      room_id: roomId, // 메시지에 채팅방 ID 추가
    });

    setNewMessage('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>채팅방: {roomId}</h1>
      {!user && <p>로그인해야 메시지를 보낼 수 있습니다.</p>}
      
      <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'scroll', padding: '10px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '10px' }}>
            <strong>{msg.user_id === user?.id ? '나' : msg.user_id.substring(0, 8)}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지를 입력하세요"
          disabled={!user}
          style={{ width: 'calc(100% - 80px)', padding: '8px' }}
        />
        <button type="submit" disabled={!user} style={{ padding: '8px', marginLeft: '5px' }}>전송</button>
      </form>
    </div>
  );
};

export default ChatRoomPage;