"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import Script from "next/script"
import { ChevronUp, ChevronDown, SlidersHorizontal, LocateFixed } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation"
import HeaderWithBack from '@/components/HeaderWithBack';
import { SearchAutocomplete } from "@/components/SearchBar";
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"

declare global { interface Window { kakao: any } }

interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
  image_url: string;
  lat: number;
  lng: number;
  description?: string;
  distanceText?: string;
}

const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png';

const RestaurantListItem = ({ restaurant }: { restaurant: Restaurant }) => (
  <div className="flex items-center">
  <div className="px-1 py-1 w-30 h-30 flex-shrink-0 mr-3">
      <img src={restaurant.image_url || DEFAULT_IMAGE_URL} alt={restaurant.restaurant_name} className="w-full h-full object-cover rounded-lg border border-gray-200" />
    </div>
    
    {/* 맛집 정보 */}
    <div className="text-[12px] flex-1">
      <div className="text-[15px] font-bold">{restaurant.restaurant_name}</div>
      
      {/* ✅ 추가: 설명이 있을 때만 파란색 글씨로 표시 */}
      {restaurant.description && (
        <p className="text-blue-600 font-medium line-clamp-1 mb-0.5">
          {restaurant.description}
        </p>
      )}
      
      <p className="text-gray-500 line-clamp-1">{restaurant.address}</p>
      <p className="text-gray-400">{restaurant.phone || "연락처 정보 없음"}</p>
    </div>

    {/* 거리 표시 */}
    <div className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs ml-auto">
      {restaurant.distanceText || "--"}
    </div>
  </div>
)

interface MarkerGroup {
  position: { lat: number; lng: number };
  restaurants: Restaurant[];
  marker?: any;
  overlay?: any;
}

