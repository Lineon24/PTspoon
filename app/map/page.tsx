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
    <div className="text-[12px] flex-1">
      <div className="text-[15px] font-bold">{restaurant.restaurant_name}</div>
      {restaurant.description && (
        <p className="text-blue-600 font-medium line-clamp-1 mb-0.5">{restaurant.description}</p>
      )}
      <p className="text-gray-500 line-clamp-1">{restaurant.address}</p>
      <p className="text-gray-400">{restaurant.phone || "연락처 정보 없음"}</p>
    </div>
    <div className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs ml-auto">
      {restaurant.distanceText || "거리 계산 중"}
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
  const listContainerRef = useRef<HTMLDivElement>(null);
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
    const map = new window.kakao.maps.Map(container, { 
      center: new window.kakao.maps.LatLng(36.9954, 127.1345), 
      level: 3 
    });
    mapRef.current = map;

    // [핵심 추가] 지도가 로드되자마자 내 위치 가져와서 마커 찍기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const currentPos = new window.kakao.maps.LatLng(lat, lng);

        // 1. 마커가 아직 없을 때만 생성
        if (!currentLocationMarker.current) {
          currentLocationMarker.current = new window.kakao.maps.Marker({
            map: map,
            position: currentPos,
            image: new window.kakao.maps.MarkerImage("/map/mypin.png", new window.kakao.maps.Size(22, 22)),
            zIndex: 100 // 식당 마커보다 위에 오도록
          });
        }
        
        // 2. 거리 계산 업데이트
        updateDistances(lat, lng);
      }, (err) => console.log("초기 위치 획득 실패", err));
    }

    // 식당 데이터 로드 로직...
    const { data } = await supabase.from("restaurant").select("*");
    if (data) {
      setRestaurants(data);
      createGroupedMarkers(map, data);
    }
  });
};


  const handleFilterSearch = async (params: {
    selectedFoodTypes: string[];
    selectedTasteTypes: string[];
    tasteSearchLogic: "AND" | "OR";
  }) => {
    try {
      let query = supabase.from("restaurant").select("*, restaurant_profiles!inner(type, taste)");
      if (inputValue && inputValue.trim() !== "") {
        query = query.ilike("restaurant_name", `%${inputValue}%`);
      }
      if (params.selectedFoodTypes.length > 0) {
        query = query.overlaps("restaurant_profiles.type", params.selectedFoodTypes);
      }
      if (params.selectedTasteTypes.length > 0) {
        if (params.tasteSearchLogic === "AND") {
          query = query.contains("restaurant_profiles.taste", params.selectedTasteTypes);
        } else {
          query = query.overlaps("restaurant_profiles.taste", params.selectedTasteTypes);
        }
      }

      const { data: finalData, error: fErr } = await query;
      if (fErr) throw fErr;

      if (!finalData || finalData.length === 0) {
        alert("검색 결과가 없습니다.");
        setRestaurants([]);
        if (mapRef.current) createGroupedMarkers(mapRef.current, []);
        setIsFilterOpen(false);
        return;
      }

      const cleaned = finalData as Restaurant[];
      setRestaurants(cleaned);
      if (mapRef.current) createGroupedMarkers(mapRef.current, cleaned);
      if (cleaned.length > 0) {
        setSelectedRestaurantId(cleaned[0].restaurant_id);
        mapRef.current?.panTo(new window.kakao.maps.LatLng(cleaned[0].lat, cleaned[0].lng));
      }
      setIsFilterOpen(false);
    } catch (err: any) {
      console.error("검색 오류:", err.message);
    }
  };
const startLocationWatch = useCallback(() => {
  if (!window.kakao || !mapRef.current) return;

  const watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const currentPos = new window.kakao.maps.LatLng(lat, lng);

      if (!currentLocationMarker.current) {
        // 처음 마커 생성 시 zIndex와 크기를 조금 더 키움
        currentLocationMarker.current = new window.kakao.maps.Marker({
          map: mapRef.current,
          position: currentPos,
          image: new window.kakao.maps.MarkerImage(
            "/map/mypin.png", 
            new window.kakao.maps.Size(22, 22) 
          ),
          zIndex: 100 // 식당 마커보다 항상 위
        });
        // 처음에 마커가 생기면 내 위치로 화면 이동
        mapRef.current.panTo(currentPos);
      } else {
        // 이미 있으면 위치만 이동
        currentLocationMarker.current.setPosition(currentPos);
      }
      
      // 거리 계산 업데이트
      updateDistances(lat, lng);
    },
    (err) => console.warn("위치 추적 실패:", err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );

  return watchId;
}, [updateDistances]);

