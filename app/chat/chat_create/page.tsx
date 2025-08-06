'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import HeaderWithBack from '@/components/HeaderWithBack';

const CreateRoomPage = () => {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null); // 이미지 파일
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRoomImageFile(e.target.files[0]);
    }
  };

  const handleCreate = async () => {
    if (!user) {
      alert('로그인 필요');
      return;
    }

    if (!roomName.trim()) {
      alert('채팅방 이름을 입력해주세요.');
      return;
    }

    let imageUrl = '';

    // ✅ 1. 이미지 업로드
    if (roomImageFile) {
      const fileExt = roomImageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `room-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(filePath, roomImageFile);

      if (uploadError) {
        alert('이미지 업로드 실패: ' + uploadError.message);
        return;
      }

      // ✅ 2. public URL 얻기
      const { data } = supabase.storage.from('room-images').getPublicUrl(filePath);
      imageUrl = data.publicUrl;
    }

    // ✅ 3. DB에 채팅방 정보 저장
    const { error } = await supabase.from('chat_rooms').insert({
      room_name: roomName,
      room_description: roomDescription,
      room_image: imageUrl,
      creator_id: user.id,
    });

    if (error) {
      alert('채팅방 생성 오류: ' + error.message);
      return;
    }

    alert('채팅방이 생성되었습니다!');
    router.push('/chat');
  };

  return (
    <div style={{ padding: 20, maxWidth: 540, margin: '0 auto' }}>
      <HeaderWithBack title="채팅방 만들기" backTF={false} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          채팅방 이름
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="예: 성환이 뒷담화방"
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          채팅방 설명
          <textarea
            value={roomDescription}
            onChange={(e) => setRoomDescription(e.target.value)}
            placeholder="이 채팅방은 어떤 곳인가요?"
            rows={3}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ccc' }}
          />
        </label>

        <label>
          대표 이미지 선택
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ marginTop: 8 }}
          />
        </label>

        <button
          onClick={handleCreate}
          style={{
            backgroundColor: '#3478ff',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          채팅방 만들기
        </button>
      </div>
    </div>
  );
};

export default CreateRoomPage;