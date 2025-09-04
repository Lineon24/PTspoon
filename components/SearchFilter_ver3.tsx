"use client";

import { useEffect, useState } from "react";
import { FoodTypeSelector_ver3 } from "./food-type-selector_ver3";
import { TasteTypeSelector_ver3 } from "./taste-selector_ver3";
import { SearchLogicToggle } from "./search-logic-toggle";
import { Button } from "@/components/ui/button";
import {cn} from "@/lib/utils"
import { FilterTag } from "./filter-tag";
// 부모 컴포넌트에서 전달받는 props 타입 정의
interface SearchFilterProps {
  onSearch: (params: {
    selectedFoodTypes: string[];   // 선택된 음식 종류 배열
    selectedTasteTypes: string[];  // 선택된 맛 종류 배열
    tasteSearchLogic: "AND" | "OR"; // 맛 조건에 대한 검색 논리 (AND 또는 OR)
  }) => void;
  loading?: boolean;  // 로딩 상태 표시용 (선택적)
  sideTF?: boolean;
}
//탭 상태를 나타내는 타입
type ActiveTab="foodType"|"taste";

// 음식 종류, 맛, 검색 논리 선택 UI를 담당하는 컴포넌트
export function SearchFilter_ver3({ onSearch, loading = false, sideTF = false }: SearchFilterProps) {
  //현재 선택된 탭 상태(음식 종류/맛 특징) 기본은 음식 종류
  const[activeTab,setActiveTab]=useState<ActiveTab>("foodType")
  // 선택된 음식 종류 상태
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  // 선택된 맛 종류 상태
  const [selectedTasteTypes, setSelectedTasteTypes] = useState<string[]>([]);
  // 맛 조건의 검색 논리 상태 (기본값: OR)
  const [tasteSearchLogic, setTasteSearchLogic] = useState<"AND" | "OR">("OR");

  useEffect(() => {
    const savedFoodTypes = localStorage.getItem("selectedFoodTypes");
    if (savedFoodTypes) setSelectedFoodTypes(JSON.parse(savedFoodTypes));

    const savedTasteTypes = localStorage.getItem("selectedTasteTypes");
    if (savedTasteTypes) setSelectedTasteTypes(JSON.parse(savedTasteTypes));

    const savedLogic = localStorage.getItem("tasteSearchLogic");
    if (savedLogic === "AND" || savedLogic === "OR") setTasteSearchLogic(savedLogic);
  }, []);

  // selectedFoodTypes 상태가 변경될 때마다 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem("selectedFoodTypes", JSON.stringify(selectedFoodTypes));
  }, [selectedFoodTypes]);

  // selectedTasteTypes 상태가 변경될 때마다 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem("selectedTasteTypes", JSON.stringify(selectedTasteTypes));
  }, [selectedTasteTypes]);

  // tasteSearchLogic 상태가 변경될 때마다 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem("tasteSearchLogic", JSON.stringify(tasteSearchLogic));
  }, [tasteSearchLogic]);

  // 음식 종류 토글 함수
  // 이미 선택된 항목이면 제거, 아니면 추가
  const toggleFoodType = (label: string) => {
    setSelectedFoodTypes((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  // 맛 종류 토글 함수
  // 이미 선택된 항목이면 제거, 아니면 추가
  const toggleTaste = (label: string) => {
    setSelectedTasteTypes((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  //리셋 함수
  const resetFilters=()=>{
    setSelectedFoodTypes([]);
    setSelectedTasteTypes([]);
    setTasteSearchLogic("OR")
  }

  // "조건 검색" 버튼 클릭 시 호출되는 함수
  // 현재 선택 상태를 부모 컴포넌트에 전달
  const handleSearchClick = () => {
    onSearch({
      selectedFoodTypes,
      selectedTasteTypes,
      tasteSearchLogic,
    });
  };

  // 전체 선택된 항목 수 계산 (음식 종류 + 맛)
  const totalSelections = selectedFoodTypes.length + selectedTasteTypes.length;

  return (
    <div className="flex flex-col">
      {/*탭 전환 버튼*/}
      <div className="flex flex-col">
      <div className="flex w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
        
        <button onClick={()=>setActiveTab("foodType")}
          className={cn(
            "w-1/2 py-2.5 text-sm font-semibold rounded-md transition-colors",
            activeTab==="foodType"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-50"
            : "text-gray-600 dark:text-gray-400",
          )}
          >
            <span className="mr-2">🍽️</span>
            음식종류
          </button>
          <button onClick={()=> setActiveTab("taste")}
          className={cn(
            "w-1/2 py-2.5 text-sm font-semibold rounded-md transition-colors",
            activeTab==="taste"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-50"
            : "text-gray-600 dark:text-gray-400",
          )}>
            <span className="mr-2">✨</span>맛 특징
          </button>
      </div>
      </div>
      <div className={cn(
          "flex-grow overflow-auto grid h-[100dvh] pb-300", // 조건 검색 버튼 부분 때문에 맛의 종류와 특징 버튼이 가려지는 문제 해결 부분
          {"h-[55dvh]" : totalSelections > 0 },)}
          >
      {/*음식 종류,맛 종류를 누르면 해당 요소가 나오도록*/}
      {activeTab==="foodType"?<FoodTypeSelector_ver3 selectedFoodTypes={selectedFoodTypes} onToggleFoodType={toggleFoodType} />
      :<TasteTypeSelector_ver3 selectedTasteTypes={selectedTasteTypes} onToggleTasteType={toggleTaste} />}    
      </div>  
      {/* 검색 버튼, 맛 종류 혹은 음식 특징이 선택되면 나타남 */}
      {totalSelections > 0 && ( 

        <div
          className={cn(
            // 공통 스타일
            "w-full z-50 border-t dark:border-gray-800 bg-white dark:bg-gray-900",
            // 조건 검색 버튼이 밑으로 가야할떄
            {
              "fixed bottom-14 left-1/2 -translate-x-1/2 max-w-[540px] px-4 py-1": !sideTF, // side가 false일때 기본값 중앙에 옴
            },
            // 시트내의 조건 버튼 (sideTF가 true일 때)
            {
              "static bottom-0 mx-auto py-1": sideTF //  sideTF가 true면 컨테이너에 따라서 배치
            }
          )}
        >
            <div className="flex justify-between items-center gap-4 pb-2 px-1 py-4">
              {/*선택된 조건 리스트(표시용 이후 하단의 코드는 로컬 스토리지에 영향을 주지 않음)*/}
              <div className="mb-2 flex flex-wrap gap-1 ">
                {selectedFoodTypes.map((tag)=>(
                  <FilterTag key={tag} label={tag} onRemove={()=>toggleFoodType(tag)}/>
                ))}
                {selectedTasteTypes.map((tag)=>(
                  <FilterTag key={tag} label={tag} onRemove={()=>toggleTaste(tag)}/>
                ))}
              </div>
              {/*맛 특징이 2개 이상이면 AND/OR 기능 표시*/}
              {activeTab==="taste"&&selectedTasteTypes.length>1 && (
                <div className="flex-shrink-0">
                  <SearchLogicToggle logic={tasteSearchLogic} onLogicChange={setTasteSearchLogic}/>
                </div>
              )}
            </div>
            {/*버튼 스타일 지정 및 기능 추가*/}
            <Button className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
              onClick={handleSearchClick}>
              {totalSelections}개 조건으로 검색하기
            </Button>
            <Button className="w-full h-10 bg-white-600 hover:bg-gray-100 text-black text-sm font-bold" variant="ghost" onClick={resetFilters}>초기화</Button>
        </div>
      )}
    </div>
  );
}
