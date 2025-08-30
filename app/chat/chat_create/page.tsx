'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import HeaderWithBack from '@/components/HeaderWithBack';

const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png'; // public 폴더에 있는 기본 이미지 경로

const CreateRoomPage = () => {
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomImageFile, setRoomImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null>(null);
  const [loading, setLoading] = useState(true); // 로그인 여부 체크 상태
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ 페이지 진입 시 로그인 여부 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login'); // 로그인 안되어 있으면 로그인 페이지로
      } else {
        setUser(user);
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRoomImageFile(file);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const newUrl = URL.createObjectURL(file);
      setPreviewUrl(newUrl);
    }
    e.target.value = '';
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCreate = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (!roomName.trim()) {
      alert('채팅방 이름을 입력해주세요.');
      return;
    }

    let imageUrl = DEFAULT_IMAGE_URL;

    if (roomImageFile) {
      const fileExt = roomImageFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `room-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('room-images')
        .upload(filePath, roomImageFile, { upsert: false });

      if (uploadError) {
        alert('이미지 업로드 실패: ' + uploadError.message);
        return;
      }

      const { data } = supabase.storage.from('room-images').getPublicUrl(filePath);
      imageUrl = data.publicUrl;
    }

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

  // ✅ 로그인 확인 중 로딩 화면
  if (loading) {
    return <p style={{ textAlign: 'center', marginTop: 50 }}>로그인 상태 확인 중...</p>;
  }

return (
  <div style={{ padding: 20, maxWidth: 540, margin: '0 auto' }}>
    <HeaderWithBack title="채팅방 만들기" backTF={true} />

    {/* ✅ 업로드 버튼을 가장 위 중앙에 배치 */}
    <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
      {/* 숨겨진 파일 input */}
      <div style={{ display: 'none' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
      </div>

      {/* 이미지 업로드 클릭 영역 */}
      <div
        onClick={handleClickUpload}
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%', // 동그랗게 하고 싶으면
          border: '2px dashed #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: '#fafafa',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007bff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ccc';
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="preview"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ fontSize: 32, color: '#aaa' }}>+</div>
        )}
      </div>
    </div>

    {/* 입력 폼 */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        채팅방 이름
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="채팅방 이름(필수)"
          maxLength={30}
          style={{
            width: '100%',
            padding: '10px 5px',
            border: 'none',
            borderBottom: '2px solid #ccc', // ✅ 밑줄만
            outline: 'none', // 클릭했을 때 파란 테두리 제거
            fontSize: '16px',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderBottom = '2px solid #007bff')}
          onBlur={(e) => (e.currentTarget.style.borderBottom = '2px solid #ccc')}
        />
        <div style={{ textAlign: 'right', fontSize: 13, color: '#888' }}>{roomName.length}/30 </div>
      </label>
      <br />
      <label>
        채팅방 설명
        <textarea
          value={roomDescription}
          onChange={(e) => setRoomDescription(e.target.value)}
          placeholder="이 채팅방은 어떤 곳인가요?"
          maxLength={200}
          rows={3}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ccc',
            outline: 'none',
            fontSize: '16px',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.border = '1px solid #007bff')}
          onBlur={(e) => (e.currentTarget.style.border = '1px solid #ccc')}
        />
        <div style={{ textAlign: 'right', fontSize: 13, color: '#888' }}>{roomDescription.length}/200 </div>
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
          fontWeight: 'bold',
        }}
      >
        채팅방 만들기
      </button>
    </div>
  </div>
);
};

export default CreateRoomPage;
