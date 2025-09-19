"use client"
import { useState, useEffect, useRef } from "react"
import Script from "next/script"
import { ChevronUp, ChevronDown, SlidersHorizontal, LocateFixed } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from "next/navigation"
import HeaderWithBack from '@/components/HeaderWithBack';
import { SearchAutocomplete } from "@/components/SearchBar";
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"

// kakao 전역 선언
declare global { interface Window { kakao: any } }

// 맛집 데이터 구조
interface Restaurant {
  restaurant_id: string;
  restaurant_name: string;
  address: string;
  phone: string;
  food_type: string[];
  taste_types: string[];
  image_url: string;
  distanceText?: string;
}

const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png';

// 맛집 리스트 아이템 컴포넌트
const RestaurantListItem = ({ restaurant }: { restaurant: Restaurant }) => (
  <div className="flex items-center">
    {/* 맛집 이미지 */}
    <div className="px-1 py-1 w-30 h-30 flex-shrink-0 mr-3">
      <img src={restaurant.image_url || DEFAULT_IMAGE_URL} alt={restaurant.restaurant_name} className="w-full h-full object-cover rounded-lg border border-gray-200" />
    </div>
    {/* 맛집 정보 */}
    <div className="text-[12px]">
      <div className="text-[15px]">{restaurant.restaurant_name}</div>
      <p>{restaurant.address}</p>
      <p>{restaurant.phone}</p>
    </div>
    {/* 거리 표시 */}
    <div className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs ml-auto">
      {restaurant.distanceText || "--"}
    </div>
  </div>
)

// 마커 그룹 타입
interface MarkerGroup {
  position: { lat: number; lng: number };
  restaurants: Restaurant[];
  marker?: any;
  overlay?: any;
}

