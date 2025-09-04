// 상단바 출력 부분으로 페이지에 따라 매개변수 값을 넣어주시면 됩니다. 그리고 임포트 시켜 사용해주세요
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import { UtensilsCrossed, SquarePen } from 'lucide-react';
interface Profile { // 프로필에서 사용할 테이블 속성들
  id: string;
  nickname: string;
}

const iconList = [UtensilsCrossed, SquarePen]; // 아이콘 리스트들 상단바에 추가할 아이콘은 여기에 추가

{/*매개변수로 타이틀, 아이콘 모양 번호(iconList 인덱스), 아이콘 색깔, 이전 버튼 추가 설정를 받음 */}
export default function HeaderWithBack({ title, iconIndex, iconColor, backTF, buttonCustomName, buttonCustomPath, buttonCustomicon, buttonCustomiconColor}: 
  { title: string; iconIndex?: number; backTF: boolean; iconColor?: string | 'black'; 
    buttonCustomName?: string; buttonCustomPath?: string; buttonCustomicon?: number; buttonCustomiconColor?: string | 'black';
  }) {
  const IconComponent = iconIndex !== undefined ? iconList[iconIndex] : null; // 아이콘 인덱스에 아무값도 안넣었다면 널 값을 넣음
  const ButtonIconComponent = buttonCustomicon !== undefined ? iconList[buttonCustomicon] : null; // 아이콘 인덱스에 아무값도 안넣었다면 널 값을 넣음
  const router = useRouter(); 
  const pathname = usePathname();

  const handleGoBack = () => {
    const parentPath = pathname.split('/').slice(0, -1).join('/') || '/';
    router.replace(parentPath);
  }; // 이전 페이지로 돌아가기 위한 함수

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  
    //  로그인 상태 확인
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
  
    //  로그아웃 함수
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
      position: 'fixed', // 상단바 고정
      top: 0,
      left: 0, 
      width: '100%', // 전체 너비 차지
      right: 0,
      maxWidth: 540,
      margin: '0 auto',
      zIndex: 10 // 다른 요소 위에 오도록 z-index 설정
    }}>
      {backTF ? ( // backTF의 인자값에 따라 <- 버튼 출력 여부 부분
      
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
      {IconComponent != null ? ( // 인자값으로 아이콘 인덱스 값을 받으면 아이콘 출력
      <div style={{ color: iconColor, marginRight: '10px' }}><IconComponent/></div>
      ): null}

      <h1 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0' }}>
        {title}
      </h1>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>

          {buttonCustomName != null ? (
            <div>
             <button
              style={{
                display: 'flex',
                background: '#414de4',
                color: '#fff',
                border: 'none',
                borderRadius: 9,
                fontWeight: 600,
                fontSize: 14,
                padding: '6px 15px',
                cursor: 'pointer',
                alignItems: 'center', // 세로 중앙 정렬
                gap: '0px', // 아이콘과 텍스트 사이 간격
              }}
              onClick={() => router.push(`${buttonCustomPath}`)}
            >
              {ButtonIconComponent != null ? ( // 인자값으로 아이콘 인덱스 값을 받으면 아이콘 출력
              <div style={{ color: buttonCustomiconColor, marginRight: '10px' }}><ButtonIconComponent/></div>): null}
              {buttonCustomName}
            </button>
            </div>
          ) : (
          user ? ( // 로그인 여부에 따라 로그인 버튼 혹은 로그아웃 버튼이 보임
            <>
              <span style={{ fontWeight: 600, color: '#414de4', fontSize: 14 }}>
                {profile ? `${profile.nickname} 님` : user.name}
              </span>
              <button
                style={{
                  background: '#eef2fa',
                  border: 'none',
                  borderRadius: 9,
                  fontSize: 12,
                  padding: '5px 14px',
                  color: '#3878ff',
                  cursor: 'pointer',
                  marginLeft: 0
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
                fontSize: 12,
                padding: '5px 14px',
                cursor: 'pointer'
              }}
              onClick={() => router.push('/login')}
            >
              로그인
            </button>
          ))
          }
          
        </div>
    </div>
  );
}