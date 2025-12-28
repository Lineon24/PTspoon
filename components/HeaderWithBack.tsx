'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import { UtensilsCrossed, SquarePen } from 'lucide-react';

interface Profile {
  id: string;
  nickname: string;
}

const iconList = [UtensilsCrossed, SquarePen];

export default function HeaderWithBack({ 
  title, iconIndex, iconColor, backTF, 
  buttonCustomName, buttonCustomPath, buttonCustomicon, buttonCustomiconColor, image 
}: { 
  title: string; iconIndex?: number; backTF: boolean; iconColor?: string | 'black'; 
  buttonCustomName?: string; buttonCustomPath?: string; buttonCustomicon?: number; 
  buttonCustomiconColor?: string | 'black', image?: string;
}) {
  const IconComponent = iconIndex !== undefined ? iconList[iconIndex] : null;
  const ButtonIconComponent = buttonCustomicon !== undefined ? iconList[buttonCustomicon] : null;
  const router = useRouter(); 
  const pathname = usePathname();

  const handleGoBack = () => {
    const parentPath = pathname.split('/').slice(0, -1).join('/') || '/';
    router.replace(parentPath);
  };

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(async (res) => {
      if (res.data.user) {
        setUser(res.data.user);
        const { data } = await supabase
          .from('profiles')
          .select('id, nickname')
          .eq('id', res.data.user.id)
          .single();
        if (data) setProfile(data);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.replace('/login');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '7px 15px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#ffffff',
      position: 'fixed',
      top: 0,
      left: 0, 
      width: '100%',
      right: 0,
      maxWidth: 540,
      margin: '0 auto',
      zIndex: 10,
      height: '44px', // 헤더 높이를 고정하여 늘어남 방지
      boxSizing: 'border-box'
    }}>
      {backTF && (
        <button
          onClick={handleGoBack}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            marginRight: '10px',
            color: '#333',
            lineHeight: '1',
            padding: '0',
            flexShrink: 0 // 버튼 크기 유지
          }}
        >
          ←
        </button>
      )}

      {image && (
        <img 
          src={image} 
          alt={title} 
          style={{ 
            height: '24px', 
            marginRight: '10px', 
            objectFit: 'contain',
            flexShrink: 0 
          }} 
        />
      )}

      {IconComponent && (
        <div style={{ color: iconColor, marginRight: '10px', flexShrink: 0 }}>
          <IconComponent size={20} />
        </div>
      )}

      {/* ⭐ 제목 부분: 말줄임표 처리 적용 */}
      <h1 style={{ 
        fontSize: '15px', 
        fontWeight: 'bold', 
        margin: '0',
        whiteSpace: 'nowrap',      // 줄바꿈 금지
        overflow: 'hidden',         // 넘치는 텍스트 숨김
        textOverflow: 'ellipsis',   // ... 표시
        flex: 1,                    // 남은 공간 모두 차지
        minWidth: 0                 // flex 박스 내에서 요소가 줄어들 수 있게 허용
      }}>
        {title}
      </h1>

      <div style={{ 
        marginLeft: '10px', // 제목과의 최소 간격
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        flexShrink: 0 // 우측 버튼 영역 크기 유지
      }}>
        {buttonCustomName ? (
          <button
            style={{
              display: 'flex',
              background: '#414de4',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 13,
              padding: '5px 12px',
              cursor: 'pointer',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={() => router.push(`${buttonCustomPath}`)}
          >
            {ButtonIconComponent && (
              <div style={{ color: buttonCustomiconColor }}>
                <ButtonIconComponent size={16} />
              </div>
            )}
            {buttonCustomName}
          </button>
        ) : (
          user ? (
            <>
              <span style={{ fontWeight: 600, color: '#414de4', fontSize: 13, whiteSpace: 'nowrap' }}>
                {profile ? `${profile.nickname} 님` : '사용자'}
              </span>
              <button
                style={{
                  background: '#eef2fa',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 11,
                  padding: '4px 10px',
                  color: '#3878ff',
                  cursor: 'pointer',
                }}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              style={{
                background: '#414de4',
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontWeight: 600,
                fontSize: 11,
                padding: '4px 10px',
                cursor: 'pointer'
              }}
              onClick={() => router.push('/login')}
            >
              로그인
            </button>
          )
        )}
      </div>
    </div>
  );
}