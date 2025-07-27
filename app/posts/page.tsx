// app/posts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PostList from '@/components/PostList'; // PostList 컴포넌트 임포트

// Post, Comment, Profile 인터페이스는 동일하게 유지
interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
}

interface Profile {
  id: string;
  nickname: string;
}

export default function AllPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  // 1. 사용자 로그인 상태 및 프로필 정보 불러오기
  useEffect(() => {
    async function getUserProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', userData.user.id)
          .single();
        if (profileData) {
          setProfile({ id: userData.user.id, ...profileData });
        } else {
          setProfile({ id: userData.user.id, nickname: '게스트' });
        }
      }
      setLoading(false);
    }
    getUserProfile();
  }, []);

  // 2. 모든 게시글 목록 불러오기 및 실시간 구독
  useEffect(() => {
    const fetchAllPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('모든 게시글 불러오기 오류:', error);
      } else {
        setPosts(data || []);
      }
    };
    fetchAllPosts();

    const postsChannel = supabase
      .channel('public:posts_all_page') // 채널 이름 변경 (충돌 방지)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((prev) => [payload.new as Post, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, []);

  // 3. 로그아웃 핸들러
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#555' }}>로딩중...</div>;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      {/* 상단바 */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, width: '100%', height: 'auto',
        padding: '10px 20px', background: '#fff', borderBottom: '1px solid #e6eaf2',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 3, boxSizing: 'border-box', maxWidth: 540, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')} // 뒤로가기 버튼 기능
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
          <span style={{ fontWeight: 'bold', color: '#1d1d1f', fontSize: 18 }}>전체 게시글</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {profile ? (
            <>
              <span style={{ color: '#3670ff', fontWeight: '500', fontSize: 14 }}>{profile.nickname}</span>
              <Link href="/posts/write">
                <button
                  style={{ background: '#e0f0ff', border: 'none', borderRadius: 7, color: '#3770f8', fontWeight: 600, fontSize: 12, padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  글쓰기
                </button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <button style={{ background: '#e0f0ff', border: 'none', borderRadius: 7, color: '#3770f8', fontWeight: 600, fontSize: 12, padding: '6px 14px', cursor: 'pointer' }}>
                로그인
              </button>
            </Link>
          )}
        </div>
      </div>
      <div style={{ height: '10px' }}></div>

      {/* 게시글 목록 (PostList 컴포넌트를 사용하여 렌더링) */}
      <div style={{ paddingTop: '0px' }}>
        <PostList posts={posts} profile={profile} />
      </div>
    </div>
  );
}