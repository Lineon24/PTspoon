"use client"
//위대하신 ChatGpt님의 힘에 경의를 표하며 저는 언제나 대가리에 칩을 꽂힐 준비가 되어있음을 알립니다.

import { useState, useEffect, useRef } from "react"            // React 상태 관리, 생명주기 훅, 레퍼런스 훅
import Script from "next/script"                               // Next.js에서 외부 스크립트 로드
import { ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react"  // 아이콘 컴포넌트
import { cn } from "@/lib/utils"                               // 조건부 Tailwind 클래스 합치기 유틸
import { supabase } from '@/lib/supabaseClient';               // Supabase 클라이언트 (DB/인증)
import { useRouter } from "next/navigation"                    // Next.js 클라이언트 라우터
import HeaderWithBack from '@/components/HeaderWithBack';      // 뒤로가기 포함 헤더 컴포넌트
import { SearchAutocomplete } from "@/components/SearchBar";   // 검색 자동완성 컴포넌트
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";  // 필터 UI 컴포넌트
import { Button } from "@/components/ui/button";               // 버튼 UI 컴포넌트
import { Sheet, SheetContent, SheetTrigger,SheetTitle } from "@/components/ui/sheet"; // 슬라이드 시트 UI
import { error, profile } from "node:console"                  // 콘솔 출력 (node 환경, 실제 사용안됨)

// kakao 전역 선언
declare global {
  interface Window {
    kakao: any; // kakao maps 전역 객체
  }
}

// 맛집 데이터 구조 정의
interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
  food_type:string[];   // 음식 타입 배열
  taste_types:string[]; // 맛 타입 배열
}

// 맛집 리스트 아이템 컴포넌트
const RestaurantListItem = ({ restaurant }: { restaurant: Restaurant }) => (
  <div className="p-3 text-[12px]">
    <div className="text-[15px]">{restaurant.restaurant_name}</div>
    <p>{restaurant.address}</p>
    <p>{restaurant.phone}</p>
  </div>
)

