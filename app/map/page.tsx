"use client"
import { useState, useEffect, useRef } from "react"
import Script from "next/script"
import { ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation"
import HeaderWithBack from '@/components/HeaderWithBack';
import { SearchAutocomplete } from "@/components/SearchBar";
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

// kakao 전역 선언
declare global {
  interface Window {
    kakao: any;
  }
}

// 맛집 데이터 구조 정의
interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
  food_type: string[];
  taste_types: string[];
}

// 맛집 리스트 아이템
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
  const [inputValue, setInputValue] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const router = useRouter()

  const mapRef = useRef<any>(null)
  const markersRef = useRef<{ id: string; marker: any; position: { lat: number; lng: number } }[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY as string

  // 주소 → 좌표 변환
  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!window.kakao) return reject("Kakao maps not loaded")
      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
        } else {
          reject("주소 변환 실패")
        }
      })
    })
  }

  // 마커 생성
  const createMarkers = async (map: any, restaurantList: Restaurant[]) => {
    markersRef.current.forEach(({ marker }) => marker.setMap(null))
    markersRef.current = []

    for (const restaurant of restaurantList) {
      try {
        const { lat, lng } = await geocodeAddress(restaurant.address)
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
          clickable: true,
          image: new window.kakao.maps.MarkerImage("/map/icon1.png", new window.kakao.maps.Size(38, 40)),
        })
        marker.setMap(map)

        window.kakao.maps.event.addListener(marker, "click", () => {
          setSelectedRestaurantId(restaurant.restaurant_id)
          setIsSheetOpen(true)
          map.panTo(new window.kakao.maps.LatLng(lat, lng))
        })

        markersRef.current.push({ id: restaurant.restaurant_id, marker, position: { lat, lng } })
      } catch (err) {
        console.warn("마커 생성 실패:", restaurant.address, err)
      }
    }
  }

  // 선택된 맛집 최상단 이동
  useEffect(() => {
    if (!selectedRestaurantId) return
    setRestaurants((prev) => {
      const idx = prev.findIndex(r => r.restaurant_id === selectedRestaurantId)
      if (idx === -1) return prev
      const newArr = [...prev]
      const [selected] = newArr.splice(idx, 1)
      newArr.unshift(selected)
      return newArr
    })
  }, [selectedRestaurantId])

  // 리스트에서 클릭
  const onClickRestaurant = (id: string) => {
    if (selectedRestaurantId === id) {
      router.push(`/restaurants/${id}`)
    } else {
      const markerObj = markersRef.current.find(m => m.id === id)
      if (markerObj && mapRef.current) {
        mapRef.current.panTo(new window.kakao.maps.LatLng(markerObj.position.lat, markerObj.position.lng))
      }
      setSelectedRestaurantId(id)
      setIsSheetOpen(true)
    }
  }

  // 지도 초기화 + 맛집 로드
  const handleMapLoad = async () => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(async () => {
        const container = document.getElementById("map")
        if (!container) return

        const map = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(36.994444, 127.134466),
          level: 3,
        })
        mapRef.current = map

        // 현재 위치
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude
            const current = new window.kakao.maps.LatLng(lat, lng)
            map.setCenter(current)
            new window.kakao.maps.Marker({
              map,
              position: current,
              zIndex: 100,
              title: "현재 위치",
              image: new window.kakao.maps.MarkerImage("/map/pin_icon.png", new window.kakao.maps.Size(40, 38)),
            })
          })
        }

        // DB 불러오기
        const { data, error } = await supabase.from("restaurant").select("*")
        if (error) return console.error(error)
        if (data) {
          setRestaurants(data as Restaurant[])
          setSelectedRestaurantId(data[0].restaurant_id)
          await createMarkers(map, data as Restaurant[])
        }
      })
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps) handleMapLoad()
  }, [])

  // 선택된 마커 강조
  useEffect(() => {
    markersRef.current.forEach(({ id, marker }) => {
      const isSelected = id === selectedRestaurantId
      marker.setImage(new window.kakao.maps.MarkerImage(
        isSelected ? "/map/icon2.png" : "/map/icon1.png",
        new window.kakao.maps.Size(38, 40)
      ))
      marker.setZIndex(isSelected ? 10 : 1)
    })
  }, [selectedRestaurantId])

  // 평택대 버튼
  const moveToPresetPosition = () => {
    if (!mapRef.current) return
    mapRef.current.panTo(new window.kakao.maps.LatLng(36.995555, 127.134466))
    setIsSheetOpen(false)
  }

  // -----------------------
  // ✅ 이름 검색
  // -----------------------
  const handleEnterSearch = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste)")
        .ilike("restaurant_name", `%${inputValue || ""}%`);

      if (error) throw error;

      if (data && data.length > 0 && mapRef.current) {
        const cleaned: Restaurant[] = data.map((item: any) => {
          const profiles = Array.isArray(item.restaurant_profiles)
            ? item.restaurant_profiles
            : item.restaurant_profiles
            ? [item.restaurant_profiles]
            : [];
          const typeSet = new Set<string>();
          const tasteSet = new Set<string>();
          profiles.forEach((p: any) => {
            (p.type || []).forEach((t: string) => typeSet.add(t));
            (p.taste || []).forEach((t: string) => tasteSet.add(t));
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

        setRestaurants(cleaned);
        await createMarkers(mapRef.current, cleaned);

        const first = cleaned[0];
        setSelectedRestaurantId(first.restaurant_id);
        const markerObj = markersRef.current.find(m => m.id === first.restaurant_id);
        if (markerObj) {
          mapRef.current.panTo(new window.kakao.maps.LatLng(markerObj.position.lat, markerObj.position.lng));
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
  // ✅ 필터 검색
  // -----------------------
  const handleFilterSearch = async (params: {
    selectedFoodTypes: string[];
    selectedTasteTypes: string[];
    tasteSearchLogic: "AND" | "OR";
  }) => {
    try {
      let query = supabase.from("restaurant_profiles").select("restaurant_id");

      if (params.selectedFoodTypes.length > 0) {
        query = query.overlaps("type", params.selectedFoodTypes);
      }
      if (params.selectedTasteTypes.length > 0) {
        if (params.tasteSearchLogic === "AND") {
          params.selectedTasteTypes.forEach((taste) => {
            query = query.contains("taste", [taste]);
          });
        } else {
          query = query.overlaps("taste", params.selectedTasteTypes);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0 && mapRef.current) {
        const ids = data.map((d) => d.restaurant_id);
        const { data: restaurantsData, error: rErr } = await supabase
          .from("restaurant")
          .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste)")
          .in("restaurant_id", ids);
        if (rErr) throw rErr;

        if (restaurantsData) {
          const cleaned: Restaurant[] = restaurantsData.map((item: any) => {
            const profiles = Array.isArray(item.restaurant_profiles)
              ? item.restaurant_profiles
              : item.restaurant_profiles
              ? [item.restaurant_profiles]
              : [];
            const typeSet = new Set<string>();
            const tasteSet = new Set<string>();
            profiles.forEach((p: any) => {
              (p.type || []).forEach((t: string) => typeSet.add(t));
              (p.taste || []).forEach((t: string) => tasteSet.add(t));
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

          setRestaurants(cleaned);
          await createMarkers(mapRef.current, cleaned);

          if (cleaned.length > 0) {
            const first = cleaned[0];
            setSelectedRestaurantId(first.restaurant_id);
            const markerObj = markersRef.current.find(m => m.id === first.restaurant_id);
            if (markerObj) {
              mapRef.current.panTo(new window.kakao.maps.LatLng(markerObj.position.lat, markerObj.position.lng));
            }
          }
        }
      }

      setIsFilterOpen(false);
      setIsSheetOpen(true);
    } catch (err) {
      console.error("필터 검색 오류", err);
    }
  };

  // -----------------------
  // JSX
  // -----------------------
  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer,drawing`}
        onLoad={handleMapLoad}
        strategy="afterInteractive"
      />

      <HeaderWithBack title="주변 맛집 찾기" backTF={true} />

      {/* 검색창 + 필터 */}
      <div className="fixed top-[45px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between p-2 bg-white shadow">
        <div className="flex-1 mr-2">
          <SearchAutocomplete value={inputValue} onChange={setInputValue} onEnter={handleEnterSearch} />
        </div>

        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-[540px] flex flex-col">
            <SheetTitle className="sr-only">검색 필터</SheetTitle>
            <SearchFilter_ver3 onSearch={handleFilterSearch} loading={false} sideTF={true} />
          </SheetContent>
        </Sheet>
      </div>

      {/* 지도 */}
      <div className="relative w-full max-w-[540px] mx-auto h-[calc(95vh-90px)]">
        <div id="map" ref={mapContainerRef} className="absolute inset-0" />

        <button
          onClick={moveToPresetPosition}
          className="absolute top-[80px] right-3 z-40 bg-green-800 text-white px-3 py-1 rounded shadow"
        >
          평택대
        </button>

        {/* 하단 시트 */}
        <div
          ref={sheetRef}
          className={cn(
            "fixed bottom-7.5 left-0 right-0 max-w-[540px] mx-auto bg-white rounded-t-2xl shadow transition-transform duration-300 z-20",
            isSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]"
          )}
        >
          <button onClick={() => setIsSheetOpen(!isSheetOpen)} className="w-full h-12 flex justify-center items-center">
            {isSheetOpen ? <ChevronDown className="h-6 w-6 text-gray-400" /> : <ChevronUp className="h-6 w-6 text-gray-400" />}
          </button>

          <div className="p-4 pt-0">
            <h2 className="text-xl font-bold">지도 내 맛집 목록</h2>
          </div>

          <div className="overflow-y-auto max-h-[30vh] px-2">
            <div className="space-y-2 pb-4">
              {restaurants.map((r) => (
                <div
                  key={r.restaurant_id}
                  onClick={() => onClickRestaurant(r.restaurant_id)}
                  className={cn(
                    "rounded-xl transition-all cursor-pointer",
                    selectedRestaurantId === r.restaurant_id && "bg-blue-50 ring-2 ring-blue-500"
                  )}
                >
                  <RestaurantListItem restaurant={r} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
