'use client'

import {useParams} from 'next/navigation';
import RestaurantInfo from '@/components/restaurant_detail/info';
import Menu_list from '@/components/restaurant_detail/menu'
import RestaurantImage from '@/components/restaurant_detail/photo';
import Review_write from '@/components/restaurant_detail/Review_write';
import RestaurantReviewList from '@/components/restaurant_detail/Review';
import HeaderWithBack from '@/components/HeaderWithBack';
import { Suspense } from 'react';
function RestaurantDetail(){
  const params=useParams();

  // 폴더명이 [restaurants_id]라면 아래처럼:
  const restaurantId = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  console.log("useParams params:", params);
  console.log("restaurantId after normalization:", restaurantId);
  //레스토랑 ID가 없으면 오류 메시지 출력
  if(!restaurantId){
    return<p>해당 레스토랑을 찾을 수 없습니다.</p>
  }

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
      {/*4.레스토랑 리뷰 작성*/}
      <Review_write restaurantId={restaurantId}/>
      {/*5.레스토랑 리뷰 출력*/}
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