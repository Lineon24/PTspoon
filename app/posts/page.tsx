'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import HeaderWithBack from '@/components/HeaderWithBack';
import PostList from '@/components/PostList';
import { useInView } from 'react-intersection-observer'; 
import { PostSearchAutocomplete } from '@/components/PostSearchBar';
import { cn } from "@/lib/utils"

interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  image_urls: string[];
  tag?: string[];
}

interface Profile {
  id: string;
  nickname: string;
}

const POSTS_PER_PAGE = 10;

type TagOption = "전체" | "식당소식" | "행사" | "음식" | "자유" | "혼밥" | "홍보";

export default function AllPostsPage() {
  const [search, setSearch]= useState('');
  const [isSearching, setIsSearching]= useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true); // UI 표시용 로딩 상태
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedTag, setSelectedTag]= useState<TagOption>('전체');

  const applySearch= useCallback(()=> {
    const q =search.trim();
    const hasQuery = q.length > 0 ;
    const hasTag= selectedTag !== '전체';
    setIsSearching(hasQuery || hasTag);
  },[search, selectedTag]);

  const filteredPosts = useMemo(() => {
  const q = search.trim().toLowerCase();

  if (!isSearching) return posts;

  return posts.filter((p) => {
    // 1. 텍스트 검색 조건 (기존과 동일)
    const matchText =
      !q ||
      (p.title ?? '').toLowerCase().includes(q) ||
      (p.content ?? '').toLowerCase().includes(q);

    // 2. 태그 조건 (수정된 부분)
    let matchTag = false;
    const postTags = p.tag ?? [];

    if (selectedTag === '전체') {
      matchTag = true;
    } else if (selectedTag === '식당소식') {
      // 시스템 태그(promotion)
      matchTag = postTags.includes('promotion') 
    } else {
      matchTag = postTags.includes(selectedTag);
    }

    return matchText && matchTag;
  });
}, [posts, search, isSearching, selectedTag]);

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
      <HeaderWithBack title="전체 게시글" backTF={false} 
        buttonCustomName='게시글 작성' buttonCustomPath='/posts/write' buttonCustomicon={1} />
<div 
  className={cn(
    "fixed top-[56px] left-1/2 -translate-x-1/2 z-50 w-[520px] max-w-[95%]",
    "bg-transparent pointer-events-none p-1"
  )}
>
  {/* 🔍 입체감을 살린 메인 컨테이너 */}
  <div className={cn(
    "pointer-events-auto transition-all duration-300 ease-out",
    "bg-white rounded-2xl",
    // 1. 입체감: 더 깊고 풍부한 다중 그림자 적용 (Floating 효과)
    "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15),0_10px_20px_-5px_rgba(0,0,0,0.05)]", 
    "focus-within:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)]", 
    // 2. 애니메이션: 포커스 시 살짝 더 커짐
    "focus-within:scale-[1.02]",
    // 3. 메인 바 테두리 제거 (잔상 방지)
    "!border-none !ring-0 !ring-offset-0 outline-none"
  )}>
    <PostSearchAutocomplete
      value={search}
      onChange={setSearch}
      onEnter={applySearch}
      selectedTag={selectedTag}
      onTagChange={(t) => {
        setSelectedTag(t);
        setIsSearching(t !== '전체' || search.trim().length > 0);
      }}
    />
  </div>
</div>
      <div style={{ height: 80 }}></div>

      <div style={{ paddingTop: '0px' }}>
        <PostList posts={filteredPosts} profile={profile} onPostDeleted={handlePostDeleted} />
        
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