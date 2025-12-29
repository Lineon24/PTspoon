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
  description?: string;
  type: string[];
  taste: string[];
  image_url: string;
  lat: number; 
  lng: number;
  }

// 컴포넌트가 받을 props 타입 정의
interface RestaurantListItemProps {
  restaurant: Restaurant;  // 렌더링할 레스토랑 객체
} 
const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png';
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
    // 전체 아이템 컨테이너 스타일
    className="px-1 py-2 border rounded-lg border-gray-300 shadow-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center"
  >
    <div className="w-30 h-30 flex-shrink-0 mr-3">
      <img
        src={restaurant.image_url || DEFAULT_IMAGE_URL}
        alt={`${restaurant.restaurant_name} 대표 이미지`}
        className="w-full h-full object-cover rounded-lg border border-gray-200"
      />
    </div>
    <div className="flex-1">
      {/* 식당 이름 */}
      <h3 className="text-lg font-bold mb-0.5">{restaurant.restaurant_name}</h3>

      {/* ✅ 추가된 식당 설명: 이름 바로 아래에 파란색 강조 텍스트로 배치 */}
      {restaurant.description && (
        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium line-clamp-1 mb-1">
          {restaurant.description}
        </p>
      )}

      {/* 식당 주소 */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-0.5">
        주소: {restaurant.address}
      </p>

      {/* 식당 전화번호 */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
        전화번호: {restaurant.phone}
      </p>

      {/* type 태그 */}
      <div className="flex flex-wrap gap-1 mb-1 py-1">
        {restaurant.type.map((tag) => (
          <FilterTag key={tag} label={tag} />
        ))}
      </div>

      {/* taste 태그 */}
      <div className="flex flex-wrap gap-1">
        {restaurant.taste.map((tag) => (
          <FilterTag key={tag} label={tag} />
        ))}
      </div>
    </div>
  </div>
</Link>
  );
}
