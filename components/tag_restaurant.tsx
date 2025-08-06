"use client";
import Link from "next/link"
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 간단한 식당 정보 타입 정의
interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
}

interface Props {
  tag: string; // #태그에서 '#' 제거한 식당 이름
}

export function RestaurantMessage({ tag }: Props) {

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("현재 tag:", tag);
    const fetchRestaurant = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_id, restaurant_name, address, phone")
        .ilike("restaurant_name", `%${tag}%`); // 여러 개일 수 있음

      if (error) {
        console.error("식당 정보 로드 실패:", error);
        setRestaurant(null);
      } else {
        // 배열의 첫 번째 요소만 사용
        setRestaurant(data?.[0] ?? null);
      }

      setLoading(false);
      
    };

    fetchRestaurant();
  }, [tag]);

    useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth'});
  }, [tag]);

  if (loading) return <span className="text-gray-400">불러오는 중...</span>;
  if (!restaurant) return <span className="text-red-500">식당 정보를 찾을 수 없습니다</span>;

  return (
    <div>
    <Link href={`/restaurant/${restaurant.restaurant_id}`} className="block">
    <div className="mt-3 p-4 bg-blue-50 rounded-md space-y-2">
      <div className="text-xl font-bold">{restaurant.restaurant_name}</div>
      <div className="text-gray-700">📍 {restaurant.address}</div>
      <div className="text-gray-700">📞 {restaurant.phone}</div>
    </div>
    </Link>
    <div ref={bottomRef} ></div>
    </div>

  );
}
