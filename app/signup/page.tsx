'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. 회원 생성
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // 2. 닉네임 저장 (회원 생성 성공 시)
    if (data.user) {
      await supabase
        .from('profiles')
        .insert({ id: data.user.id, nickname });
      alert('회원가입 성공! 로그인해 주세요.');
      router.replace('/login');
    }
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
      <HeaderWithBack title="PTU 맛집 찾기" iconColor='#3878ff' iconIndex={0} backTF= {true} /> {/* 상단 고정 헤더 */}
      <h2 style={{ marginBottom: 22, marginTop:20 }}>회원가입</h2>
      <form onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="닉네임"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          style={inputStyle}
          required
        />
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
        <button type="submit" style={buttonStyle}>회원가입</button>
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      </form>
      <button
        style={{ marginTop: 20, background: 'none', border: 'none', color: '#3766dd', cursor: 'pointer' }}
        onClick={() => router.push('/login')}
      >
        이미 회원이신가요? 로그인
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
