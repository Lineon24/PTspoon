// 레스토랑 정보 (연락처, 이름, 주소),리뷰 컴포넌트
//버튼으로 조절하기 때문에 하나로 묶음
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
  image_url:string;
  description?: string;
}

export default function RestaurantInfo({ restaurantId }: RestaurantInfoProps) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLarge, setIsLarge] = useState(false);
  const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png';
  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_name, phone, address,image_url, description")
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

  const handleImageClick = () => {
    setIsLarge(!isLarge); // isLarge 상태를 반전시킴 (true -> false, false -> true)
  };
  if (loading) {
    return <div className="p-4 text-gray-500">로딩 중...</div>
  }

  if (!restaurant) {
    return <div className="p-4 text-red-500">레스토랑 정보를 불러올 수 없습니다.</div>
  }
  return (
<div className="flex flex-col items-center w-full bg-white pb-10">
      
      {/* 1. 식당 대표 이미지 (제공해주신 이전 스타일 100% 적용) */}
      <div className="w-full flex justify-center mb-4">
        <img
          src={restaurant.image_url || DEFAULT_IMAGE_URL}
          alt="레스토랑 이미지"
          onClick={handleImageClick}
          loading="lazy"
          style={{
            maxWidth: isLarge ? '100vh' : 540, // 이전 로직 그대로 적용
            maxHeight: isLarge ? '100vh' : '300px', // 이전 로직 그대로 적용
            width: '100%',
            objectFit: 'cover',
            borderRadius: '8px',
            display: 'block',
            transition: 'all 0.3s ease', // 부드러운 애니메이션
            cursor: 'pointer',
          }}
        />
      </div>

      {/* 2. 식당 이름 및 설명 섹션 (여백 축소) */}
      <section className="text-center mb-6 px-4 w-full max-w-[540px]">
        <h1 className="text-xl font-bold text-gray-900 break-words mb-1">
          {restaurant.restaurant_name}
        </h1>
        
        {/* 추가된 설명 필드 */}
        {restaurant.description && (
          <p className="text-sm text-blue-600 font-medium break-words px-2">
            {restaurant.description}
          </p>
        )}
      </section>

      {/* 3. 주소 및 전화 버튼 영역 (아이콘 찌그러짐 방지 적용) */}
      <div className="flex flex-col gap-3 w-full max-w-[540px] px-4">
        
        {/* 주소 섹션 */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 min-h-[50px] border border-gray-100 shadow-sm">
          <a
            href={`https://map.kakao.com/link/search/${encodeURIComponent(restaurant.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            // flex-shrink-0으로 버튼 형태 고정
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-all active:scale-90"
          >
            <MapPin className="w-5 h-5 flex-shrink-0" />
          </a>
          <div className="flex flex-col overflow-hidden">
            <span className="text-[10px] text-gray-400">주소</span>
            <span className="text-sm text-gray-800 break-words leading-tight">
              {restaurant.address}
            </span>
          </div>
        </div>

        {/* 전화번호 섹션 */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-2 min-h-[50px] border border-gray-100 shadow-sm">
          <a
            href={`tel:${restaurant.phone}`}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-all active:scale-90"
          >
            <Phone className="w-5 h-5 flex-shrink-0" />
          </a>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400">전화번호</span>
            <span className="text-sm text-gray-800 font-medium">
              {restaurant.phone || "연락처 정보 없음"}
            </span>
          </div>
        </div>

      </div>
    </div>
)

}


