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

// 맛집 리스트 아이템
const RestaurantListItem = ({ restaurant }: { restaurant: Restaurant }) => (
  <div className="flex items-center">
    <div className="px-1 py-1 w-30 h-30 flex-shrink-0 mr-3">
      <img src={restaurant.image_url || DEFAULT_IMAGE_URL} alt={restaurant.restaurant_name} className="w-full h-full object-cover rounded-lg border border-gray-200" />
    </div>
    <div className="text-[12px]">
      <div className="text-[15px]">{restaurant.restaurant_name}</div>
      <p>{restaurant.address}</p>
      <p>{restaurant.phone}</p>
    </div>
    <div className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs ml-auto">
      {restaurant.distanceText || "--"}
    </div>
  </div>
)

// Marker 그룹 타입
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
  const router = useRouter()
  const mapRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY as string
  const currentLocationMarker = useRef<any>(null)
  const markerGroupsRef = useRef<MarkerGroup[]>([])

  // 거리 계산
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

  // 주소 → 좌표
  const geocodeAddress = (address:string) => new Promise<{lat:number,lng:number}>((resolve,reject)=>{
    if(!window.kakao) return reject("Kakao maps not loaded")
    const geocoder=new window.kakao.maps.services.Geocoder()
    geocoder.addressSearch(address,(result:any,status:any)=>{
      if(status===window.kakao.maps.services.Status.OK && result.length>0){
        resolve({lat:Number(result[0].y),lng:Number(result[0].x)})
      } else reject("주소 변환 실패")
    })
  })
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

  for (const [key, groupRestaurants] of Object.entries(grouped)) {
    const [lat, lng] = key.split(",").map(Number)

    if (groupRestaurants.length === 1) {
      // 단일 마커
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(lat, lng),
        clickable: true
      })
      marker.setMap(map)
      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelectedRestaurantId(groupRestaurants[0].restaurant_id)
        setIsSheetOpen(true)
        map.panTo(new window.kakao.maps.LatLng(lat, lng))
      })
      markerGroupsRef.current.push({ position: { lat, lng }, restaurants: groupRestaurants, marker })
    } else {
      // +N 버튼과 네모박스
      const button = document.createElement("div")
      button.innerText = `+${groupRestaurants.length}`
      Object.assign(button.style, {
        padding: "6px 10px",
        background: "#3268f8",
        color: "#fff",
        borderRadius: "20px",
        fontWeight: "bold",
        cursor: "pointer",
        textAlign: "center",
        userSelect: "none",
        position:"relaive",
      })

      const box = document.createElement("div")
      Object.assign(box.style, {
  display: "none",
  position: "absolute", // 버튼 기준으로 절대 위치
  top: "calc(100% + 4px)", // 버튼 아래로 위치
  left: "50%",
  transform: "translateX(-50%)", // 버튼 중앙 기준 정렬
  background: "#fff",
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

      // 버튼 클릭 시 박스 토글 + 텍스트 변경
      button.onclick = (e) => {
        e.stopPropagation() // 지도 클릭 이벤트 차단
        const isOpen = box.style.display !== "none"
        box.style.display = isOpen ? "none" : "block"
        button.innerText = isOpen ? `+${groupRestaurants.length}` : "X"
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
        clickable: true
      })
      overlay.setMap(map)

      // 지도 클릭 시 박스 닫기 + 버튼 원복
      window.kakao.maps.event.addListener(map, "click", () => {
        box.style.display = "none"
        button.innerText = `+${groupRestaurants.length}`
      })

      markerGroupsRef.current.push({ position: { lat, lng }, restaurants: groupRestaurants, overlay })
    }
  }
}



  // 지도 초기화 + DB 로드
  const handleMapLoad=async()=>{
    if(window.kakao && window.kakao.maps){
      window.kakao.maps.load(async()=>{
        const container=document.getElementById("map")
        if(!container) return
        const map=new window.kakao.maps.Map(container,{center:new window.kakao.maps.LatLng(36.9954,127.1345),level:3})
        mapRef.current=map

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

  // 내 위치 추적
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
            currentLocationMarker.current=new window.kakao.maps.Marker({map:mapRef.current,position:currentPos,title:"현재 위치"})
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

  // Map Load
  useEffect(()=>{if(typeof window!=="undefined" && window.kakao?.maps) handleMapLoad()},[])

  // 위치 watch
  useEffect(()=>{
    const watchId=watchUserPosition()
    return ()=>{ if(watchId!==undefined) navigator.geolocation.clearWatch(watchId) }
  },[restaurants])

  // 선택 시 최상단 이동
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

// 기존 onClickRestaurant 함수 바로 위에 router는 이미 선언되어 있다고 가정
const onClickRestaurant = (id: string) => {
  // 🔥 여기를 추가 — 이미 선택된 아이템을 다시 클릭하면 상세 페이지로 이동
  if (selectedRestaurantId === id) {
    router.push(`/restaurants/${id}`);
    return;
  }

  const group = markerGroupsRef.current.find(g => g.restaurants.some(r => r.restaurant_id === id));
  if (group && mapRef.current) {
    mapRef.current.panTo(new window.kakao.maps.LatLng(group.position.lat, group.position.lng));
  }
  setSelectedRestaurantId(id);
  setIsSheetOpen(true);
}


  // 평택대 버튼
  const moveToPresetPosition=()=>{if(mapRef.current) {mapRef.current.panTo(new window.kakao.maps.LatLng(36.9954,127.1345)); setIsSheetOpen(false)}}

  // 내 위치 버튼
  const moveToMyPosition=()=>{if(mapRef.current) {if(currentLocationMarker.current){mapRef.current.panTo(currentLocationMarker.current.getPosition())}else navigator.geolocation.getCurrentPosition(pos=>{const lat=pos.coords.latitude; const lng=pos.coords.longitude; const currentPos=new window.kakao.maps.LatLng(lat,lng); mapRef.current.panTo(currentPos); updateDistancesByGroup(lat,lng); watchUserPosition()})}}

  // -----------------------
  // JSX
  // -----------------------
  return <>
    <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer,drawing`} onLoad={handleMapLoad} strategy="afterInteractive"/>
    <HeaderWithBack title="주변 맛집 찾기" backTF={true}/>

    {/* 검색창 + 필터 */}
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
          <SearchFilter_ver3 onSearch={()=>{}} loading={false} sideTF={true}/>
        </SheetContent>
      </Sheet>
    </div>

    {/* 지도 */}
    <div className="relative w-full max-w-[540px] mx-auto h-[calc(95vh-90px)]">
      <div id="map" ref={mapContainerRef} className="absolute inset-0"/>

      <div className="fixed bottom-[120px] z-10 flex flex-col items-end w-full max-w-[540px] mx-auto p-3 gap-3" style={{pointerEvents:'none'}}>
        <button onClick={moveToPresetPosition} className="z-30 h-13 w-13 rounded-full bg-white shadow-lg flex justify-center items-center text-[#3268f8]" style={{pointerEvents:'auto'}}>
          <img src="/image/ptu_logo.png" alt="평택대" className="w-8 h-8"/>
        </button>
        <button onClick={moveToMyPosition} className="z-30 h-13 w-13 rounded-full bg-white shadow-lg flex justify-center items-center text-[#3268f8]" style={{pointerEvents:'auto'}}>
          <LocateFixed size={32}/>
        </button>
      </div>

      {/* 하단 시트 */}
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
