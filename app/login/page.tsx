// 로그인 버튼 클릭 시 나오는 페이지 입니다.
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/') // 로그인된 경우 홈으로 이동
      }
    }

    checkLogin()
  }, [])
  
  const handleKakaoLogin = async () => { // 카카오톡 로그인/회원가입 부분
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: process.env.NEXT_PUBLIC_REDIRECT_URL,
      },
    });

  if (error) {
    setError('카카오 로그인 중 오류가 발생했습니다.');
  }
 }; 
    const kakaoButtonStyle = {
  width: '100%',
  padding: 13,
  background: '#FEE500',
  color: '#3C1E1E',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 16,
  marginTop: 13,
  cursor: 'pointer' as 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ // 수파베이스 인증 로그인 부분
      email,
      password,
    });

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      return;
    }
    router.replace('/');
  };

  return (
      <main style={{
      maxWidth: 540,
      margin: '0 auto',
      padding: 24,
      fontFamily: 'Pretendard, Noto Sans KR, sans-serif',
      background: '#f7f8fa',
      minHeight: '100vh'
    }}>
      <HeaderWithBack title="피티스푼" image="/image/logo_bgx.png" backTF= {true} /> {/* 상단 고정 헤더 */}
      <h2 style={{ marginBottom:20, marginTop:20 }}>로그인</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        <button type="submit" style={buttonStyle}>로그인</button>
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
        <button
          type="button"
          onClick={handleKakaoLogin}
          style={kakaoButtonStyle}
          >
        <img src="/image/kakaotalk_sharing_btn_medium.png"
          style={{ height: 30, marginRight: 8 }}
          alt="카카오 로그인"
        />
          카카오톡으로 가입 / 로그인
        </button>
      </form>
      <button
        style={{ marginTop: 20, background: 'none', border: 'none', color: '#3478ff', cursor: 'pointer' }}
        onClick={() => router.push('/signup')}
      >
        아직 회원이 아니신가요? 회원가입
      </button>
    </main>
  );
}

const inputStyle = {
  width: '100%',
  padding: 12,
  margin: '9px 0',
  borderRadius: 8,
  border: '1.2px solid #dbe3ee',
  fontSize: 16,
};
const buttonStyle = {
  width: '100%',
  padding: 13,
  background: '#3478ff',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 17,
  marginTop: 13,
  cursor: 'pointer' as 'pointer'
};
