'use client' // Next.js 13 app directory에서 이 컴포넌트가 클라이언트 측에서 실행됨을 명시

import {useParams} from 'next/navigation'; // URL 파라미터를 가져오기 위한 훅
import RestaurantInfo from '@/components/restaurant_detail/info'; // 식당 기본 정보를 보여주는 컴포넌트
import HeaderWithBack from '@/components/HeaderWithBack'; // 뒤로가기 버튼이 있는 헤더 컴포넌트
import { Suspense, useEffect, useState } from 'react'; // React 기본 훅과 Suspense
import { supabase } from '@/lib/supabaseClient' // Supabase 클라이언트
import Menu_list from '@/components/restaurant_detail/menu'; // 식당 메뉴 리스트 컴포넌트
import {IsLogin, RestaurantReviewList} from '@/components/restaurant_detail/IsLogin'; 
// IsLogin: 리뷰 작성 전에 로그인 여부 확인용
// RestaurantReviewList: 리뷰 리스트 컴포넌트
import {Button} from "@/components/ui/button" // 버튼 UI 컴포넌트

// 사용자 프로필 타입 정의
interface Profile{
  id:string;
  nickname:string;
}

function RestaurantDetail(){
  const params = useParams(); // URL에서 restaurants_id를 가져옴
  const [contentType, setContentType] = useState<"menu"|"review"|null>("menu"); 
  // 현재 보여질 콘텐츠 타입 상태 ("menu" 또는 "review")

  // 폴더명이 [restaurants_id]라면 URL 파라미터 처리
  const restaurantId = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0] // 배열이면 첫번째 값 사용
    : params.restaurants_id;   // 문자열이면 그대로 사용

  console.log("useParams params:", params);
  console.log("restaurantId after normalization:", restaurantId);

  const [profile, setProfile] = useState<Profile|null>(null); // 사용자 프로필 상태

  // 레스토랑 ID가 없으면 오류 메시지 출력
  if(!restaurantId){
    return <p>해당 레스토랑을 찾을 수 없습니다.</p>
  }

  // 사용자 로그인 상태 및 프로필 정보 불러오기
  useEffect(()=>{
    async function getUserProfile(){
      const {data: userData} = await supabase.auth.getUser(); // 현재 로그인한 사용자 정보
      if(userData?.user){
        const {data: profileData} = await supabase
          .from('profiles')
          .select('nickname') // 닉네임만 선택
          .eq('id', userData.user.id) // 사용자 ID와 일치하는 데이터
          .single(); // 단일 행 선택
        if(profileData){
          setProfile({id: userData.user.id, ...profileData}); // 프로필 상태 업데이트
        }
      }
    }
    getUserProfile(); // useEffect 내부에서 함수 호출
  },[]); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행

  // 메뉴 보기 버튼 클릭 시
  const openMenu = () => {
    setContentType("menu"); // 메뉴 화면으로 전환
  };

  // 리뷰 보기 버튼 클릭 시
  const openReview = () => {
    setContentType("review"); // 리뷰 화면으로 전환
  };

  return(
    <div className="max-w-md mx-auto pb-10">
      {/* 상단 헤더 */}
      <HeaderWithBack title="식당 상세" backTF={true}/>

      {/* 식당 기본 정보 */}
      <div className='p-4'>
        <RestaurantInfo restaurantId={restaurantId}/>
      </div>

      {/* 메뉴/리뷰 선택 탭 */}
      <div className='flex border-b border-gray-300'>
        <Button
          className={`flex-1 py-2 text-center transition-colors 
            ${
              contentType === "menu"
              ? "text-blue-500 border-b-1 border-blue-500" // 메뉴 선택 시 파란색
              : "text-gray-500 hover:text-blue-400" // 선택 안 됐을 때 회색
            }`}
          onClick={openMenu}
        >
          메뉴보기
        </Button>
        <div className="w-px bg-gray-300"></div> {/* 구분선 */}
        <Button
          className={`flex-1 py-2 text-center transition-colors 
            ${
              contentType === "review"
              ? "text-blue-500 border-b-1 border-blue-500" // 리뷰 선택 시 파란색
              : "text-gray-500 hover:text-blue-400" // 선택 안 됐을 때 회색
            }`}
          onClick={openReview}
        >
          리뷰보기
        </Button>
      </div>
      {contentType==="review" &&(
        <IsLogin profile={profile} restaurant_id={restaurantId}/>
      )}

      {/* 콘텐츠 영역 */}
      <div className="p-4">
        {contentType === "review" 
          ? <RestaurantReviewList profile={profile} restaurant_id={restaurantId}/> 
          : <Menu_list restaurantId={restaurantId}/>
        }
      </div>
    </div>
  )
}

// Suspense로 감싸 로딩 상태 처리
export default function RestaurantDetailPage(){
  return(
    <Suspense fallback={<div>Loading restaurants...</div>}>
      <RestaurantDetail/>
    </Suspense>
  )
}
