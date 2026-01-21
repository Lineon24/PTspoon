'use client';

import { useParams } from 'next/navigation';
import RestaurantInfo from '@/components/restaurant_detail/info';
import HeaderWithBack from '@/components/HeaderWithBack';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Menu_list from '@/components/restaurant_detail/menu';
import { IsLogin, RestaurantReviewList } from '@/components/restaurant_detail/IsLogin';
import RestaurantShareButton from '@/components/restaurant_detail/RestaurantShareButton';
import { Button } from "@/components/ui/button";
import PostList from '@/components/PostList'; // 1. PostList 임포트 확인

// 2. Post 인터페이스 정의 (noticePosts 상태용)
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
  restaurant_name?: string;
}

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
}

function RestaurantDetail() {
  const params = useParams();
  const [restaurant_data, setRestaurantData] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<"menu" | "review" | "notice" | null>("menu");
  const [noticePosts, setNoticePosts] = useState<Post[]>([]); // 게시글 상태

  const restaurantId = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  const [profile, setProfile] = useState<Profile | null>(null);

  // 1. 식당 정보 가져오기
  useEffect(() => {
    if (!restaurantId) return;
    const fetchRestaurantInfo = async () => {
      const { data, error } = await supabase
        .from('restaurant')
        .select('restaurant_id, restaurant_name')
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) {
        console.error('레스토랑 불러오기 실패:', error);
        setRestaurantData(null);
      } else {
        setRestaurantData(data);
      }
      setLoading(false);
    };
    fetchRestaurantInfo();
  }, [restaurantId]);

  // 2. 사용자 프로필 가져오기
  useEffect(() => {
    async function getUserProfile() {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname, restaurant_name')
          .eq('id', userData.user.id)
          .single();
        if (profileData) {
          setProfile({ id: userData.user.id, ...profileData });
        }
      }
    }
    getUserProfile();
  }, []);

  // 3. 공지사항(사장님 소식) 가져오기 로직
useEffect(() => {
  if (!restaurant_data?.restaurant_name) return;

  // 1. 초기 데이터 불러오기
  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .contains('tag', [restaurant_data.restaurant_name, 'promotion'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNoticePosts(data as Post[]);
    }
  };

  fetchNotices();

  // 2. 실시간 구독 설정
  const noticeChannel = supabase
    .channel(`notices-${restaurantId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'posts' },
      (payload) => {
        const newPost = payload.new as Post;
        
        // 중요: 새로 생성된 포스트가 현재 식당의 태그와 'promotion'을 모두 포함하는지 확인
        const hasRestaurantTag = newPost.tag?.includes(restaurant_data.restaurant_name);
        const isPromotion = newPost.tag?.includes('promotion');

        if (hasRestaurantTag && isPromotion) {
          setNoticePosts((prev) => [newPost, ...prev]); // 최신글을 맨 앞으로 추가
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'posts' },
      (payload) => {
        // 삭제된 포스트 반영
        setNoticePosts((prev) => prev.filter((post) => post.id !== payload.old.id));
      }
    )
    .subscribe();

  // 3. 컴포넌트 언마운트 시 구독 해제
  return () => {
    supabase.removeChannel(noticeChannel);
  };
}, [restaurant_data, restaurantId]);

  if (loading) return (
    <main>
      <HeaderWithBack title='식당 상세' backTF={true} />
      <div style={{ margin: 60, textAlign: 'center' }}>로딩중...</div>
    </main>
  );

  if (!restaurantId || restaurant_data == null) return (
    <main>
      <HeaderWithBack title='식당 상세' backTF={true} />
      <div style={{ margin: 60, textAlign: 'center' }}>잘못된 페이지 접근입니다.</div>
    </main>
  );

  return (
    <div className="max-w-[540px] mx-auto pb-10 relative">
      <HeaderWithBack title="식당 상세" backTF={true} />
      
      <div className="absolute right-2 top-3 z-20">
        <RestaurantShareButton restaurantName={restaurant_data.restaurant_name} />
      </div>

      <div className='pt-1'>
        <RestaurantInfo restaurantId={restaurantId} />
      </div>

      {/* 탭 메뉴: 3분할 레이아웃 */}
      <div className='flex border-b border-gray-300'>
        <Button
          className={`flex-1 py-2 text-center transition-colors rounded-none bg-transparent shadow-none hover:bg-transparent
            ${contentType === "menu" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
          onClick={() => setContentType("menu")}
        >
          메뉴
        </Button>
        <div className="w-px bg-gray-300"></div>
        <Button
          className={`flex-1 py-2 text-center transition-colors rounded-none bg-transparent shadow-none hover:bg-transparent
            ${contentType === "review" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
          onClick={() => setContentType("review")}
        >
          리뷰
        </Button>
        <div className="w-px bg-gray-300"></div>
        <Button
          className={`flex-1 py-2 text-center transition-colors rounded-none bg-transparent shadow-none hover:bg-transparent
            ${contentType === "notice" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
          onClick={() => setContentType("notice")}
        >
          공지사항
        </Button>
      </div>

      {contentType === "review" && (
        <IsLogin profile={profile} restaurant_id={restaurantId} />
      )}

      {/* 콘텐츠 출력 영역 */}
      <div className="p-0 pt-5">
        {contentType === "review" ? (
          <RestaurantReviewList profile={profile} restaurant_id={restaurantId} />
        ) : contentType === "notice" ? (
          <div className="px-2"> {/* PostList 내부에서 여백을 가지므로 px-0 권장 */}
            {noticePosts.length > 0 ? (
              <PostList 
                posts={noticePosts} 
                profile={profile} 
                onPostDeleted={(id) => setNoticePosts(prev => prev.filter(p => p.id !== id))} 
              />
            ) : (
              <div className="py-20 text-center text-gray-500">
                아직 등록된 식당 소식이 없습니다.
              </div>
            )}
          </div>
        ) : (
          <Menu_list restaurantId={restaurantId} />
        )}
      </div>
    </div>
  );
}

export default function RestaurantDetailPage() {
  return (
    <Suspense fallback={<div>Loading restaurants...</div>}>
      <RestaurantDetail />
    </Suspense>
  );
}