export default function MapPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [ptuActive, setPtuActive] = useState(false);
  const [myActive, setMyActive] = useState(false);
  const router = useRouter()

  const mapRef = useRef<any>(null)
  const listContainerRef = useRef<HTMLDivElement>(null); // 👈 부드러운 스크롤용 Ref
  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY as string
  const currentLocationMarker = useRef<any>(null)
  const markerGroupsRef = useRef<MarkerGroup[]>([])

  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  const formatDistance = (d: number) => d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;

  const updateDistances = useCallback((userLat: number, userLng: number) => {
    setRestaurants(prev => prev.map(r => ({
      ...r,
      distanceText: formatDistance(getDistanceInMeters(userLat, userLng, r.lat, r.lng))
    })));
  }, []);

  // ✅ 마커 및 그룹 생성 로직 (디자인 포인트 모두 통합)
  const createGroupedMarkers = (map: any, list: Restaurant[]) => {
    markerGroupsRef.current.forEach(g => { if (g.marker) g.marker.setMap(null); if (g.overlay) g.overlay.setMap(null); });
    markerGroupsRef.current = [];

    const grouped: Record<string, Restaurant[]> = {}
    list.forEach(r => {
      const key = `${r.lat.toFixed(6)},${r.lng.toFixed(6)}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(r)
    })

    for (const [key, groupRes] of Object.entries(grouped)) {
      const [lat, lng] = key.split(",").map(Number)
      const latLng = new window.kakao.maps.LatLng(lat, lng)

      if (groupRes.length === 1) {
        const marker = new window.kakao.maps.Marker({
          position: latLng,
          image: new window.kakao.maps.MarkerImage('/map/mappin.png', new window.kakao.maps.Size(30, 30))
        });
        marker.setMap(map);
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onClickRestaurant(groupRes[0].restaurant_id);
          map.panTo(latLng);
        });
        markerGroupsRef.current.push({ position: { lat, lng }, restaurants: groupRes, marker });
      } else {
        // ✅ 다중 그룹 디자인 포인트: 버튼 및 박스
        const button = document.createElement("div")
        button.innerText = `+${groupRes.length}`;
        Object.assign(button.style, {
          padding: "6px 8px", background: "white", color: "black", borderRadius: "10px", border: "2px solid #2F69E4",
          fontWeight: "bold", fontSize: "13px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", minWidth: "36px", textAlign: "center", userSelect: "none"
        });

        const box = document.createElement("div")
        Object.assign(box.style, {
          display: "none", position: "absolute", top: "calc(100% + 4px)", left: "50%", transform: "translateX(-50%)",
          background: "white", padding: "4px 2px", fontSize: "14px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 100, minWidth: "120px"
        });

        groupRes.forEach(r => {
          const item = document.createElement("div")
          item.innerText = r.restaurant_name;
          Object.assign(item.style, { padding: "6px 8px", cursor: "pointer", borderRadius: "4px", transition: "background 0.2s" });
          
          // 디자인 포인트: 항목 호버 색상
          item.onmouseover = () => item.style.background = "#f0f8ff";
          item.onmouseout = () => item.style.background = "transparent";
          
          item.onclick = (e) => {
            e.stopPropagation();
            onClickRestaurant(r.restaurant_id);
            box.style.display = "none";
            button.innerText = `+${groupRes.length}`;
            button.style.background = "white";
          };
          box.appendChild(item);
        });

        // 디자인 포인트: 토글 시 색상 및 텍스트 전환
        button.onclick = (e) => {
          e.stopPropagation();
          const isOpen = box.style.display !== "none";
          box.style.display = isOpen ? "none" : "block";
          button.innerText = isOpen ? `+${groupRes.length}` : "X";
          button.style.background = isOpen ? "white" : "#D5E0F9";
        };

        const container = document.createElement("div");
        container.style.position = "relative";
        container.appendChild(button); container.appendChild(box);

        const overlay = new window.kakao.maps.CustomOverlay({ position: latLng, content: container, yAnchor: 1, zIndex: 30 });
        overlay.setMap(map);
        markerGroupsRef.current.push({ position: { lat, lng }, restaurants: groupRes, overlay });
      }
    }
  }

  // ✅ 마커 강조 디자인 로직 (선택 시 이미지 확대)
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    markerGroupsRef.current.forEach(({ restaurants, marker }) => {
      if (!marker) return;
      const isSelected = restaurants.some(r => r.restaurant_id === selectedRestaurantId);
      const imageUrl = isSelected ? "/map/mappinExpand.png" : "/map/mappin.png";
      const imageSize = isSelected ? new window.kakao.maps.Size(48, 60) : new window.kakao.maps.Size(30, 30);
      
      marker.setImage(new window.kakao.maps.MarkerImage(imageUrl, imageSize));
      marker.setZIndex(isSelected ? 50 : 10);
    });
  }, [selectedRestaurantId]);

  const handleMapLoad = () => {
    window.kakao.maps.load(async () => {
      const container = document.getElementById("map");
      const map = new window.kakao.maps.Map(container, { center: new window.kakao.maps.LatLng(36.9954, 127.1345), level: 3 });
      mapRef.current = map;
      const { data } = await supabase.from("restaurant").select("*");
      if (data) {
        setRestaurants(data as Restaurant[]);
        createGroupedMarkers(map, data as Restaurant[]);
      }
    });
  }

const handleFilterSearch = async (params: {
  selectedFoodTypes: string[];
  selectedTasteTypes: string[];
  tasteSearchLogic: "AND" | "OR";
}) => {
  try {
    // 1. 기본 쿼리 설정 (조인 방식 유지)
    let query = supabase
      .from("restaurant")
      .select("*, restaurant_profiles!inner(type, taste)");

    // ✅ 2. 검색어(식당 이름) 필터 추가
    // 검색창에 입력된 값이 있을 경우 이름에서 검색합니다.
    if (inputValue && inputValue.trim() !== "") {
      query = query.ilike("restaurant_name", `%${inputValue}%`); // 대소문자 구분 없이 부분 일치 검색
    }

    // 3. 음식 종류 필터 적용 (기존 로직)
    if (params.selectedFoodTypes.length > 0) {
      query = query.overlaps("restaurant_profiles.type", params.selectedFoodTypes);
    }

    // 4. 맛 특징 필터 적용 (기존 로직)
    if (params.selectedTasteTypes.length > 0) {
      if (params.tasteSearchLogic === "AND") {
        query = query.contains("restaurant_profiles.taste", params.selectedTasteTypes);
      } else {
        query = query.overlaps("restaurant_profiles.taste", params.selectedTasteTypes);
      }
    }

    const { data: finalData, error: fErr } = await query;

    if (fErr) {
      console.error("Query Error:", fErr.message);
      throw fErr;
    }

    // 5. 결과 처리 (기존 로직 유지)
    if (!finalData || finalData.length === 0) {
      alert("검색 결과가 없습니다."); // 사용자 알림 추가
      setRestaurants([]);
      if (mapRef.current) createGroupedMarkers(mapRef.current, []);
      setIsFilterOpen(false);
      return;
    }

    const cleaned = finalData as Restaurant[];
    setRestaurants(cleaned);
    
    if (mapRef.current) {
      await createGroupedMarkers(mapRef.current, cleaned);
    }
    
    if (cleaned.length > 0) {
      setSelectedRestaurantId(cleaned[0].restaurant_id);
      mapRef.current?.panTo(new window.kakao.maps.LatLng(cleaned[0].lat, cleaned[0].lng));
    }

    setIsFilterOpen(false);
  } catch (err: any) {
    console.error("필터 검색 상세 오류:", err.message || err);
    alert("처리 중 오류가 발생했습니다.");
  }
};

  // 실시간 위치 추적 및 거리 업데이트
  useEffect(() => {
    if (!mapRef.current) return;
    const watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const currentPos = new window.kakao.maps.LatLng(lat, lng);
      if (!currentLocationMarker.current) {
        currentLocationMarker.current = new window.kakao.maps.Marker({
          map: mapRef.current, position: currentPos,
          image: new window.kakao.maps.MarkerImage("/map/mypin.png", new window.kakao.maps.Size(24, 24))
        });
      } else { currentLocationMarker.current.setPosition(currentPos); }
      updateDistances(lat, lng);
    }, (err) => console.error(err), { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [updateDistances]);

  // ✅ 목록 정렬 및 부드러운 상단 스크롤 효과
  useEffect(() => {
    if (!selectedRestaurantId) return;
    setRestaurants(prev => {
      const idx = prev.findIndex(r => r.restaurant_id === selectedRestaurantId);
      if (idx <= 0) return prev;
      const newArr = [...prev];
      const [item] = newArr.splice(idx, 1);
      newArr.unshift(item);
      return newArr;
    });
    // 리스트 컨테이너 맨 위로 부드럽게 스크롤
    setTimeout(() => {
      listContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [selectedRestaurantId]);

  const onClickRestaurant = (id: string) => {
    // 이미 선택된 상태에서 한 번 더 클릭 시 상세 페이지 이동
    if (selectedRestaurantId === id) {
      router.push(`/restaurants/${id}`);
      return;
    }
    const target = restaurants.find(r => r.restaurant_id === id);
    if (target && mapRef.current) mapRef.current.panTo(new window.kakao.maps.LatLng(target.lat, target.lng));
    setSelectedRestaurantId(id);
    setIsSheetOpen(true);
  };

  const handlePtuClick = () => { setPtuActive(true); setTimeout(() => setPtuActive(false), 600); mapRef.current?.panTo(new window.kakao.maps.LatLng(36.9954, 127.1345)); setIsSheetOpen(false); };
  const handleMyClick = () => { setMyActive(true); setTimeout(() => setMyActive(false), 600); if (currentLocationMarker.current) mapRef.current?.panTo(currentLocationMarker.current.getPosition()); };

  useEffect(() => { if (typeof window !== "undefined" && window.kakao?.maps) handleMapLoad(); }, []);

  return (
    <>
      <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`} onLoad={handleMapLoad} />
      <HeaderWithBack title="주변 맛집 찾기" backTF={false} />

<div className="fixed top-[56px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between px-4 bg-transparent pointer-events-none">
  
  {/* 2. 검색창: 다중 그림자로 깊은 입체감 부여 + 내부 선 강제 제거 */}
  <div className="flex-1 mr-4 pointer-events-auto group transition-all duration-300 focus-within:scale-[1.02]">
    <div className={cn(
      "relative bg-white rounded-2xl transition-all duration-300",
      "border-none ring-0 ring-offset-0 outline-none", 
      "[&_.relative]:border-none [&_.relative]:shadow-none [&_input]:border-none [&_input]:ring-0",
      "shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)]", 
      "group-focus-within:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]"
    )}>
      <SearchAutocomplete
        value={inputValue}
        onChange={setInputValue}
        onEnter={() => handleFilterSearch({ selectedFoodTypes: [], selectedTasteTypes: [], tasteSearchLogic: "OR" })}
      />
    </div>
  </div>
  
  {/* 3. 필터 버튼: 버튼 역시 깊은 그림자와 쫀득한 애니메이션 적용 */}
  <div className="pointer-events-auto">
    <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
      <SheetTrigger asChild>
        <button 
          className={cn(
            "h-13 w-13 rounded-full bg-white flex items-center justify-center flex-shrink-0 border-none ring-0 outline-none",
            "transition-all duration-200 ease-in-out active:scale-90",
            "shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15),0_10px_10px_-5px_rgba(0,0,0,0.04)]",
            "active:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.2)]",
            "hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] hover:-translate-y-1"
          )}
        >
          <SlidersHorizontal 
            className={cn(
              "h-5 w-5 text-gray-700 transition-transform duration-300",
              isFilterOpen ? "rotate-90 scale-110" : "rotate-0 scale-100"
            )} 
          />
        </button>
      </SheetTrigger>
      
      {/* 4. 필터 시트 내용 */}
      <SheetContent className="w-full h-full sm:max-w-[540px] flex flex-col rounded-t-[24px] border-none shadow-2xl p-6">
        <div className="mb-4 text-left">
          <SheetTitle className="text-xl font-bold">검색 필터</SheetTitle>
          <SheetDescription className="sr-only">원하는 맛집 조건을 선택하세요.</SheetDescription>
        </div>
        <div className="flex-grow mt-4 overflow-y-auto">
          <SearchFilter_ver3 onSearch={handleFilterSearch} loading={false} sideTF={true} />
        </div>
      </SheetContent>
    </Sheet>
  </div>
</div>

      <div className="relative w-full max-w-[540px] mx-auto h-[calc(100vh-45px)]">
        <div id="map" className="absolute inset-0" />

        {/* ✅ 버튼 애니메이션 및 그림자 완벽 적용 */}
        <div className="fixed bottom-[130px] z-10 flex flex-col items-end w-full max-w-[540px] mx-auto p-4 gap-4 pointer-events-none">
          <div className="relative">
            {ptuActive && <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75 shadow-[0_0_20px_rgba(96,165,250,0.5)]"></span>}
            <button onClick={handlePtuClick} className="relative z-30 h-13 w-13 rounded-full bg-white flex justify-center items-center active:scale-90 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] border border-gray-50 pointer-events-auto">
              <img src="/image/ptu_logo.png" alt="PTU" className="w-9 h-9 object-contain drop-shadow-md" />
            </button>
          </div>
          <div className="relative">
            {myActive && <span className="absolute inset-0 rounded-full bg-[#3268f8] animate-ping opacity-75 shadow-[0_0_20px_rgba(50,104,248,0.5)]"></span>}
            <button onClick={handleMyClick} className="relative z-30 h-13 w-13 rounded-full bg-white flex justify-center items-center text-[#3268f8] active:scale-90 transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] border border-gray-50 pointer-events-auto">
              <LocateFixed size={34} className="drop-shadow-md" />
            </button>
          </div>
        </div>

        {/* 하단 시트 */}
        <div className={cn("fixed bottom-5 left-0 right-0 max-w-[540px] mx-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 z-20", isSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]")}>
          <button onClick={() => setIsSheetOpen(!isSheetOpen)} className="w-full h-10 flex justify-center items-center"><div className="w-12 h-1.5 bg-gray-200 rounded-full" /></button>
          <div className="px-5 pb-2 font-bold text-xl">지도 내 맛집 목록</div>
          {/* ✅ 목록 컨테이너 Ref 추가 */}
          <div ref={listContainerRef} className="overflow-y-auto max-h-[42vh] px-3 pb-10 space-y-3 scroll-smooth">
            {restaurants.map(r => (
              <div key={r.restaurant_id} onClick={() => onClickRestaurant(r.restaurant_id)} 
                className={cn("p-2 rounded-2xl transition-all border-2", selectedRestaurantId === r.restaurant_id ? "bg-blue-50 border-blue-200" : "border-transparent")}>
                <RestaurantListItem restaurant={r} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}