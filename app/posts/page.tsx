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
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedTag, setSelectedTag] = useState<TagOption>('전체');

  const applySearch = useCallback(() => {
    const q = search.trim();
    const hasQuery = q.length > 0;
    const hasTag = selectedTag !== '전체';
    setIsSearching(hasQuery || hasTag);
  }, [search, selectedTag]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!isSearching) return posts;
    return posts.filter((p) => {
      const matchText = !q || (p.title ?? '').toLowerCase().includes(q) || (p.content ?? '').toLowerCase().includes(q);
      let matchTag = false;
      const postTags = p.tag ?? [];
      if (selectedTag === '전체') matchTag = true;
      else if (selectedTag === '식당소식') matchTag = postTags.includes('promotion');
      else matchTag = postTags.includes(selectedTag);
      return matchText && matchTag;
    });
  }, [posts, search, isSearching, selectedTag]);

  const isFetching = useRef(false); 
  const newPostCount = useRef(0);
  const { ref, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    async function getUserProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase.from('profiles').select('nickname').eq('id', userData.user.id).single();
        setProfile(profileData ? { id: userData.user.id, ...profileData } : { id: userData.user.id, nickname: '게스트' });
      }
    }
    getUserProfile();
  }, []);

  const fetchPosts = useCallback(async (pageIndex: number) => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    const offset = newPostCount.current;
    const from = pageIndex * POSTS_PER_PAGE + offset;
    const to = from + POSTS_PER_PAGE - 1;
    try {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;
      if (data && data.length > 0) {
        setPosts((prev) => {
          const uniqueMap = new Map();
          if (pageIndex > 0) prev.forEach(p => uniqueMap.set(p.id, p));
          data.forEach(p => uniqueMap.set(p.id, p));
          return Array.from(uniqueMap.values()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Post[];
        });
        if (data.length < POSTS_PER_PAGE) setHasMore(false);
      } else {
        if (pageIndex === 0) setPosts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(0); }, []);

  useEffect(() => {
    if (inView && !isFetching.current && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage);
    }
  }, [inView, hasMore, page, fetchPosts]);

  useEffect(() => {
    const postsChannel = supabase.channel('public:posts_realtime_fixed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost = payload.new as Post;
        newPostCount.current += 1;
        setPosts((prev) => {
          const allPosts = [newPost, ...prev];
          const uniqueMap = new Map();
          allPosts.forEach(p => uniqueMap.set(p.id, p));
          return Array.from(uniqueMap.values()).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Post[];
        });
      }).subscribe();
    return () => { supabase.removeChannel(postsChannel); };
  }, []);

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== deletedPostId));
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '20px', fontFamily: 'Pretendard, sans-serif', minHeight: '100vh', background: '#f8f9fa' }}>
      <HeaderWithBack title="전체 게시글" backTF={false} buttonCustomName='게시글 작성' buttonCustomPath='/posts/write' buttonCustomicon={1} />

      {/* 📌 [맵 페이지 스타일 이식] 상단 고정 및 애니메이션 영역 */}
      <div className="fixed top-[56px] left-1/2 -translate-x-1/2 z-50 w-[520px] max-w-[95%] bg-transparent pointer-events-none p-1">
        {/* 1. 확대 애니메이션 (1.05배) */}
        <div className="pointer-events-auto transition-all duration-300 focus-within:scale-[1.04]">
          {/* 2. 디자인 컨테이너 (그림자, ring-4) */}
          <div className={cn(
            "relative bg-white rounded-full transition-all duration-300",
            "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]",
            // 💡 맵 페이지 스타일: 검은색 테두리
            "ring-0 focus-within:ring-3 focus-within:ring-black",
            "focus-within:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)]",
            // 💡 드롭다운을 위해 overflow-visible(기본값) 유지, 테두리 중복 방지
            "z-40 focus-within:z-50 outline-none border-none", 
            // 모든 자식 요소의 포커스 링을 강제로 제거
            "[&_*]:!ring-0 [&_*]:!outline-none [&_*]:!ring-offset-0",
            "[&_input]:!bg-white"
          )}>
            <PostSearchAutocomplete
              value={search}
              onChange={setSearch}
              onEnter={applySearch}
              selectedTag={selectedTag}
              onTagChange={(t) => {
                setSelectedTag(t as TagOption);
                setIsSearching(t !== '전체' || search.trim().length > 0);
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ height: 85 }}></div> {/* 고정 검색창 공간 확보 */}

      <div style={{ paddingTop: '0px' }}>
        <PostList posts={filteredPosts} profile={profile} onPostDeleted={handlePostDeleted} />
        {hasMore && (
          <div ref={ref} style={{ height: '20px', margin: '20px 0', textAlign: 'center', color: '#999' }}>
            {loading ? '로딩중...' : ''}
          </div>
        )}
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