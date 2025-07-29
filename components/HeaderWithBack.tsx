'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import { UtensilsCrossed } from 'lucide-react';
interface Profile {
  id: string;
  nickname: string;
  // ...다른 정보 추가 가능
}

const iconList = [UtensilsCrossed];


export default function HeaderWithBack({ title, iconIndex, iconColor, backTF}: { title: string; iconIndex?: number; backTF: boolean; iconColor?: string | 'black'; }) {
  const IconComponent = iconIndex !== undefined ? iconList[iconIndex] : null;
  const router = useRouter();
  const pathname = usePathname();

  const handleGoBack = () => {
    const parentPath = pathname.split('/').slice(0, -1).join('/') || '/';
    router.replace(parentPath);
  };

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
    // 1. 로그인 상태 확인
    useEffect(() => {
      supabase.auth.getUser().then(async (res) => {
        if (res.data.user) {
          setUser(res.data.user);
          // (닉네임은 profiles 테이블에서 가져온다고 가정)
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
  
    // 2. 로그아웃 함수
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
      padding: '10px 20px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#ffffff',
      position: 'fixed', // sticky 대신 fixed 사용
      top: 0,
      left: 0, // 왼쪽 정렬
      width: '100%', // 전체 너비 차지
      right: 0,
      maxWidth: 540,
      margin: '0 auto',
      zIndex: 10 // 다른 요소 위에 오도록 z-index 설정 (TabBar의 2000보다는 낮게)
    }}>
      {backTF ? (
      
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
          padding: '0'
        }}
      >
        ←
      </button>
      ): null}
      {IconComponent != null ? (
      <div style={{ color: iconColor, marginRight: '10px' }}><IconComponent/></div>
      ): null}

      <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>
        {title}
      </h1>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontWeight: 600, color: '#3264e8', fontSize: 15 }}>
                {profile ? `${profile.nickname} 님` : user.email}
              </span>
              <button
                style={{
                  background: '#eef2fa',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 14,
                  padding: '5px 14px',
                  color: '#3878ff',
                  cursor: 'pointer',
                  marginLeft: 6
                }}
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              style={{
                background: '#3878ff',
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontWeight: 600,
                fontSize: 15,
                padding: '7px 18px',
                cursor: 'pointer'
              }}
              onClick={() => router.push('/login')}
            >
              로그인
            </button>
          )}
        </div>
    </div>
  );
}