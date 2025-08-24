"use client"

import { useState, useEffect, useRef } from "react"                               // React에서 상태/생명주기/참조(레퍼런스) 기능을 쓰기 위한 훅들
import Script from "next/script"                                                  // Next.js에서 외부 스크립트(Kakao Map SDK 같은 것)를 안전하게 로드하는 컴포넌트
import { ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react"          // 아이콘 라이브러리(lucide-react)에서 위/아래 화살표 아이콘 컴포넌트를 가져옴
import { cn } from "@/lib/utils"                                                  // 조건에 따라 Tailwind 클래스명을 깔끔하게 합쳐주는 유틸 함수
import { supabase } from '@/lib/supabaseClient';                                  // Supabase와 통신(인증, DB조회 등)하기 위한 미리 설정해둔 클라이언트
import { useRouter } from "next/navigation"                                       // Next.js 클라이언트 라우터 훅. 코드로 페이지 이동(router.push)할 때 사용
import HeaderWithBack from '@/components/HeaderWithBack';                         // 프로젝트에 만든 커스텀 헤더 컴포넌트(뒤로가기 버튼 포함)
import { SearchAutocomplete } from "@/components/SearchBar";
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const markersRef = useRef<{ id: string; marker: any; position: { lat: number; lng: number } }[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

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

        const defaultImage = new window.kakao.maps.MarkerImage(
          "/map/icon_black.png",
          new window.kakao.maps.Size(38, 40)
        )

        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
          clickable: true,
          image: defaultImage
        })

        marker.setMap(map)

        window.kakao.maps.event.addListener(marker, "click", () => {
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

  useEffect(() => {
    if (!selectedRestaurantId) return
    setRestaurants((prev) => {
      const index = prev.findIndex(r => r.restaurant_id === selectedRestaurantId)
      if (index === -1) return prev
      const newArr = [...prev]
      const [selected] = newArr.splice(index, 1)
      newArr.unshift(selected)
      return newArr
    })
  }, [selectedRestaurantId])

  // 여기가 핵심
  const onClickRestaurant = (id: string) => {
    if (selectedRestaurantId === id) {
      // 이미 선택된 상태면 이동
      router.push(`/restaurants`)
    } else {
      // 선택만
      const markerObj = markersRef.current.find((m) => m.id === id)
      if (markerObj && mapRef.current) {
        const { lat, lng } = markerObj.position
        mapRef.current.panTo(new window.kakao.maps.LatLng(lat, lng))
      }
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
          center: new window.kakao.maps.LatLng(36.995050, 127.134444),
          level: 3,
        }
        const map = new window.kakao.maps.Map(mapContainer, mapOption)
        mapRef.current = map

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login")
          return
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude
              const lng = position.coords.longitude
              const currentPos = new window.kakao.maps.LatLng(lat, lng)

              map.setCenter(currentPos)

              new window.kakao.maps.Marker({
                map,
                position: currentPos,
                zIndex: 100,
                title: "현재 위치",
                image: new window.kakao.maps.MarkerImage(
                  "/map/icon2.png",
                  new window.kakao.maps.Size(40, 38)
                )
              })
            },
            () => { /* 위치 조회 실패 무시 */ }
          )
        }

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

  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps) {
      handleMapLoad()
    }
  }, [])

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps || markersRef.current.length === 0) return

    markersRef.current.forEach(({ id, marker }) => {
      const isSelected = id === selectedRestaurantId

      if (isSelected) {
        const selectedImage = new window.kakao.maps.MarkerImage(
          "/map/icon_red.png",
          new window.kakao.maps.Size(38, 40)
        )

        marker.setImage(selectedImage)
        marker.setZIndex(10)
      }
      else {
        const defaultImage = new window.kakao.maps.MarkerImage(
          "/map/icon_black.png",
          new window.kakao.maps.Size(38, 40)
        )
        marker.setImage(defaultImage)
        marker.setZIndex(1)
      }
    })
  }, [selectedRestaurantId])

  // (P) 버튼 클릭 시 지정 좌표로 이동하는 함수
  const moveToPresetPosition = () => {
    if (!mapRef.current) return
    const latLng = new window.kakao.maps.LatLng(36.995050, 127.134444)
    mapRef.current.panTo(latLng)
    setIsSheetOpen(false)
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer,drawing`}
        onLoad={handleMapLoad}
        strategy="afterInteractive"
      />
      <HeaderWithBack title="주변 맛집 찾기" backTF={true} />
      <div className="relative w-full h-screen overflow-hidden max-w-[540px] mx-auto">

        <div
          id="map"
          ref={mapContainerRef}
          className="absolute left-0 right-0 top-0 bottom-0 z-0 transition-all duration-500"
        />

        {/* 우측 상단 (P) 버튼 */}
        <button
          onClick={moveToPresetPosition}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 40,
            backgroundColor: "rgba(13, 97, 27, 0.9)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "6px 10px",
            cursor: "pointer",
            fontWeight: "bold",
            userSelect: "none",
          }}
          aria-label="Move to preset position"
        >
          평택대
        </button>

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

          <div className="p-4 pt-0">
            <h2 className="text-xl font-bold">지도 내 맛집 목록</h2>
          </div>

          <div className="overflow-y-auto max-h-[30vh] px-2">
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