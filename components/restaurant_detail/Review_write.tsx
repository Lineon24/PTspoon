// Review_write.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// 리뷰 데이터 타입
interface Reviews {
  id: string;
  user_id: string;
  nickname: string;
  review: string;
}

// 상위 컴포넌트에서 받을 props 타입
interface ReviewWriteProps {
  restaurantId: string;
  menus?: string|null;  // 선택된 메뉴 목록
  tastes?: string[]; // 선택된 맛 목록
}

// 사용자 프로필 타입
interface Profile {
  id: string;
  nickname: string;
}

export default function Review_write({
  restaurantId,
  menus,
  tastes = [],
}: ReviewWriteProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [newReviewContent, setNewReviewContent] = useState('');
  const router = useRouter();

  // 1. 사용자 로그인 상태 확인 및 프로필 불러오기
  // 원래는 레스토랑 리뷰 버튼에서 비로그인자를 발견시 바로 로그인창으로 리다이렉트하게 만들었으나
  // 혹시 모르니 여기서도 적용하겠음
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

  // 2. 리뷰 작성 처리
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    // 내용이 비어있으면 경고
    if (!newReviewContent.trim()) {
      alert('내용을 입력하세요');
      return;
    }

    // 로그인 안된 경우
    if (!profile) {
      alert('로그인이 필요합니다.');
      return;
    }

    // Supabase에 리뷰 업로드
    const { error } = await supabase.from('restaurant_review').insert([
      {
        user_id: profile.id,
        nickname: profile.nickname,
        review: newReviewContent,
        restaurant_id: restaurantId,
        menu: menus,   // 선택한 메뉴
        tags: tastes, // 선택한 맛
      },
    ]);

    if (error) {
      console.error('리뷰 작성 오류', error);
      alert('리뷰 작성에 실패했습니다.');
    } else {
      // 작성 후 입력창 초기화
      setNewReviewContent('');
      alert('리뷰가 등록되었습니다.');
      goToDetail();
    }
  };

  const goToDetail = () => {
  router.push(`/restaurants/${restaurantId}/`);
  };

  return (
    <form
      onSubmit={handleSubmitReview}
      className="w-full max-w-md mx-auto p-4 bg-white rounded-xl shadow-md space-y-4"
    >
      {/* 리뷰 입력 */}
      <textarea
        value={newReviewContent}
        onChange={(e) => setNewReviewContent(e.target.value)}
        placeholder="식당 후기를 작성해주세요."
        rows={4}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-rose-400"
      />

      {/* 제출 버튼 */}
      <button
        type="submit"
        className="w-full py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
      >
        리뷰 등록
      </button>
    </form>
  );
}