useEffect(() => {
  if (!mapRef.current) return;

  const watchId = startLocationWatch(); // 위에서 만든 함수 실행

  return () => {
    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
  };
}, [startLocationWatch]);

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
    setTimeout(() => {
      listContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }, [selectedRestaurantId]);

  const onClickRestaurant = (id: string) => {
    if (selectedRestaurantId === id) {
      router.push(`/restaurants/${id}`);
      return;
    }
    const target = restaurants.find(r => r.restaurant_id === id);
    if (target && mapRef.current) mapRef.current.panTo(new window.kakao.maps.LatLng(target.lat, target.lng));
    setSelectedRestaurantId(id);
    setIsSheetOpen(true);
  };

  const handlePtuClick = () => { 
    setPtuActive(true); 
    setTimeout(() => setPtuActive(false), 600); 
    mapRef.current?.panTo(new window.kakao.maps.LatLng(36.9954, 127.1345)); 
    setIsSheetOpen(false); 
  };

  // ✅ [수정] 내 위치 버튼 로직 강화
  const handleMyClick = () => {
    setMyActive(true);
    setTimeout(() => setMyActive(false), 600);
    
    if (!mapRef.current) return;

    if (currentLocationMarker.current) {
      // 이미 추적 중인 마커가 있다면 그 좌표로 이동
      mapRef.current.panTo(currentLocationMarker.current.getPosition());
    } else {
      // 마커가 아직 생성 전이라면 즉시 현재 위치를 1회성으로 가져와 이동
      navigator.geolocation.getCurrentPosition((pos) => {
        const moveLatLon = new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        mapRef.current.panTo(moveLatLon);
      });
    }
  };

  useEffect(() => { if (typeof window !== "undefined" && window.kakao?.maps) handleMapLoad(); }, []);

  return (
    <>
      <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`} onLoad={handleMapLoad} />
      <HeaderWithBack title="주변 맛집 찾기" backTF={false} />

      {/* 검색 및 필터 UI */}
      <div className="fixed top-[56px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between px-3 bg-transparent pointer-events-none">
        {/* 1. 확대 애니메이션 (1.05배) */}
        <div className="flex-1 mr-3 pointer-events-auto group transition-all duration-300 focus-within:scale-[1.04]">
          <div className={cn(
            "relative bg-white rounded-full transition-all duration-300 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]",
            // 💡 클릭 시 검은색 테두리 (ring-4)
            "ring-0 focus-within:ring-3 focus-within:ring-black",
            // 💡 포커스 시 더 깊은 그림자
            "focus-within:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)]",
            // 💡 레이어 우선순위 및 기본 테두리 제거
            "z-40 focus-within:z-50 outline-none border-none",
            
            // 🔥 [핵심 추가] 내부의 모든 자식 요소(! 기호로 강제)가 
            // 클릭 시 별도의 테두리를 그리지 못하도록 차단하여 "안쪽 칠해짐" 방지
            "[&_*]:!ring-0 [&_*]:!outline-none [&_*]:!ring-offset-0",
            "[&_input]:!border-none [&_input]:!bg-white",
            "[&_button]:!bg-transparent"
          )}>
            <SearchAutocomplete
              value={inputValue}
              onChange={setInputValue}
              onEnter={() => handleFilterSearch({ selectedFoodTypes: [], selectedTasteTypes: [], tasteSearchLogic: "OR" })}
            />
          </div>
          </div>
        <div className="pointer-events-auto">
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <button className="h-13 w-13 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <SlidersHorizontal className={cn("h-5 w-5 text-gray-700 transition-transform duration-400", isFilterOpen && "rotate-90")} />
              </button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-[540px] rounded-t-[24px]">
              <SheetTitle className="text-xl font-bold p-4">검색 필터</SheetTitle>
              <div className="overflow-y-auto h-full pb-20">
                <SearchFilter_ver3 onSearch={handleFilterSearch} loading={false} sideTF={true} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="relative w-full max-w-[540px] mx-auto h-[calc(100vh-45px)]">
        <div id="map" className="absolute inset-0" />

        {/* 플로팅 버튼 (PTU / 내 위치) */}
        <div className="fixed bottom-[130px] z-10 flex flex-col items-end w-full max-w-[540px] mx-auto p-4 gap-4 pointer-events-none">
          <div className="relative">
            {ptuActive && <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75"></span>}
            <button onClick={handlePtuClick} className="relative z-30 h-13 w-13 rounded-full bg-white flex justify-center items-center shadow-xl pointer-events-auto active:scale-90 transition-all">
              <img src="/image/ptu_logo.png" alt="PTU" className="w-9 h-9 object-contain" />
            </button>
          </div>
          <div className="relative">
            {myActive && <span className="absolute inset-0 rounded-full bg-[#3268f8] animate-ping opacity-75"></span>}
            <button onClick={handleMyClick} className="relative z-30 h-13 w-13 rounded-full bg-white flex justify-center items-center text-[#3268f8] shadow-xl pointer-events-auto active:scale-90 transition-all">
              <LocateFixed size={34} />
            </button>
          </div>
        </div>

        {/* 하단 시트 목록 */}
        <div className={cn("fixed bottom-5 left-0 right-0 max-w-[540px] mx-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 z-20", isSheetOpen ? "translate-y-0" : "translate-y-[calc(100%-80px)]")}>
          <button onClick={() => setIsSheetOpen(!isSheetOpen)} className="w-full h-10 flex justify-center items-center"><div className="w-12 h-1.5 bg-gray-200 rounded-full" /></button>
          <div className="px-5 pb-2 font-bold text-xl">지도 내 맛집 목록</div>
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