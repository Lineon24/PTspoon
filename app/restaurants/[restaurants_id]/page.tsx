"use client";

// 이 페이지는 시험용 페이지임

import { useParams } from "next/navigation";
import RestaurantInfo from "@/components/info";

export default function RestaurantDetailPage() {
  // useParams에서 id 대신 폴더명에 맞는 키로 받아야 함
  // 예: 폴더명이 [restaurants_id]라면 params.restaurants_id
  const params = useParams();

  // 예시로 폴더명이 [id]라 가정하면:
  // const restaurantId = Array.isArray(params.id) ? params.id[0] : params.id;

  // 폴더명이 [restaurants_id]라면 아래처럼:
  const restaurantId = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  console.log("useParams params:", params);
  console.log("restaurantId after normalization:", restaurantId);

  if (!restaurantId) {
    return <p>레스토랑 ID가 없습니다.</p>;
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">레스토랑 상세 페이지</h1>
      <RestaurantInfo restaurantId={restaurantId} />
    </div>
  );
}
