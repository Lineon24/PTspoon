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

interface Profile {
  id: string;
  nickname: string;
}

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
}

function RestaurantDetail() {
  const params = useParams();
  const [restaurant_data, setRestaurantData] = useState<Restaurant | null>(null); // 변수명 명확하게 변경
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<"menu" | "review" | null>("menu");

  const restaurantId = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  const [profile, setProfile] = useState<Profile | null>(null);

  // 1. 식당 정보 가져오기 (이름 포함)
  useEffect(() => {
    if (!restaurantId) return;
    const fetchRestaurantInfo = async () => {
      const { data, error } = await supabase
        .from('restaurant')
        .select('restaurant_id, restaurant_name')
        .eq('restaurant_id', restaurantId)
        .single(); // 단일 객체로 가져오기

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
          .select('nickname')
          .eq('id', userData.user.id)
          .single();
        if (profileData) {
          setProfile({ id: userData.user.id, nickname: profileData.nickname });
        }
      }
    }
    getUserProfile();
  }, []);

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
    <div className="max-w-[540px] mx-auto pb-10 relative"> {/* relative 추가: 공유 버튼 위치 기준 */}
      {/* 상단 헤더 */}
      <HeaderWithBack title="식당 상세" backTF={true} />
      
      {/* 공유하기 버튼: DB에서 가져온 실명을 전달 */}
      <div className="absolute right-2 top-3 z-20">
        <RestaurantShareButton restaurantName={restaurant_data.restaurant_name} />
      </div>

      {/* 식당 기본 정보 */}
      <div className='pt-1'>
        <RestaurantInfo restaurantId={restaurantId} />
      </div>

      {/* 메뉴/리뷰 선택 탭 */}
      <div className='flex border-b border-gray-300'>
        <Button
          className={`flex-1 py-2 text-center transition-colors rounded-none bg-transparent shadow-none hover:bg-transparent
            ${contentType === "menu"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-gray-500 hover:text-blue-400"
            }`}
          onClick={() => setContentType("menu")}
        >
          메뉴보기
        </Button>
        <div className="w-px bg-gray-300"></div>
        <Button
          className={`flex-1 py-2 text-center transition-colors rounded-none bg-transparent shadow-none hover:bg-transparent
            ${contentType === "review"
              ? "text-blue-500 border-b-2 border-blue-500"
              : "text-gray-500 hover:text-blue-400"
            }`}
          onClick={() => setContentType("review")}
        >
          리뷰보기
        </Button>
      </div>

      {/* 리뷰 작성 로그인 유도 영역 */}
      {contentType === "review" && (
        <IsLogin profile={profile} restaurant_id={restaurantId} />
      )}

      {/* 콘텐츠 영역 (리뷰 리스트 또는 메뉴 리스트) */}
      <div className="p-0 pt-5">
        {contentType === "review" ? (
          <RestaurantReviewList profile={profile} restaurant_id={restaurantId} />
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