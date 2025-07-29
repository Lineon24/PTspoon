'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import HeaderWithBack from '@/components/HeaderWithBack';
import PostList from '@/components/PostList'; // PostList 컴포넌트 임포트 경로 수정

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

export default function WritePostPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const router = useRouter();

  // 1. 사용자 로그인 및 프로필 불러오기 (동일)
  useEffect(() => {
    async function getUserProfile() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        console.error('사용자 정보 가져오기 오류:', userError);
        router.replace('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', userData.user.id)
        .single();

      if (profileError) {
        console.error('프로필 가져오기 오류:', profileError);
        setProfile({ id: userData.user.id, nickname: '알 수 없음' });
      } else if (profileData) {
        setProfile({ id: userData.user.id, ...profileData });
      } else {
        console.log('해당 ID의 프로필을 찾을 수 없습니다:', userData.user.id);
        setProfile({ id: userData.user.id, nickname: '게스트' });
      }
      setLoading(false);
    }
    getUserProfile();
  }, [router]);

  // 2. 내 게시글 목록 불러오기 및 실시간 구독
  useEffect(() => {
    if (!profile) return;

    const fetchMyPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profile.id) // ★ 내 게시글만 필터링
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('내 게시글 불러오기 오류:', error);
      } else {
        setPosts(data || []);
      }
    };
    fetchMyPosts();

    const channel = supabase
      .channel('my_posts_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Post;
          if (newPost.user_id === profile.id) {
            setPosts((prev) => [newPost, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]); // profile이 변경될 때마다 이 useEffect가 다시 실행

  // 3. 게시글 작성 핸들러
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newPostTitle.trim() || !newPostContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const { error } = await supabase.from('posts').insert([
      { 
        user_id: profile.id, 
        username: profile.nickname, 
        title: newPostTitle, 
        content: newPostContent 
      }
    ]);

    if (error) {
      console.error('게시글 작성 오류:', error);
      alert('게시글 작성에 실패했습니다.');
    } else {
      setNewPostTitle('');
      setNewPostContent('');
    }
  };

  // 4. 로그아웃 핸들러 (동일)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#555' }}>로딩중...</div>;
  if (!profile) return <div style={{ margin: 60, textAlign: 'center', fontSize: 18, color: '#ff0000' }}>프로필 정보 없음. 로그인 상태를 확인해주세요.</div>;

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <HeaderWithBack title="내 게시글" backTF= {true} /> {/* 상단 고정 헤더 */}
      <div style={{ height: '60px' }}></div>

      {/* 게시글 작성 폼 */}
      <form onSubmit={handleSubmitPost} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <input
          type="text" placeholder="게시글 제목을 입력하세요" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)}
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: 16 }}
        />
        <textarea
          placeholder="게시글 내용을 입력하세요" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} rows={7}
          style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical', fontSize: 15, lineHeight: 1.5 }}
        ></textarea>
        <button
          type="submit" style={{ padding: '12px 25px', borderRadius: '8px', border: 'none', background: '#007bff', color: 'white', fontSize: 16, fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s ease-in-out' }}
        >
          게시글 작성
        </button>
      </form>

      {/* 내 게시글 목록 (PostList 컴포넌트를 사용하여 렌더링) */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '20px', color: '#333' }}>나의 게시글 목록</h2>
        {/* PostList 컴포넌트에 게시글과 프로필 정보를 prop으로 전달 */}
        <PostList posts={posts} profile={profile} />
      </div>
    </div>
  );
}