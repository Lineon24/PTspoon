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
    <section className="p-4 bg-white rounded-xl shadow-sm mb-6 space-y-4">
      {/* 식당 이름 */}
      <h1 className="text-2xl font-bold text-gray-900">{restaurant.restaurant_name}</h1>

      {/* 주소, 전화번호, (운영시간) */}
      <ul className="space-y-2 text-gray-700 text-sm">
        <li className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(restaurant.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-green-600"
          >
            {restaurant.address}
          </a>
        </li>
        <li className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-500" />
          <a href={`tel:${restaurant.phone}`} className="hover:underline text-blue-600">
            {restaurant.phone}
          </a>
        </li>
        {/* 운영시간 확장 가능 */}
        {/* <li className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-gray-800">11:00 - 22:00</span>
        </li> */}
      </ul>
    </section>
  )
}
