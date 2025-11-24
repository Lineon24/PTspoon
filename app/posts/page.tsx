'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import HeaderWithBack from '@/components/HeaderWithBack';
import PostList from '@/components/PostList';
import { useInView } from 'react-intersection-observer'; 

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

const POSTS_PER_PAGE = 10; // 안정성을 위해 10개로 증가

export default function AllPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // [핵심] 실시간으로 추가된 글의 개수를 세는 변수 (DB 요청 시 offset 보정용)
  const newPostCount = useRef(0);

  const { ref, inView } = useInView({
    threshold: 0,
  });

  // 1. 프로필 가져오기
  useEffect(() => {
    async function getUserProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', userData.user.id)
          .single();
        setProfile(profileData ? { id: userData.user.id, ...profileData } : { id: userData.user.id, nickname: '게스트' });
      }
    }
    getUserProfile();
  }, []);

  // 2. 게시글 불러오기 (중복 제거 & 정렬 로직 강화)
  const fetchPosts = useCallback(async (pageIndex: number) => {
    if (pageIndex > 0 && loading) return; // 로딩 중 중복 실행 방지
    setLoading(true);

    // [핵심 보정] 실시간으로 들어온 글 개수만큼 건너뛰고 가져와야 중복을 피함
    const offset = newPostCount.current;
    const from = pageIndex * POSTS_PER_PAGE + offset;
    const to = from + POSTS_PER_PAGE - 1;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data && data.length > 0) {
        setPosts((prev) => {
          // [필살기] Map을 이용한 완벽한 중복 제거 및 정렬
          const allPosts = [...prev, ...data];
          const uniqueMap = new Map();
          
          allPosts.forEach(post => {
            // ID를 키로 사용하여 무조건 하나만 남김 (기존 것 덮어쓰기)
            uniqueMap.set(post.id, post);
          });

          // 다시 배열로 변환 후 날짜순 정렬 (순서 꼬임 방지)
          const sortedPosts = Array.from(uniqueMap.values()).sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

          return sortedPosts as Post[];
        });

        if (data.length < POSTS_PER_PAGE) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]); // 의존성

  // 3. 초기 로딩
  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // 4. 스크롤 감지
  useEffect(() => {
    if (inView && !loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [inView, loading, hasMore, page, fetchPosts]);

  // 5. [실시간 구독] (여기도 중복 방지 로직 적용)
  useEffect(() => {
    const postsChannel = supabase
      .channel('public:posts_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Post;

          // [핵심] 새 글이 들어오면 카운트를 올려서 나중에 fetch할 때 밀어버림
          newPostCount.current += 1;

          setPosts((prev) => {
            // 여기도 똑같이 중복 체크 + 정렬
            const allPosts = [newPost, ...prev];
            const uniqueMap = new Map();
            allPosts.forEach(p => uniqueMap.set(p.id, p));
            
            return Array.from(uniqueMap.values()).sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            ) as Post[];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, []); // 빈 배열 유지

  // 삭제 핸들러
  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== deletedPostId));
    // 삭제 시 카운트 조정 (선택 사항이나 복잡도 줄이기 위해 생략 가능)
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <HeaderWithBack title="전체 게시글" backTF={true} 
        buttonCustomName='게시글 작성' buttonCustomPath='/posts/write' buttonCustomicon={1} />
      <div style={{ height: '10px' }}></div>

      <div style={{ paddingTop: '0px' }}>
        <PostList posts={posts} profile={profile} onPostDeleted={handlePostDeleted} />
        
        {hasMore && (
          <div ref={ref} style={{ height: '20px', margin: '20px 0', textAlign: 'center', color: '#999' }}>
            {loading ? '로딩중...' : ''}
          </div>
        )}
        
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#bbb' }}>
            모든 게시글을 다 봤어요! 🎉
          </div>
        )}
      </div>
    </div>
  );
}