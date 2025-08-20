'use client'

import {useParams} from 'next/navigation';
import RestaurantInfo from '@/components/restaurant_detail/info';
import HeaderWithBack from '@/components/HeaderWithBack';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'
import Menu_list from '@/components/restaurant_detail/menu';
import {IsLogin,RestaurantReviewList}from '@/components/restaurant_detail/IsLogin'; //이 친구 이름이 왜 IsLogin이냐면 레스토랑 리뷰 쓰기를 하기전에 로그인이 되었는지 확인하기 때문
import {Button} from "@/components/ui/button"
interface Profile{
  id:string;
  nickname:string;
}

function RestaurantDetail(){
  const params=useParams();
  const [contentType,setContentType]=useState<"menu"|"review"|null>("menu"); //보여질 내용

  // 폴더명이 [restaurants_id]라면 아래처럼:
  const restaurantId = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  console.log("useParams params:", params);
  console.log("restaurantId after normalization:", restaurantId);

  const [profile,setProfile]=useState<Profile|null>(null);
  //레스토랑 ID가 없으면 오류 메시지 출력
  if(!restaurantId){
    return<p>해당 레스토랑을 찾을 수 없습니다.</p>
  }
  //사용자 로그인 상태 및 프로필 정보 불러오기
  useEffect(()=>{
    async function getUserProfile(){
      const {data:userData}=await supabase.auth.getUser();
      if(userData?.user){
        const{data:profileData}=await supabase
        .from('profiles')
        .select('nickname')
        .eq('id',userData.user.id)
        .single();
      if(profileData){
        setProfile({id:userData.user.id, ...profileData});
      }
      }
      getUserProfile();
    }
  },[]);

//메뉴 보기를 눌렀을때
const openMenu=()=>{
  setContentType("menu");
};
//리뷰 보기를 눌렀을때
const openReview=()=>{
  setContentType("review");
};

  return(
    <div className="max-w-md mx-auto pb-10">
      <HeaderWithBack title="식당 상세" backTF={true}/>
      {/*식당 기본 정보*/}
      <div className='p-4'>
        <RestaurantInfo restaurantId={restaurantId}/>
      </div>
      <div className='flex border-b border-gray-300'>
      <Button
        className={`flex-1 py-2 text-center transition-colors 
        ${
          contentType === "menu"
          ? "text-blue-500 border-b-1 border-blue-500" // 선택 시 파란색
          : "text-gray-500 hover:text-blue-400" // 선택 안 됐을 때 회색
        }`}
        
        onClick={openMenu}
        >
          메뉴보기
      </Button>
      <div className="w-px bg-gray-300"></div> {/* | 구분선 */}
      <Button
        className={`flex-1 py-2 text-center transition-colors 
        ${
          contentType === "review"
          ? "text-blue-500 border-b-1 border-blue-500" // 선택 시 파란색
          : "text-gray-500 hover:text-blue-400" // 선택 안 됐을 때 회색
        }`} // 호버 시 글자색 변화
        onClick={openReview}
        >
          리뷰보기
      </Button>
      </div>
      <IsLogin profile={profile} restaurant_id={restaurantId}/>
      <div className="p-4">
      {contentType==="review"?<RestaurantReviewList  profile={profile} restaurant_id={restaurantId}/>:<Menu_list restaurantId={restaurantId}/>}
      </div>
    </div>
  )
}

export default function RestaurantDetailPage(){
  return(
    <Suspense fallback={<div>Loading restaurants...</div>}>
      <RestaurantDetail/>
    </Suspense>
  )
}
