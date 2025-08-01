"use client"

import { useState, useEffect, useRef } from "react"
import Script from "next/script"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation"
import HeaderWithBack from '@/components/HeaderWithBack';

// kakao 전역 선언
declare global {
  interface Window {
    kakao: any;
  }
}
interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
}

const RestaurantListItem = ({ restaurant }: { restaurant: Restaurant }) => (
  <div className="p-3 text-[12px]">
    <div className="text-[15px]">{restaurant.restaurant_name}</div>
    <p>{restaurant.address}</p>
    <p>{restaurant.phone}</p>
  </div>
)

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(true)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<
    { id: string; marker: any; position: { lat: number; lng: number } }[]
  >([])
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY as string

  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!window.kakao) return reject("Kakao maps not loaded")
      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
        } else {
          reject("주소를 좌표로 변환하지 못함")
        }
      })
    })
  }

  const createMarkers = async (map: any, restaurantList: Restaurant[]) => {
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    for (const restaurant of restaurantList) {
      try {
        const { lat, lng } = await geocodeAddress(restaurant.address)
        const position = { lat, lng }
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
          clickable: true,
        })
        marker.setMap(map)

        window.kakao.maps.event.addListener(marker, "click", () => {
          console.log("마커 클릭됨:", restaurant.restaurant_id);
          setSelectedRestaurantId(restaurant.restaurant_id)
          setIsSheetOpen(true)
          map.panTo(new window.kakao.maps.LatLng(lat, lng))
        })

        markersRef.current.push({ id: restaurant.restaurant_id, marker, position })
      } catch (error) {
        console.warn(`주소 변환 실패: ${restaurant.address}`, error)
      }
    }
  }

  const onClickRestaurant = (id: string) => {
    const markerObj = markersRef.current.find((m) => m.id === id)
    if (!mapRef.current) {
      console.warn("지도 인스턴스 없음")
      return
    }
    if (markerObj) {
      const { lat, lng } = markerObj.position
      mapRef.current.panTo(new window.kakao.maps.LatLng(lat, lng))
      setSelectedRestaurantId(id)
      setIsSheetOpen(true)
    }
  }

  const handleMapLoad = async () => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(async () => {
        const mapContainer = document.getElementById("map")
        if (!mapContainer) return

        const mapOption = {
          center: new window.kakao.maps.LatLng(36.994444, 127.134466),
          level: 3,
        }
        const map = new window.kakao.maps.Map(mapContainer, mapOption)
        mapRef.current = map

        const { data, error } = await supabase.from("restaurant").select("*")
        if (error) {
          console.error("Supabase 데이터 조회 실패:", error)
          return
        }
        if (data && data.length > 0) {
          setRestaurants(data as Restaurant[])
          setSelectedRestaurantId(data[0].restaurant_id)
          await createMarkers(map, data as Restaurant[])
        }
      })
    }
  }

  // 클라이언트 사이드 진입시 지도 직접 실행
  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps) {
      handleMapLoad()
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach(({ id, marker }) => {
        const isSelected = id === selectedRestaurantId
        if (window.kakao && window.kakao.maps) {
          const newSize = isSelected
            ? new window.kakao.maps.Size(42, 52)
            : new window.kakao.maps.Size(32, 42)
        const newImage = new window.kakao.maps.MarkerImage(
          "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
          newSize
        )
        marker.setImage(newImage)
        marker.setZIndex(isSelected ? 10 : 1)
      }
    })
  }
}, [selectedRestaurantId])

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer,drawing`}
        onLoad={handleMapLoad}
        strategy="afterInteractive"
      />
      <HeaderWithBack title="주변 맛집 찾기" backTF= {true} /> {/* 상단 고정 헤더 */}
      <div className="relative w-full h-screen overflow-hidden max-w-[540px] mx-auto">
        
        <div
          id="map"
          ref={mapContainerRef}
          className="absolute left-0 right-0 top-0 bottom-0 z-0 transition-all duration-500"
        />

        <div
          ref={sheetRef}
          className={cn(
            "fixed bottom-7.5 left-0 right-0 max-w-[540px] mx-auto bg-white dark:bg-gray-900 rounded-t-2xl shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-in-out z-20",
            isSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]"
          )}
        >
          <button
            onClick={() => setIsSheetOpen(!isSheetOpen)}
            className="w-full h-12 flex justify-center items-center"
          >
            {isSheetOpen ? (
              <ChevronDown className="h-6 w-6 text-gray-400" />
            ) : (
              <ChevronUp className="h-6 w-6 text-gray-400" />
            )}
          </button>

          <div className="p-4 pt-0 ">
            <h2 className="text-xl font-bold">지도 내 맛집 목록</h2>
          </div>

          <div className="overflow-y-auto max-h-[45vh] px-2">
            <div className="space-y-2 pb-4">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.restaurant_id}
                  onClick={() => onClickRestaurant(restaurant.restaurant_id)}
                  className={cn(
                    "rounded-xl transition-all cursor-pointer",
                    selectedRestaurantId === restaurant.restaurant_id &&
                      "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500",
                  )}
                >
                  <RestaurantListItem restaurant={restaurant} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}