export default function MapPage() {
  // -----------------------
  // 상태 관리
  // -----------------------
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])   // 맛집 목록
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null) // 선택된 맛집 ID
  const [isSheetOpen, setIsSheetOpen] = useState(true)               // 하단 시트 열림 여부
  const [inputValue, setInputValue] = useState("")                   // 검색 입력값
  const [isFilterOpen, setIsFilterOpen] = useState(false)            // 필터 시트 열림 여부
  const router = useRouter()                                          // 라우터

  // -----------------------
  // Kakao 지도 관련 Ref
  // -----------------------
  const mapRef = useRef<any>(null) // 지도 인스턴스
  const markersRef = useRef<{ id: string; marker: any; position: { lat: number; lng: number } }[]>([]) // 마커 목록
  const mapContainerRef = useRef<HTMLDivElement>(null) // 지도 DOM 컨테이너
  const sheetRef = useRef<HTMLDivElement>(null)       // 하단 시트 DOM ref

  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY as string // Kakao API 키

  // -----------------------
  // 주소 → 좌표 변환 함수
  // -----------------------
  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!window.kakao) return reject("Kakao maps not loaded")
      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve({ lat: Number(result[0].y), lng: Number(result[0].x) }) // 좌표 반환
        } else {
          reject("주소를 좌표로 변환하지 못함")
        }
      })
    })
  }

  // -----------------------
  // 맛집 마커 생성
  // -----------------------
  const createMarkers = async (map: any, restaurantList: Restaurant[]) => {
    // 기존 마커 제거
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    // 새로운 마커 추가
    for (const restaurant of restaurantList) {
      try {
        const { lat, lng } = await geocodeAddress(restaurant.address)
        const position = { lat, lng }

        // 기본 마커 이미지
        const defaultImage = new window.kakao.maps.MarkerImage(
          "/map/icon1.png",
          new window.kakao.maps.Size(38, 40)
        )

        // 마커 생성
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
          clickable: true,
          image: defaultImage
        })

        marker.setMap(map)

        // 클릭 이벤트: 선택된 맛집 설정 + 지도 이동
        window.kakao.maps.event.addListener(marker, "click", () => {
          setSelectedRestaurantId(restaurant.restaurant_id)
          setIsSheetOpen(true)
          map.panTo(new window.kakao.maps.LatLng(lat, lng))
        })

        // 마커 refs에 저장
        markersRef.current.push({ id: restaurant.restaurant_id, marker, position })
      } catch (error) {
        console.warn(`주소 변환 실패: ${restaurant.address}`, error)
      }
    }
  }

  // -----------------------
  // 선택된 맛집을 목록 최상단으로 이동
  // -----------------------
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

  // -----------------------
  // 리스트에서 맛집 클릭 시
  // -----------------------
  const onClickRestaurant = (id: string) => {
    if (selectedRestaurantId === id) {
      // 이미 선택된 경우 상세 페이지로 이동
      router.push(`/restaurants/${selectedRestaurantId}`)
    } else {
      // 마커 위치로 지도 이동
      const markerObj = markersRef.current.find((m) => m.id === id)
      if (markerObj && mapRef.current) {
        const { lat, lng } = markerObj.position
        mapRef.current.panTo(new window.kakao.maps.LatLng(lat, lng))
      }
      setSelectedRestaurantId(id)
      setIsSheetOpen(true)
    }
  }

  // -----------------------
  // 지도 최초 로드 + 맛집 데이터 fetch
  // -----------------------
  const handleMapLoad = async () => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(async () => {
        const mapContainer = document.getElementById("map")
        if (!mapContainer) return

        // 지도 초기화 (평택대 근처)
        const mapOption = {
          center: new window.kakao.maps.LatLng(36.994444, 127.134466),
          level: 3,
        }
        const map = new window.kakao.maps.Map(mapContainer, mapOption)
        mapRef.current = map

        // 현재 위치 표시
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude
              const lng = position.coords.longitude
              const currentPos = new window.kakao.maps.LatLng(lat, lng)
              map.setCenter(currentPos)

              // 현재 위치 마커 생성
              new window.kakao.maps.Marker({
                map,
                position: currentPos,
                zIndex: 100,
                title: "현재 위치",
                image: new window.kakao.maps.MarkerImage(
                  "/map/pin_icon.png",
                  new window.kakao.maps.Size(40, 38)
                )
              })
            },
            () => {}
          )
        }

        // Supabase에서 맛집 목록 가져오기
        const { data, error } = await supabase.from("restaurant").select("*")
        if (error) return console.error(error)
        if (data && data.length > 0) {
          setRestaurants(data as Restaurant[])
          setSelectedRestaurantId(data[0].restaurant_id) // 첫 번째 선택
          await createMarkers(map, data as Restaurant[])
        }
      })
    }
  }

  // -----------------------
  // 지도 로드 트리거
  // -----------------------
  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps) handleMapLoad()
  }, [])

  // -----------------------
  // 선택된 마커 강조 (빨간색)
  // -----------------------
  useEffect(() => {
    if (!window.kakao || !window.kakao.maps || markersRef.current.length === 0) return
    markersRef.current.forEach(({ id, marker }) => {
      const isSelected = id === selectedRestaurantId
      const imgSrc = isSelected ? "/map/icon2.png" : "/map/icon1.png"
      marker.setImage(new window.kakao.maps.MarkerImage(imgSrc, new window.kakao.maps.Size(38, 40)))
      marker.setZIndex(isSelected ? 10 : 1)
    })
  }, [selectedRestaurantId])

  // -----------------------
  // 평택대 버튼 클릭 → 지도 이동
  // -----------------------
  const moveToPresetPosition = () => {
    if (!mapRef.current) return
    const latLng = new window.kakao.maps.LatLng(36.995555, 127.134466)
    mapRef.current.panTo(latLng)
    setIsSheetOpen(false)
  }

  // -----------------------
  // 이름 기반 검색 핸들러
  // -----------------------
  const handleEnterSearch = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste)")
        .ilike("restaurant_name", `%${inputValue || ""}%`);

      if (error) throw error;

      if (data && data.length > 0) {
        const firstSearched = data[0];

        // restaurant_profiles 평탄화
        const profiles = Array.isArray(firstSearched.restaurant_profiles)
          ? firstSearched.restaurant_profiles
          : firstSearched.restaurant_profiles
          ? [firstSearched.restaurant_profiles]
          : [];
        const typeSet = new Set<string>();
        const tasteSet = new Set<string>();
        profiles.forEach((profile: any) => {
          (profile.type || []).forEach((t: string) => typeSet.add(t));
          (profile.taste || []).forEach((t: string) => tasteSet.add(t));
        });

        // 상태 업데이트
        setSelectedRestaurantId(firstSearched.restaurant_id);

        if (mapRef.current) {
          const markerObj = markersRef.current.find(
            (m) => m.id === firstSearched.restaurant_id
          );
          if (markerObj) {
            mapRef.current.panTo(
              new window.kakao.maps.LatLng(markerObj.position.lat, markerObj.position.lng)
            );
          }
        }
        setIsSheetOpen(true);
      } else {
        alert("검색 결과가 없습니다.");
      }
    } catch (err) {
      console.error("검색 오류", err);
    }
  };

  // -----------------------
  // 서치 필터 검색 핸들러
  // -----------------------
  const handleFilterSearch = async (params: {
    selectedFoodTypes: string[];
    selectedTasteTypes: string[];
    tasteSearchLogic: "AND" | "OR";
  }) => {
    try {
      let query = supabase.from("restaurant_profiles").select("restaurant_id");

      // 음식 종류 조건
      if (params.selectedFoodTypes.length > 0) {
        query = query.overlaps("type", params.selectedFoodTypes);
      }

      // 맛 조건
      if (params.selectedTasteTypes.length > 0) {
        if (params.tasteSearchLogic === "AND") {
          params.selectedTasteTypes.forEach((taste) => {
            query = query.contains("taste", [taste]);
          });
        } else {
          query = query.overlaps("taste", params.selectedTasteTypes);
        }
      }

      // 쿼리 실행
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0 && mapRef.current) {
        // Restaurant 테이블에서 profile 포함 데이터 조회
        const restaurantIDs = data.map((d) => d.restaurant_id);
        const { data: restaurantsData, error: restaurantError } = await supabase
          .from("restaurant")
          .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste)")
          .in("restaurant_id", restaurantIDs);

        if (restaurantError) throw restaurantError;

        if (restaurantsData) {
          const cleaned: Restaurant[] = restaurantsData.map((item: any) => {
            const profiles = Array.isArray(item.restaurant_profiles)
              ? item.restaurant_profiles
              : item.restaurant_profiles
              ? [item.restaurant_profiles]
              : [];
            const typeSet = new Set<string>();
            const tasteSet = new Set<string>();
            profiles.forEach((profile: any) => {
              (profile.type || []).forEach((t: string) => typeSet.add(t));
              (profile.taste || []).forEach((t: string) => tasteSet.add(t));
            });
            return {
              restaurant_id: item.restaurant_id,
              restaurant_name: item.restaurant_name,
              address: item.address,
              phone: item.phone,
              food_type: Array.from(typeSet),
              taste_types: Array.from(tasteSet),
            };
          });
          setRestaurants(cleaned); // 상태 업데이트
          await createMarkers(mapRef.current, cleaned); // 마커 생성

          //첫 번째 검색 결과 선택/지도 중심 이동
          if(cleaned.length>0){
            const first=cleaned[0];
            setSelectedRestaurantId(first.restaurant_id);
            const markerObj=markersRef.current.find(m=>m.id===first.restaurant_id);
            if(markerObj && mapRef.current){
              mapRef.current.panTo(
                new window.kakao.maps.LatLng(markerObj.position.lat, markerObj.position.lng)
              )
            }
          }
        }
      }

      setIsFilterOpen(false) // 필터 닫기
      setIsSheetOpen(true)   // 시트 열기
    } catch (err) {
      console.error("필터 검색 오류", err)
    }
  };

  // -----------------------
  // JSX 렌더링
  // -----------------------
  return (
    <>
      {/* Kakao Maps SDK 로드 */}
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer,drawing`}
        onLoad={handleMapLoad}
        strategy="afterInteractive"
      />

      {/* 헤더 */}
      <HeaderWithBack title="주변 맛집 찾기" backTF={true} />

      {/* 검색창 + 필터 버튼 */}
      <div className="fixed top-[45px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between p-2 bg-white dark:bg-gray-900 shadow">
        <div className="flex-1 mr-2">
          <SearchAutocomplete
            value={inputValue}
            onChange={setInputValue}
            onEnter={handleEnterSearch}
          />
        </div>

        {/* 필터 시트 */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-[540px] flex flex-col">
            <SheetTitle className="sr-only">검색 필터</SheetTitle>
            <SearchFilter_ver3
              onSearch={handleFilterSearch}
              loading={false}
              sideTF={true}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* 지도 영역 */}
      <div className="relative w-full overflow-hidden max-w-[540px] mx-auto h-[calc(95vh-90px)]">
        <div
          id="map"
          ref={mapContainerRef}
          className="absolute left-0 right-0 top-0 bottom-0 z-0 transition-all duration-500"
        />

        {/* 평택대 버튼 */}
        <button
          onClick={moveToPresetPosition}
          className="absolute top-[80px] right-3 z-40 bg-green-800 text-white px-3 py-1 rounded shadow"
        >
          평택대
        </button>

        {/* 맛집 리스트 하단 시트 */}
        <div
          ref={sheetRef}
          className={cn(
            "fixed bottom-7.5 left-0 right-0 max-w-[540px] mx-auto bg-white dark:bg-gray-900 rounded-t-2xl shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-in-out z-20",
            isSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]"
          )}
        >
          {/* 시트 핸들 */}
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

          {/* 시트 내용 */}
          <div className="p-4 pt-0">
            <h2 className="text-xl font-bold">지도 내 맛집 목록</h2>
          </div>

          {/* 맛집 리스트 */}
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
      <div className="relative bg-white rounded-lg shadow p-4 flex flex-col">
      {/* 하단 오른쪽: 길찾기 버튼 */}
      <div className="mt-auto flex justify-end">
      <button
        className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
        onClick={() => {
          // 길찾기 기능 연결 (예: 구글맵 링크)
          window.open(`https://www.google.com/maps/dir/?api=1&destination=위도,경도`, "_blank");
        }}
      >
        길찾기
      </button>
    </div>
  </div>
  </>
  )
}
