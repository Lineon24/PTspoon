import Link from "next/link";
import React, { useState } from "react";
import { FilterTag } from "@/components/filter-tag";
import { useEffect } from "react";
// 레스토랑 타입 정의: id, 이름, 주소, 전화번호 (모두 문자열)
export interface Restaurant {
  restaurant_id: string;      // 식당 고유 ID
  restaurant_name: string;    // 식당 이름
  address: string; // 식당 주소
  phone: string;   // 식당 전화번호
  type: string[];
  taste: string[];
  }

// 컴포넌트가 받을 props 타입 정의
interface RestaurantListItemProps {
  restaurant: Restaurant;  // 렌더링할 레스토랑 객체
} 

// 레스토랑 리스트 아이템 컴포넌트
export function RestaurantListItem({ restaurant }: RestaurantListItemProps) {
  //레스토랑 ID를 로컬 스토리지에 저장
  useEffect(()=>{
    localStorage.setItem("restaurantID",restaurant.restaurant_id);
  },[restaurant.restaurant_id]);



  return (
    // 상세 페이지로 이동하는 링크 (식당 ID를 포함)
    <Link href={`/restaurants/${restaurant.restaurant_id}`} className="block">
      <div
        // 전체 아이템 컨테이너 스타일: padding, 테두리, 라운딩, 호버 시 배경색 변화
        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {/* 식당 이름, 굵고 큰 글씨 */}
        <h3 className="text-lg font-bold mb-1">{restaurant.restaurant_name}</h3>

        {/* 식당 주소, 작고 회색 텍스트 */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          주소: {restaurant.address}
        </p>

        {/* 식당 전화번호, 작고 회색 텍스트 */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          전화번호: {restaurant.phone}
        </p>
        {/*type 태그*/}
        <div className="flex flex-wrap gap-1 mb-1 py-1">
          {restaurant.type.map((tag)=>(
            <FilterTag key={tag} label={tag}/>
          ))}
        </div>
        {/*taste 태그*/}
        <div className="flex flex-wrap gap-1 mb-1">
          {restaurant.taste.map((tag)=>(
            <FilterTag key={tag} label={tag}/>
          ))}
        </div>
  </div>
  </Link>
  );
}
