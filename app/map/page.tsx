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
import { LocateFixed, Utensils} from 'lucide-react';

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
  image_url: string;
  distanceText?:string; //거리 표시용
}
const DEFAULT_IMAGE_URL = '/image/free-icon-food-5134814.png';
// 맛집 리스트 아이템
const RestaurantListItem = ({ restaurant }: { restaurant: Restaurant }) => (
  <div className="flex items-center">
    <div className="px-1 py-1 w-30 h-30 flex-shrink-0 mr-3"> {/* 이미지 크기 및 오른쪽 여백 설정 */}
      <img
        src={restaurant.image_url || DEFAULT_IMAGE_URL}
        alt={`${restaurant.restaurant_name} 대표 이미지`}
        className="w-full h-full object-cover rounded-lg border border-gray-200"
        />
    </div>
  <div className=" text-[12px]">
    <div className="text-[15px]">{restaurant.restaurant_name}</div>
    <p>{restaurant.address}</p>
    <p>{restaurant.phone}</p>
  </div>
  <div className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs ml-auto">
    {restaurant.distanceText || "--"} {/*거리 표시용*/}
  </div>
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
  //내 위치 마커 참조
  const currentLocationMarker=useRef<any>(null);

  //위도,경도 거리계산(m)
  const getDistanceInMeters=(lat1:number,lng1:number,lat2:number,lng2:number)=>{
    const R=6371000; //지구 반지름
    const toRad=(deg:number)=>(deg * Math.PI)/180;
    const dLat=toRad(lat2 - lat1);
    const dLng=toRad(lng2 - lng1);
    const a=Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
    const c= 2* Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return R * c;
  }
  //거리 포맷
  const formatDistance=(distance:number)=> distance <1000 ? `${Math.round(distance)} m` : `${(distance/1000).toFixed(1)} km`;

  //내 위치 기준으로 식당 거리 업데이트
  const updateRestaurantDistances=(userLat:number, userLng:number)=>{
    setRestaurants(prev=>
      prev.map(r=>{
        const markerObj=markersRef.current.find(m=>m.id === r.restaurant_id);
        if(!markerObj){
          return {...r,distanceText:"거리 계산 불가"};
        }
        const dist=getDistanceInMeters(
          userLat,
          userLng,
          markerObj.position.lat,
          markerObj.position.lng,
        );
        return{...r,distanceText:formatDistance(dist)};
      })
    )
  };
  //실시간 위치 추적
  const watchUserPosition=()=>{
    if(!navigator.geolocation || !mapRef.current) return;

    const watchId=navigator.geolocation.watchPosition(
      (pos)=>{
        const lat=pos.coords.latitude;
        const lng=pos.coords.longitude;
        const currentPos=new window.kakao.maps.LatLng(lat,lng);

        //마커가 없으면 생성, 있으면 갱신
        if(!currentLocationMarker.current){
          currentLocationMarker.current=new window.kakao.maps.Marker({
            map:mapRef.current,
            position:currentPos,
            title:"현재 위치",
            image:new window.kakao.maps.MarkerImage("/map/mypin.png",new window.kakao.maps.Size(20,20))
          });
          mapRef.current.panTo(currentPos);
        }
        else{
          currentLocationMarker.current.setPosition(currentPos);
        }
        updateRestaurantDistances(lat,lng);
      },
      (err)=>console.warn("위치 추적 오류:",err),
      {enableHighAccuracy:true,maximumAge:10000,timeout:5000}
    );
    return watchId;
  };

  

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
          image: new window.kakao.maps.MarkerImage("/map/mappin.png", new window.kakao.maps.Size(30, 30)),
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
      return;
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
          center: new window.kakao.maps.LatLng(36.9954, 127.1345),
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
              image: new window.kakao.maps.MarkerImage("/map/mypin.png", new window.kakao.maps.Size(20, 20)),
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
      const imageUrl = isSelected ? "/map/mappinExpand.png" : "/map/mappin.png";
      const imageSize = isSelected
       ? new window.kakao.maps.Size(48, 60) // 선택된 마커는 더 큰 사이즈
        : new window.kakao.maps.Size(30, 30); // 선택되지 않은 마커는 기본 사이즈

      marker.setImage(new window.kakao.maps.MarkerImage(
        imageUrl,
        imageSize // isSelected에 따라 동적으로 생성된 imageSize 객체 사용
      ));
      marker.setZIndex(isSelected ? 10 : 1)
    })
  }, [selectedRestaurantId])

  // 평택대 버튼
  const moveToPresetPosition = () => {
    if (!mapRef.current) return
    mapRef.current.panTo(new window.kakao.maps.LatLng(36.9954, 127.1345))
    setIsSheetOpen(false)
  }
  // 내 위치 버튼
 const moveToMyPosition = () => {
  if (!mapRef.current) return;

  if (currentLocationMarker.current) {
    // 이미 위치 마커가 있으면 그 위치로 이동
    const pos = currentLocationMarker.current.getPosition();
    mapRef.current.panTo(pos);
  } else if (navigator.geolocation) {
    // 위치 마커 없으면 현재 위치 받아서 생성 후 이동
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const currentPos = new window.kakao.maps.LatLng(lat, lng);

        // 마커 생성
        currentLocationMarker.current = new window.kakao.maps.Marker({
          map: mapRef.current,
          position: currentPos,
          title: "현재 위치",
          image: new window.kakao.maps.MarkerImage("/map/mypin.png", new window.kakao.maps.Size(20, 20))
        });

        mapRef.current.panTo(currentPos);

        updateRestaurantDistances(lat,lng);
        watchUserPosition();
      },
      (err) => {
        alert("위치 정보를 가져오는 데 실패했습니다.");
        console.warn(`ERROR(${err.code}): ${err.message}`);
      }
    );
  } else {
    alert("이 브라우저에서는 위치 정보가 지원되지 않습니다.");
  }
};


  useEffect(()=>{
    const watchId=watchUserPosition();
    return () =>{
      if(watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    }
  },[restaurants]);


  // -----------------------
  // ✅ 이름 검색
  // -----------------------
  const handleEnterSearch = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste), image_url")
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
            image_url: item.image_url,
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
          .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste), image_url")
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
              image_url: item.image_url,
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
      <div className="fixed top-[45px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between p-2">
        <div className="flex-1 mr-2 ">
          <SearchAutocomplete value={inputValue} onChange={setInputValue} onEnter={handleEnterSearch} />
        </div>
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full shadow-lgv bg-white shadow">
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

        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+120px)] z-20 flex flex-col items-end w-full max-w-[540px] mx-auto p-3 gap-3"
        >
          <button
            onClick={moveToPresetPosition}
            className="z-20 h-13 w-13 rounded-full bg-white shadow-lg flex justify-center items-center text-[#3268f8]"
          >
            <img
              src="/image/ptu_logo.png"
              alt="평택대"
              className="w-8 h-8"/>
          </button>
          <button
            onClick={moveToMyPosition}
            className="z-20 h-13 w-13 rounded-full bg-white shadow-lg flex justify-center items-center text-[#3268f8]">
            <LocateFixed size={32} />
          </button>
        </div>

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

          <div className="p-3 pt-0">
            <h2 className="text-xl font-bold">지도 내 맛집 목록</h2>
          </div>

          <div className="overflow-y-auto max-h-[45vh] px-1">
            <div className="space-y-2 pb-10 py-2">
              {restaurants.map((r) => (
                <div
                  key={r.restaurant_id}
                  onClick={() => onClickRestaurant(r.restaurant_id)}
                  className={cn(
                    " transition-all cursor-pointer",
                    selectedRestaurantId === r.restaurant_id && "bg-blue-100 "
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
