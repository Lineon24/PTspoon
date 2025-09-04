"use client"; // React 컴포넌트가 클라이언트에서 렌더링됨을 명시
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect, Suspense, useRef } from "react"; // Suspense 임포트
import { supabase } from "@/lib/supabaseClient";
import { RestaurantListItem, type Restaurant } from "@/components/restaurant-list-item_ver2";
import { useSearchParams, useRouter } from "next/navigation"; // 쿼리 파라미터 훅 import
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { SearchAutocomplete } from "@/components/SearchBar";
import { FilterTag } from "@/components/filter-tag";
import HeaderWithBack from '@/components/HeaderWithBack';


// 실제 페이지 내용을 담을 컴포넌트 (useSearchParams를 포함한 모든 로직)
// 이 컴포넌트가 Suspense의 자식이 됩니다.
function RestaurantsPageContent() {
  //레스토랑 목록 상태
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  //로딩 상태
  const [loading, setLoading] = useState(false);
  //에러 메시지
  const [error, setError] = useState<string | null>(null)
  // 검색 입력값 상태
  const [inputValue, setInputValue] = useState("");

  //라우터, 쿼리 파라미터 훅
  const router = useRouter();
  const searchParams = useSearchParams(); // 여기에서 useSearchParams 사용

  //쿼리에서 필터링 조건 추출
  const foodTypes = searchParams.get("foodTypes");
  const tasteTypes = searchParams.get("tasteTypes");
  const logic = searchParams.get("logic") || "OR";

  //파싱된 필터 조건 배열
  let parsedFoodTypes: string[] = [];
  let parsedTasteTypes: string[] = [];

  try {
    parsedFoodTypes = foodTypes ? JSON.parse(foodTypes) : [];
  } catch {
    parsedFoodTypes = [];
  }
  try {
    parsedTasteTypes = tasteTypes ? JSON.parse(tasteTypes) : [];
  } catch {
    parsedTasteTypes = [];
  }

  //필터 검색 핸들러
  const handleSearch = (params: {
    selectedFoodTypes: string[];
    selectedTasteTypes: string[];
    tasteSearchLogic: "AND" | "OR";
  }) => {
    setLoading(true);
    const searchParams = new URLSearchParams({
      foodTypes: JSON.stringify(params.selectedFoodTypes),
      tasteTypes: JSON.stringify(params.selectedTasteTypes),
      logic: params.tasteSearchLogic,
    });
    //URL 갱신(쿼리 변경-> useEffect 감지)
    router.push(`/restaurants?${searchParams.toString()}`);
  };

  //이름 기반 검색 핸들러
  const handleEnterSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_id, restaurant_name, address, phone, restaurant_profiles(type,taste), image_url")
        .ilike("restaurant_name", `%${inputValue}%`);

      if (error) throw error
      // Supabase에서 받아온 데이터(data)가 존재할 경우 처리
      if (data) {
        // 평탄화된 Restaurant[]을 만들기 위해 새 배열 생성
        const cleaned: Restaurant[] = data.map((item) => {
          const profiles = Array.isArray(item.restaurant_profiles) ?
            item.restaurant_profiles :
            item.restaurant_profiles ?
            [item.restaurant_profiles] :
            [];
          // 중복 제거를 위한 Set 사용 (type, taste 각각)
          const typeSet = new Set<string>();
          const tasteSet = new Set<string>();
          // 각 profile 객체에서 type, taste 항목을 가져와 Set에 추가
          profiles.forEach((profile: any) => {
            // profile.type이 배열일 경우, 각 항목을 typeSet에 추가
            (profile.type || []).forEach((t: string) => typeSet.add(t));
            // profile.taste가 배열일 경우, 각 항목을 tasteSet에 추가
            (profile.taste || []).forEach((t: string) => tasteSet.add(t));
          });
          // 하나의 Restaurant 객체로 평탄화된 데이터 반환
          return {
            restaurant_id: item.restaurant_id,
            restaurant_name: item.restaurant_name,
            address: item.address,
            phone: item.phone,
            type: Array.from(typeSet),
            taste: Array.from(tasteSet),
            image_url: item.image_url
          };
        });
        // 최종적으로 상태에 저장 (Restaurant[] 타입으로 타입 에러 없이 안전함)
        setRestaurants(cleaned);
      }
    }
    catch (err) {
      console.error(err);
      setError("검색 중 오류가 발생했습니다.");
      setRestaurants([]);
    }
    finally {
      setLoading(false);
    }
  };
  //Supabase에서 필터링된 레스토랑 불러오기
  const fetchRestaurants = async (
    selectedFoodTypes: string[],
    selectedTasteTypes: string[],
    tasteSearchLogic: "AND" | "OR"
  ) => {
    setLoading(true);
    setError(null);

    try {
      let foodTypeQuery = supabase.from("restaurant_profiles").select("restaurant_id");
      if (selectedFoodTypes.length > 0) {
        foodTypeQuery = foodTypeQuery.overlaps("type", selectedFoodTypes);
      }
      if (selectedTasteTypes.length > 0) {
        if (tasteSearchLogic === "AND") {
          selectedTasteTypes.forEach((taste) => {
            foodTypeQuery = foodTypeQuery.overlaps("taste", [taste]);
          });
        }
        else {
          foodTypeQuery = foodTypeQuery.overlaps("taste", selectedTasteTypes);
        }
      }

      const { data: foodTypeData, error: foodTypeError } = await foodTypeQuery;
      if (foodTypeError) throw foodTypeError;

      const restaurantID = Array.from(new Set(foodTypeData.map((item) => item.restaurant_id)));
      if (restaurantID.length === 0) {
        setRestaurants([]);
        return;
      }

      const { data: restaurants, error: restaurantsError } = await supabase
        .from("restaurant")
        .select("restaurant_id, restaurant_name, address, phone,restaurant_profiles(type, taste), image_url")
        .in("restaurant_id", restaurantID);
      if (restaurantsError) throw restaurantsError;
      if (restaurants) {
        const cleaned: Restaurant[] = restaurants.map((item) => {
          const profiles = Array.isArray(item.restaurant_profiles) ?
            item.restaurant_profiles :
            item.restaurant_profiles ?
            [item.restaurant_profiles] :
            [];
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
            type: Array.from(typeSet),
            taste: Array.from(tasteSet),
            image_url: item.image_url
          };
        });
        setRestaurants(cleaned);
      }
    }
    catch (error) {
      console.error(error);
      setError("음식점 데이터를 불러오는 중 오류가 발생했습니다.");
      setRestaurants([]);
    }
    finally {
      setLoading(false);
    }
  };
  //쿼리 파라미터 변경 시 fetch 실행
  useEffect(() => {
    fetchRestaurants(parsedFoodTypes, parsedTasteTypes, logic as "AND" | "OR");
  }, [foodTypes, tasteTypes, logic]);

  // 필터 태그 영역 ref와 높이 상태 추가
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterHeight, setFilterHeight] = useState(0);
  // 필터 태그 높이 측정: 필터가 바뀔 때마다 높이 갱신
  useEffect(() => {
    if (filterRef.current) {
      setFilterHeight(filterRef.current.offsetHeight);
    } else {
      setFilterHeight(0);
    }
  }, [parsedFoodTypes, parsedTasteTypes]);

  //시트가 열려졌는지 확인
  const [isSheetOpen,setIsSheetOpen]=useState(false);

  return (
    <div className="max-w-[540px] mx-auto p-3">
      <HeaderWithBack title="식당 목록" backTF={true} />
      {/* 검색창 및 필터 버튼 */}
      <div className="max-w-[540px] w-[95%] h-15 fixed flex items-center justify-between mb-6 ">
        <div className="flex-1 mr-2 ">
          <SearchAutocomplete
            value={inputValue}
            onChange={setInputValue}
            onEnter={handleEnterSearch}
          />
        </div>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant={"secondary"}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg border-transparent relative bg-gray-200">
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full h-full sm:max-w-[540px] flex flex-col">
            <SheetHeader>
              <SheetTitle>필터링</SheetTitle>
            </SheetHeader>
            <div className="flex-grow my-0">

              <SearchFilter_ver3 onSearch={(params)=>{
                handleSearch(params);
                setIsSheetOpen(false);
              }}
               loading={loading} sideTF={true} />
            </div>
            <SheetFooter />
          </SheetContent>
        </Sheet>
      </div>

      {/*fixed 검색창 아래 공간 확보*/}
      <div style={{ height:(filterHeight>0 ? 0:60) + (filterHeight > 0? filterHeight:0) }} />

      {/* 필터 태그 영역 (검색창 아래에 표시, 높이 측정용 ref 포함) */}
      {(parsedFoodTypes.length > 0 || parsedTasteTypes.length > 0) && (
        <div
          ref={filterRef}
          className="mt-8" 
        >
            <div className="flex flex-wrap gap-2">
              {parsedFoodTypes.length > 0
                ? parsedFoodTypes.map((tag) => <FilterTag key={tag} label={tag} />)
                : <span className="text-sm text-gray-500"></span>}
                {parsedTasteTypes.length > 0
                ? parsedTasteTypes.map((tag) => <FilterTag key={tag} label={tag} />)
                : <span className="text-sm text-gray-500"></span>}
            </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && restaurants.length === 0 && <p className="py-20">등록된 음식점이 없습니다.</p>}

      {/* 결과 목록 */}
      <div className="space-y-3 py-4">
        {restaurants.map((r) => (
          <RestaurantListItem key={r.restaurant_id} restaurant={r} />
        ))}
      </div>
    </div>
  );
}

// 실제 내보낼 기본 컴포넌트는 Suspense로 RestaurantsPageContent를 감쌉니다.
export default function RestaurantsPage() {
  return (
    <Suspense fallback={<div>Loading restaurants...</div>}>
      <RestaurantsPageContent />
    </Suspense>
  );
}