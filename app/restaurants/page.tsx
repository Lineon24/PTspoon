"use client";
import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RestaurantListItem, type Restaurant } from "@/components/restaurant-list-item_ver2";
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";
import { SearchAutocomplete } from "@/components/SearchBar";
import { FilterTag } from "@/components/filter-tag";
import HeaderWithBack from '@/components/HeaderWithBack';
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

// 1. 공통 상수 및 가공 함수
const SELECT_FIELDS = "restaurant_id, restaurant_name, address, phone, restaurant_profiles(type, taste), image_url, description, lat, lng";

const transformData = (data: any[]): Restaurant[] => {
  return data.map((item) => {
    const profiles = Array.isArray(item.restaurant_profiles) 
      ? item.restaurant_profiles 
      : (item.restaurant_profiles ? [item.restaurant_profiles] : []);
    
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
      phone: item.phone || "연락처 정보 없음",
      type: Array.from(typeSet),
      taste: Array.from(tasteSet),
      image_url: item.image_url,
      description: item.description,
      lat: item.lat,
      lng: item.lng
    };
  });
};

function RestaurantsPageContent() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const foodTypes = searchParams.get("foodTypes");
  const tasteTypes = searchParams.get("tasteTypes");
  const logic = searchParams.get("logic") || "OR";

  const parsedFoodTypes: string[] = foodTypes ? JSON.parse(foodTypes) : [];
  const parsedTasteTypes: string[] = tasteTypes ? JSON.parse(tasteTypes) : [];

  // 2. 고성능 !inner 조인 쿼리 적용 (오류 해결 핵심)
  const fetchRestaurants = useCallback(async (
    selectedFoodTypes: string[],
    selectedTasteTypes: string[],
    tasteSearchLogic: "AND" | "OR"
  ) => {
    setLoading(true);
    setError(null);

    try {
      // 필터가 없는 경우: 전체 목록 조회
      if (selectedFoodTypes.length === 0 && selectedTasteTypes.length === 0) {
        const { data, error: allErr } = await supabase
          .from("restaurant")
          .select(SELECT_FIELDS)
          .order("restaurant_name");

        if (allErr) throw allErr;
        if (data) setRestaurants(transformData(data));
        return;
      }

      // 필터가 있는 경우: !inner 조인을 통해 서버 사이드 필터링
      let query = supabase
        .from("restaurant")
        .select(`
          restaurant_id, restaurant_name, address, phone, image_url, description, lat, lng,
          restaurant_profiles!inner(type, taste)
        `);

      if (selectedFoodTypes.length > 0) {
        query = query.overlaps("restaurant_profiles.type", selectedFoodTypes);
      }

      if (selectedTasteTypes.length > 0) {
        if (tasteSearchLogic === "AND") {
          query = query.contains("restaurant_profiles.taste", selectedTasteTypes);
        } else {
          query = query.overlaps("restaurant_profiles.taste", selectedTasteTypes);
        }
      }

      const { data, error: fetchErr } = await query.order("restaurant_name");

      if (fetchErr) throw fetchErr;
      if (data) setRestaurants(transformData(data));

    } catch (err: any) {
      console.error("🚨 로드 에러:", err.message);
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEnterSearch = async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: sErr } = await supabase
        .from("restaurant")
        .select(SELECT_FIELDS)
        .ilike("restaurant_name", `%${inputValue}%`);
      if (sErr) throw sErr;
      if (data) setRestaurants(transformData(data));
    } catch (err: any) {
      console.error("🚨 검색 에러:", err.message);
      setError("검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params: any) => {
    const newParams = new URLSearchParams({
      foodTypes: JSON.stringify(params.selectedFoodTypes),
      tasteTypes: JSON.stringify(params.selectedTasteTypes),
      logic: params.tasteSearchLogic,
    });
    router.push(`/restaurants?${newParams.toString()}`);
  };

  useEffect(() => {
    fetchRestaurants(parsedFoodTypes, parsedTasteTypes, logic as "AND" | "OR");
  }, [foodTypes, tasteTypes, logic, fetchRestaurants]);

  // UI 간격 조정을 위한 Ref 및 상태
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterHeight, setFilterHeight] = useState(0);

  useEffect(() => {
    setFilterHeight(filterRef.current?.offsetHeight || 0);
  }, [parsedFoodTypes, parsedTasteTypes]);

  return (
    <div className="max-w-[540px] mx-auto p-3">
      <HeaderWithBack title="식당 목록" backTF={true} />
      
      {/* 3. 검색 영역 간격 축소 (fixed 위치 및 padding 조정) */}
<div className="fixed top-[56px] left-0 right-0 z-30 max-w-[540px] mx-auto flex items-center justify-between px-4 bg-transparent pointer-events-none">
  
  {/* 1. 검색창: 미세 테두리(회색 선)를 완벽하게 제거한 플로팅 바 */}
  <div className="flex-1 mr-4 pointer-events-auto group transition-all duration-300 focus-within:scale-[1.01]">
    <div className={cn(
      "relative bg-white rounded-2xl transition-all duration-300",
      // 테두리, 링, 외곽선을 모두 0으로 강제 설정하여 잔상 제거
      "border-none ring-0 ring-offset-0 outline-none", 
      // 그림자를 아주 연하게(rgba 0.04) 하고 확산 범위를 넓혀 경계선을 흐릿하게 처리
      "shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)]", 
      "group-focus-within:shadow-[0_15px_50px_-12px_rgba(0,0,0,0.12)]"
    )}>
      <SearchAutocomplete
        value={inputValue}
        onChange={setInputValue}
        onEnter={handleEnterSearch}
      />
    </div>
  </div>
  
  {/* 2. 필터 버튼: 독립된 원형 디자인 + 쫀득한 클릭 애니메이션 복구 */}
  <div className="pointer-events-auto">
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      <SheetTrigger asChild>
        <button 
          className={cn(
            // 기본 스타일: 테두리 없이 깨끗한 원형
            "h-13 w-13 rounded-full bg-white flex items-center justify-center flex-shrink-0",
            "border-none ring-0 ring-offset-0 outline-none",
            // 클릭 시 작아지는 애니메이션 (하단 버튼과 동일하게)
            "transition-all duration-200 ease-in-out active:scale-90",
            // 입체적인 그림자 설정 (경계선이 생기지 않도록 연하게 중첩)
            "shadow-[0_12px_30px_-6px_rgba(0,0,0,0.15),0_8px_15px_-8px_rgba(0,0,0,0.1)]",
            "active:shadow-[0_4px_10px_-2px_rgba(0,0,0,0.2)]",
            "hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
          )}
        >
          <SlidersHorizontal 
            className={cn(
              "h-5 w-5 text-gray-700 transition-transform duration-300",
              isSheetOpen ? "rotate-90 scale-110" : "rotate-0 scale-100"
            )} 
          />
        </button>
      </SheetTrigger>
      
      {/* 필터 시트 내용 (디자인 통일) */}
      <SheetContent className="w-full h-full sm:max-w-[540px] flex flex-col rounded-t-[24px] border-none shadow-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold">검색 필터</SheetTitle>
          <SheetDescription className="sr-only">원하는 맛집 조건을 선택하세요.</SheetDescription>
        </SheetHeader>
        <div className="flex-grow mt-4 overflow-y-auto">
          <SearchFilter_ver3 
            onSearch={(p) => { handleSearch(p); setIsSheetOpen(false); }} 
            loading={loading} 
            sideTF={true} 
          />
        </div>
      </SheetContent>
    </Sheet>
  </div>
</div>

      {/* 4. Spacer 높이 축소 (기존 70 -> 55) */}
      <div className="h-[60px]" /> 

      {/* 3. 필터 태그 영역: 검색창 바로 아래에 붙도록 간격 대폭 축소 */}
      {(parsedFoodTypes.length > 0 || parsedTasteTypes.length > 0) && (
        <div 
          ref={filterRef} 
          className="mt-1 mb-2 px-1" // mt-8/mt-3에서 mt-1로 축소하여 검색창에 밀착
        >
          <div className="flex flex-wrap gap-x-1.5 gap-y-1.5"> {/* 태그 간 상하좌우 간격도 좁힘 */}
            {parsedFoodTypes.map((tag) => (
              <FilterTag key={tag} label={tag} />
            ))}
            {parsedTasteTypes.map((tag) => (
              <FilterTag key={tag} label={tag} />
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-red-600 text-center py-5">{error}</p>}
      {!loading && restaurants.length === 0 && <p className="py-10 text-center text-gray-500">등록된 음식점이 없습니다.</p>}

      {/* 결과 목록 간격 최적화 */}
      <div className="space-y-3 pt-2 pb-10">
        {restaurants.map((r) => (
          <RestaurantListItem key={r.restaurant_id} restaurant={r} />
        ))}
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10">로딩 중...</div>}>
      <RestaurantsPageContent />
    </Suspense>
  );
}