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

const POSTS_PER_PAGE = 10;

export default function AllPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true); // UI 표시용 로딩 상태
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // [수정 1] 로직 제어용 '진짜' 잠금장치 (Ref는 리렌더링을 유발하지 않음)
  const isFetching = useRef(false); 
  const newPostCount = useRef(0);

  const { ref, inView } = useInView({ threshold: 0 });

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

  // 2. 게시글 불러오기 (의존성 제거하여 안정성 확보)
  const fetchPosts = useCallback(async (pageIndex: number) => {
    // [수정 2] State 대신 Ref로 중복 실행 방지 (훨씬 빠르고 안전함)
    if (isFetching.current) return;
    
    isFetching.current = true; // 문 잠그기
    setLoading(true); // 화면에 로딩 표시

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
          // 중복 제거 및 정렬 로직 (Map 사용)
          const allPosts = pageIndex === 0 ? data : [...prev, ...data]; // 0페이지면 덮어쓰기, 아니면 이어붙이기
          const uniqueMap = new Map();
          
          // 기존 데이터가 있다면 맵에 넣기
          if (pageIndex > 0) {
              prev.forEach(p => uniqueMap.set(p.id, p));
          }
          // 새 데이터 맵에 넣기 (덮어쓰기)
          data.forEach(p => uniqueMap.set(p.id, p));

          return Array.from(uniqueMap.values()).sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ) as Post[];
        });

        if (data.length < POSTS_PER_PAGE) setHasMore(false);
      } else {
        // 데이터가 없으면
        if (pageIndex === 0) setPosts([]); // 첫 페이지인데 없으면 빈 배열
        setHasMore(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      isFetching.current = false; // 문 열기
      setLoading(false); // 로딩 표시 끄기
    }
  }, []); // [수정 3] 의존성 배열을 완전히 비워서 함수가 절대 변하지 않게 함

  // 3. 초기 실행 (딱 한 번만 실행됨 보장)
  useEffect(() => {
    fetchPosts(0);
  }, []); // fetchPosts가 변하지 않으므로 안전함

  // 4. 스크롤 감지
  useEffect(() => {
    if (inView && !isFetching.current && hasMore) { // Ref로 체크
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [inView, hasMore, page, fetchPosts]);

  // 5. 실시간 구독
  useEffect(() => {
    const postsChannel = supabase
      .channel('public:posts_realtime_fixed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Post;
          newPostCount.current += 1;
          
          setPosts((prev) => {
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
  }, []);

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== deletedPostId));
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <HeaderWithBack title="전체 게시글" backTF={true} 
        buttonCustomName='게시글 작성' buttonCustomPath='/posts/write' buttonCustomicon={1} />
      <div style={{ height: '10px' }}></div>

      <div style={{ paddingTop: '0px' }}>
        <PostList posts={posts} profile={profile} onPostDeleted={handlePostDeleted} />
        
        {/* 로딩 중이거나 데이터가 더 있을 때 감지용 div 표시 */}
        {hasMore && (
          <div ref={ref} style={{ height: '20px', margin: '20px 0', textAlign: 'center', color: '#999' }}>
            {loading ? '로딩중...' : ''}
          </div>
        )}
        
        {/* 로딩도 끝났고, 글도 0개일 때만 '게시글 없음' 표시 */}
        {!loading && posts.length === 0 && (
           <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
             아직 작성된 게시글이 없습니다. <br/> 첫 번째 글의 주인공이 되어보세요!
           </div>
        )}

        {!loading && !hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#bbb' }}>
            모든 게시글을 다 봤어요! 🎉
          </div>
        )}
      </div>
    </div>
  );
}