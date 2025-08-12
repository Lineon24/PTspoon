'use client'

import {useParams} from 'next/navigation';
import RestaurantInfo from '@/components/restaurant_detail/info';
import Menu_list from '@/components/restaurant_detail/menu'
import RestaurantImage from '@/components/restaurant_detail/photo';
import RestaurantReviewList from '@/components/restaurant_detail/Review';
import HeaderWithBack from '@/components/HeaderWithBack';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'
import IsLogin from "@/components/restaurant_detail/IsLogin"

interface Profile{
  id:string;
  nickname:string;
}

function RestaurantDetail(){
  const params=useParams();

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


  return(
    <div className="max-w-md mx-auto pb-10">
      <HeaderWithBack title="식당 상세" backTF={true}/>
      {/*1.식당 대표 이미지*/}
      <RestaurantImage restaurantId={restaurantId}/>
      {/*2.식당 기본 정보*/}
      <div className='p-4'>
        <RestaurantInfo restaurantId={restaurantId}/>
      </div>
      {/*3.메뉴들*/}
      <Menu_list restaurantId={restaurantId}/>
      {/*레스토랑 리뷰 쓰기*/}
      <IsLogin profile={profile} retaurant_id={restaurantId}/>
      {/*4.레스토랑 리뷰 출력*/}
      <RestaurantReviewList restaurantId={restaurantId}/>
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
