// 레스토랑 정보 (연락처, 이름, 주소) 컴포넌트
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { MapPin, Phone, Clock } from "lucide-react"

interface RestaurantInfoProps {
  restaurantId: string
}

interface Restaurant {
  restaurant_name: string
  phone: string
  address: string
  hours?: string // 필요시 운영시간 확장 가능
}

export default function RestaurantInfo({ restaurantId }: RestaurantInfoProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_name, phone, address")
        .eq("restaurant_id", restaurantId)
        .single()

      if (error) {
        console.error("레스토랑 조회 실패", error)
        setRestaurant(null)
      } else {
        setRestaurant(data)
      }

      setLoading(false)
    }

    if (restaurantId) {
      fetchRestaurant()
    }
  }, [restaurantId])

  if (loading) {
    return <div className="p-4 text-gray-500">로딩 중...</div>
  }

  if (!restaurant) {
    return <div className="p-4 text-red-500">레스토랑 정보를 불러올 수 없습니다.</div>
  }
  return (
  <section className="p-4 mb-6 space-y-4">
    {/* 식당 이름 */}
    <div className="text-center">
    <h1 className="text-2xl font-semibold text-gray-900 break-words">
      {restaurant.restaurant_name}
    </h1>
    </div>
    {/*일단 버튼 모양으로 변경*/}
    {/*주소*/}
    <div className="flex justify-center gap-8">
    <div className="flex items-center gap-3 bg-white-100 rounded-lg px-4 h-14 w-64">
      <a
        href={`https://map.kakao.com/link/search/${encodeURIComponent(restaurant.address)}`}
        target="_blank"
        rel="nooperner noreferrer"
        aria-label="주소"
        className="w-12 h-12 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-colors duration-200"
        >
          <MapPin className="w-6 h-6"/>
        </a>
        <span className="text-sm text-gray-800 whitespace-nowrap">{restaurant.address}</span>
      </div>
      {/*전화*/}
      <div className="flex items-center gap-2 bg-white-100 rounded-lg px-4 h-14 w-64">
      <a
        href={`tel:${restaurant.phone}`}
        aria-label="전화번호"
        className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors duration-200"
        >
          <Phone className="w-6 h-6"/>
      </a>
      <span className="text-sm text-gray-800 whitespace-nowrap">{restaurant.phone}</span>
      </div>
    </div>
  </section>
)

}
