// 모든 게시글을 표현하는 페이지 입니다. 컴포넌트를 활용했기 때문에 게시글 출력 부분은 PostList 컴포넌트 참고 바람
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';
import PostList from '@/components/PostList'; // PostList 컴포넌트 임포트

// Post, Comment, Profile 인터페이스는 동일하게 유지
interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  image_urls: string[];
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

  // 사용자 로그인 상태 및 프로필 정보 불러오기
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
  }, []); // 한번만 실행

  // 모든 게시글 목록 불러오기 및 실시간 구독
  useEffect(() => {
    const fetchAllPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*') // 필터링 없이 모든
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('모든 게시글 불러오기 오류:', error);
      } else {
        setPosts(data || []);
      }
    };
    fetchAllPosts(); // 함수 실행

    const postsChannel = supabase // 실시간으로 게시글 받는 부분
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

    const handlePostDeleted = (deletedPostId: string) => { // 실시간 삭제 적용 부분
      setPosts(currentPosts =>
      currentPosts.filter(post => post.id !== deletedPostId)
    );
  };

  if (loading) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#555' }}>로딩중...</div>; // 게시글 로딩 전이면 출력

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
    <HeaderWithBack title="전체 게시글" backTF= {true} 
      buttonCustomName='게시글 작성' buttonCustomPath='/posts/write' buttonCustomicon={1} /> {/* 상단 고정 헤더 */}
      <div style={{ height: '10px' }}></div>

      {/* 게시글 목록 (PostList 컴포넌트를 사용하여 렌더링) */}
      <div style={{ paddingTop: '0px' }}>
        <PostList posts={posts} profile={profile} onPostDeleted={handlePostDeleted} />
      </div>
    </div>
  );
}