export default function MapPage() {
  // -----------------------
  // 상태 관리
  // -----------------------
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(true)
  const [inputValue, setInputValue] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const router = useRouter()

  // -----------------------
  // ref (지도/마커 관리)
  // -----------------------
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY as string
  const currentLocationMarker = useRef<any>(null)
  const markerGroupsRef = useRef<MarkerGroup[]>([])

  // -----------------------
  // 거리 계산 함수
  // -----------------------
  const getDistanceInMeters=(lat1:number,lng1:number,lat2:number,lng2:number)=>{
    const R=6371000;
    const toRad=(deg:number)=>(deg*Math.PI)/180;
    const dLat=toRad(lat2-lat1);
    const dLng=toRad(lng2-lng1);
    const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return R*c;
  }
  const formatDistance=(d:number)=>d<1000?`${Math.round(d)} m`:`${(d/1000).toFixed(1)} km`;

  // 그룹 기준 거리 업데이트
  const updateDistancesByGroup=(userLat:number,userLng:number)=>{
    setRestaurants(prev=>prev.map(r=>{
      const group=markerGroupsRef.current.find(g=>g.restaurants.some(x=>x.restaurant_id===r.restaurant_id))
      if(!group) return {...r,distanceText:"--"}
      const dist=getDistanceInMeters(userLat,userLng,group.position.lat,group.position.lng)
      return {...r,distanceText:formatDistance(dist)}
    }))
  }

  // -----------------------
  // 주소 → 좌표 변환 (지오코딩)
  // -----------------------
  const geocodeAddress = (address:string) => new Promise<{lat:number,lng:number}>((resolve,reject)=>{
    if(!window.kakao) return reject("Kakao maps not loaded")
    const geocoder=new window.kakao.maps.services.Geocoder()
    geocoder.addressSearch(address,(result:any,status:any)=>{
      if(status===window.kakao.maps.services.Status.OK && result.length>0){
        resolve({lat:Number(result[0].y),lng:Number(result[0].x)})
      } else reject("주소 변환 실패")
    })
  })

  // -----------------------
  // 지도 위에 마커 그룹 생성
  // -----------------------
  const createGroupedMarkers = async (map: any, restaurantList: Restaurant[]) => {
    // 기존 마커/오버레이 제거
    markerGroupsRef.current.forEach(g => {
      if (g.marker) g.marker.setMap(null)
      if (g.overlay) g.overlay.setMap(null)
    })
    markerGroupsRef.current = []

    const grouped: Record<string, Restaurant[]> = {}

    // 주소 → 좌표 변환 후 그룹화
    for (const r of restaurantList) {
      try {
        const { lat, lng } = await geocodeAddress(r.address)
        const key = `${lat.toFixed(6)},${lng.toFixed(6)}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(r)
      } catch (err) {
        console.warn("좌표 변환 실패:", r.address, err)
      }
    }

    // 그룹별 마커 생성
    for (const [key, groupRestaurants] of Object.entries(grouped)) {
      const [lat, lng] = key.split(",").map(Number)

      if (groupRestaurants.length === 1) {
        // 단일 마커 생성
        const marker = new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(lat, lng),
          clickable: true,
          image: new window.kakao.maps.MarkerImage(
              '/map/mappin.png',
              new window.kakao.maps.Size(30, 30)
          ),
        })
        marker.setMap(map)
        // 클릭 시 레스토랑 선택 + 시트 열기
        window.kakao.maps.event.addListener(marker, "click", () => {
          setSelectedRestaurantId(groupRestaurants[0].restaurant_id)
          setIsSheetOpen(true)
          map.panTo(new window.kakao.maps.LatLng(lat, lng))
        })
        markerGroupsRef.current.push({ position: { lat, lng }, restaurants: groupRestaurants, marker })
      } else {
        // 다중 그룹 → +N 버튼 + 리스트 박스
        const button = document.createElement("div")
        button.innerText = `+${groupRestaurants.length}`
        Object.assign(button.style, {
          padding: "6px 8px",
          background: "#ffff",
          color: "black",
          borderRadius: "10px",
          border: "2px solid #2F69E4",
          fontWeight: "bold",
          fontSize: "13px",
          cursor: "pointer",
          textAlign: "center",
          userSelect: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          position:"relaive",
          minWidth: "36px",
        })

        const box = document.createElement("div")
        Object.assign(box.style, {
          display: "none",
          position: "absolute",
          top: "calc(100% + 4px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#ffff",
          padding: "6px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          maxWidth: "200px",
          fontSize: "14px",
          color: "#333",
          transition: "all 0.2s ease",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          overflowY: "auto",
          maxHeight: "300px",
        });

        // 그룹 안의 각 레스토랑 아이템 생성
        groupRestaurants.forEach(r => {
          const item = document.createElement("div")
          item.innerText = r.restaurant_name
          Object.assign(item.style, {
            padding: "4px 6px",
            borderRadius: "4px",
            cursor: "pointer",
          })
          item.onmouseover = () => item.style.background = "#f0f8ff"
          item.onmouseout = () => item.style.background = "transparent"
          item.onclick = () => {
            setSelectedRestaurantId(r.restaurant_id)
            setIsSheetOpen(true)
            box.style.display = "none"
            button.innerText = `+${groupRestaurants.length}`
          }
          box.appendChild(item)
        })

        // 버튼 클릭 → 박스 토글
        button.onclick = (e) => {
          e.stopPropagation()
          const isOpen = box.style.display !== "none"
          box.style.display = isOpen ? "none" : "block"
          button.innerText = isOpen ? `+${groupRestaurants.length}` : "X"
          button.style.background = isOpen ? "#ffff" : "#D5E0F9"
        }

        const container = document.createElement("div")
        container.style.position="relative";
        container.style.display = "inline-block"
        container.style.flexDirection = "column"
        container.style.alignItems = "center"
        container.appendChild(button)
        container.appendChild(box)

        const overlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(lat, lng),
          content: container,
          yAnchor: 1,
          clickable: true,
          zIndex: 30,
        })
        overlay.setMap(map)

        // 지도 클릭 시 박스 닫기
        window.kakao.maps.event.addListener(map, "click", () => {
          box.style.display = "none"
          button.innerText = `+${groupRestaurants.length}`
          button.style.background = "#ffff"
        })

        markerGroupsRef.current.push({ position: { lat, lng }, restaurants: groupRestaurants, overlay })
      }
    }
  }

  // -----------------------
  // 지도 초기화 + DB 로드
  // -----------------------
  const handleMapLoad=async()=>{
    if(window.kakao && window.kakao.maps){
      window.kakao.maps.load(async()=>{
        const container=document.getElementById("map")
        if(!container) return
        const map=new window.kakao.maps.Map(container,{center:new window.kakao.maps.LatLng(36.9954,127.1345),level:3})
        mapRef.current=map

        // DB에서 맛집 불러오기
        const {data,error}=await supabase.from("restaurant").select("*")
        if(error) return console.error(error)
        if(data){
          setRestaurants(data as Restaurant[])
          setSelectedRestaurantId(data[0].restaurant_id)
          await createGroupedMarkers(map,data as Restaurant[])
        }
      })
    }
  }

  // -----------------------
  // 내 위치 추적
  // -----------------------
  const watchUserPosition=()=>{
    if(!('kakao' in window) || !mapRef.current) return;
    let debounceTimeoutId:number|NodeJS.Timeout|null=null
    const watchId=navigator.geolocation.watchPosition(
      (pos)=>{
        if(debounceTimeoutId!==null) clearTimeout(debounceTimeoutId)
        debounceTimeoutId=setTimeout(()=>{
          const lat=pos.coords.latitude
          const lng=pos.coords.longitude
          const currentPos=new window.kakao.maps.LatLng(lat,lng)
          if(!currentLocationMarker.current){
            // 현재 위치 마커 생성
            currentLocationMarker.current = new window.kakao.maps.Marker({
              map: mapRef.current,
              position: currentPos,
              title: "현재 위치",
              image: new window.kakao.maps.MarkerImage("/map/mypin.png", new window.kakao.maps.Size(20, 20))
            });
            mapRef.current.panTo(currentPos)
          }else currentLocationMarker.current.setPosition(currentPos)
          updateDistancesByGroup(lat,lng)
        },500)
      },
      (err)=>console.warn("위치 추적 오류:",err),
      {enableHighAccuracy:true,maximumAge:10000,timeout:15000}
    )
    return watchId
  }

  // -----------------------
  // useEffect 훅
  // -----------------------
  // 지도 로드
  useEffect(()=>{if(typeof window!=="undefined" && window.kakao?.maps) handleMapLoad()},[])

  // 내 위치 추적
  useEffect(()=>{
    const watchId=watchUserPosition()
    return ()=>{ if(watchId!==undefined) navigator.geolocation.clearWatch(watchId) }
  },[restaurants])

  // 선택된 맛집을 목록 상단으로 이동
  useEffect(()=>{
    if(!selectedRestaurantId) return
    setRestaurants(prev=>{
      const idx=prev.findIndex(r=>r.restaurant_id===selectedRestaurantId)
      if(idx===-1) return prev
      const newArr=[...prev]
      const [selected]=newArr.splice(idx,1)
      newArr.unshift(selected)
      return newArr
    })
  },[selectedRestaurantId])

  // -----------------------
  // 레스토랑 클릭 시 동작
  // -----------------------
  const onClickRestaurant = (id: string) => {
    // 이미 선택된 레스토랑을 다시 클릭 → 상세 페이지 이동
    if (selectedRestaurantId === id) {
      router.push(`/restaurants/${id}`);
      return;
    }

    // 지도에서 해당 마커 위치로 이동
    const group = markerGroupsRef.current.find(g => g.restaurants.some(r => r.restaurant_id === id));
    if (group && mapRef.current) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(group.position.lat, group.position.lng));
    }
    setSelectedRestaurantId(id);
    setIsSheetOpen(true);
  }

  // -----------------------
  // 마커 강조 (선택 시 이미지 변경)
  // -----------------------
  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;
    markerGroupsRef.current.forEach(({ restaurants, marker }) => {
      const id = restaurants[0].restaurant_id;
      const isSelected = id === selectedRestaurantId;

      if (marker) {
        const imageUrl = isSelected ? "/map/mappinExpand.png" : "/map/mappin.png";
        const imageSize = isSelected
          ? new window.kakao.maps.Size(48, 60)
          : new window.kakao.maps.Size(30, 30);

        const markerImage = new window.kakao.maps.MarkerImage(imageUrl, imageSize);
        marker.setImage(markerImage);
        marker.setZIndex(isSelected ? 10 : 1);
      }
    });
  }, [selectedRestaurantId]);

  // -----------------------
  // 버튼: 평택대 위치로 이동
  // -----------------------
  const moveToPresetPosition=()=>{if(mapRef.current) {mapRef.current.panTo(new window.kakao.maps.LatLng(36.9954,127.1345)); setIsSheetOpen(false)}}

  // -----------------------
  // 버튼: 내 위치로 이동
  // -----------------------
  const moveToMyPosition=()=>{if(mapRef.current) {if(currentLocationMarker.current){mapRef.current.panTo(currentLocationMarker.current.getPosition())}else navigator.geolocation.getCurrentPosition(pos=>{const lat=pos.coords.latitude; const lng=pos.coords.longitude; const currentPos=new window.kakao.maps.LatLng(lat,lng); mapRef.current.panTo(currentPos); updateDistancesByGroup(lat,lng); watchUserPosition()})}}

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

      // 음식 종류 필터
      if (params.selectedFoodTypes.length > 0) {
        query = query.overlaps("type", params.selectedFoodTypes);
      }
      // 맛 필터
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
        // 조건에 맞는 맛집 정보 조회
        const { data: restaurantsData, error: rErr } = await supabase
          .from("restaurant")
          .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste), image_url")
          .in("restaurant_id", ids);
        if (rErr) throw rErr;

        if (restaurantsData) {
          // DB 결과 → Restaurant 타입으로 정리
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
              image_url: item.image_url,
            };
          });

          setRestaurants(cleaned);
          await createGroupedMarkers(mapRef.current, cleaned);

          if (cleaned.length > 0) {
            setSelectedRestaurantId(cleaned[0].restaurant_id);
            setIsSheetOpen(true);
          }
        }
      }

      setIsFilterOpen(false);
    } catch (err) {
      console.error("필터 검색 오류", err);
    }
  };  

  // -----------------------
  // JSX
  // -----------------------
  return <>
    {/* Kakao Maps SDK 스크립트 */}
    <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer,drawing`} onLoad={handleMapLoad} strategy="afterInteractive"/>
    <HeaderWithBack title="주변 맛집 찾기" backTF={true}/>

    {/* 검색창 + 필터 버튼 */}
    <div className="fixed top-[45px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between p-2">
      <div className="flex-1 mr-2">
        <SearchAutocomplete value={inputValue} onChange={setInputValue} onEnter={()=>{}}/>
      </div>
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full shadow-lgv bg-white shadow"><SlidersHorizontal className="h-5 w-5"/></Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-[540px] flex flex-col">
          <SheetTitle className="sr-only">검색 필터</SheetTitle>
          <SearchFilter_ver3 onSearch={handleFilterSearch} loading={false} sideTF={true}/>
        </SheetContent>
      </Sheet>
    </div>

    {/* 지도 영역 */}
    <div className="relative w-full max-w-[540px] mx-auto h-[calc(95vh-90px)]">
      <div id="map" ref={mapContainerRef} className="absolute inset-0"/>

      {/* 지도 우측 하단 버튼 (평택대, 내 위치) */}
      <div className="fixed bottom-[120px] z-10 flex flex-col items-end w-full max-w-[540px] mx-auto p-3 gap-3" style={{pointerEvents:'none'}}>
        <button onClick={moveToPresetPosition} className="z-30 h-13 w-13 rounded-full bg-white shadow-lg flex justify-center items-center text-[#3268f8]" style={{pointerEvents:'auto'}}>
          <img src="/image/ptu_logo.png" alt="평택대" className="w-8 h-8"/>
        </button>
        <button onClick={moveToMyPosition} className="z-30 h-13 w-13 rounded-full bg-white shadow-lg flex justify-center items-center text-[#3268f8]" style={{pointerEvents:'auto'}}>
          <LocateFixed size={32}/>
        </button>
      </div>

      {/* 하단 시트 (맛집 목록) */}
      <div ref={sheetRef} className={cn("fixed bottom-7.5 left-0 right-0 max-w-[540px] mx-auto bg-white rounded-t-2xl shadow transition-transform duration-300 z-20", isSheetOpen?"translate-y-0":"translate-y-[calc(100%-80px)]")}>
        <button onClick={()=>setIsSheetOpen(!isSheetOpen)} className="w-full h-12 flex justify-center items-center">
          {isSheetOpen?<ChevronDown className="h-6 w-6 text-gray-400"/>:<ChevronUp className="h-6 w-6 text-gray-400"/>}
        </button>
        <div className="p-3 pt-0"><h2 className="text-xl font-bold">지도 내 맛집 목록</h2></div>
        <div className="overflow-y-auto max-h-[45vh] px-1">
          <div className="space-y-2 pb-10 py-2">
            {restaurants.map(r=>(
              <div key={r.restaurant_id} onClick={()=>onClickRestaurant(r.restaurant_id)} className={cn("transition-all cursor-pointer", selectedRestaurantId===r.restaurant_id && "bg-blue-100")}>
                <RestaurantListItem restaurant={r}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>
}
