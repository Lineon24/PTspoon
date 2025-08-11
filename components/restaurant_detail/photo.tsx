'use client';

import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { useState,useEffect } from 'react';
interface RestaurantImageProps {
  image_url: string; // 예: 'burger.jpg'
}
//너는 레스토랑 id받아오는 새끼
interface Restaurant{
    restaurantId:string;
}

export default function RestaurantImage({restaurantId}: Restaurant) {
  const [image,setimage]=useState<RestaurantImageProps|null>(null); //이미지 상태값 초기화
  const [loading,setLoading]=useState(true); //로딩 상태값 초기화
  //이미지 URL 가져오기
  useEffect(()=>{
    const fetchImage=async () =>{
      setLoading(true);
      //레스토랑 ID가 같을때만 이미지 URL 가져오기
      const {data,error}=await supabase
      .from("restaurant")
      .select('image_url')
      .eq('restaurant_id',restaurantId)
      if(error){
        console.error("이미지 조회 실패",error) //오류시 콘솔에 로그 남기고
        setimage(null) //null로 설정
      }  
      else{
        //성공시 데이터 저장
        setimage(data[0]);
      }
      setLoading(false);
    }
    if(restaurantId){
      fetchImage();
    }
  },[restaurantId])

  //로딩중
  if(loading){
    return <div className="p-4 text-gray-500">로딩 중...</div>;
  }
  //데이터가 오류나면
  if(!image){
    return <div className="p-4 text-red-500">메뉴 정보를 불러올 수 없습니다.</div>;
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-6">
      {/*원래는 next/image를 쓸려고 했는데 이 간나새끼가 외부 이미지는 거부해서 img태그를 씀*/}
      <img
        src={image.image_url}
        alt="레스토랑 이미지"
        loading='lazy'
        style={{
          width:'100%',
          height:'100%',
          objectFit:'cover',
          borderRadius:'8px',
          display:'block',
        }}
        />
    </div>
  );
}