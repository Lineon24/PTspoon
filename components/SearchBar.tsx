"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// SearchAutocomplete 컴포넌트는 부모로부터 value와 onChange를 props로 받아서 사용
interface SearchAutocompleteProps {
  value: string;                // 현재 입력된 검색어
  onChange: (value: string) => void; // 입력값 변경 시 호출하는 함수
  onEnter?:()=>void //enter를 눌렀을때 실행되는 함수
}

export function SearchAutocomplete({ value, onChange,onEnter }: SearchAutocompleteProps) {
  // 자동완성 결과 목록 상태 (식당 이름 배열)
  const [results, setResults] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // value(입력값)가 변경될 때마다 자동완성 결과를 불러오는 useEffect
  useEffect(() => {
    // 300ms 디바운스 타이머 설정 — 너무 잦은 요청 방지용
    const delay = setTimeout(async () => {
      // 입력값이 비어있으면 자동완성 결과 초기화
      if (value.trim().length === 0) {
        setResults([]);
        return;
      }

      // Supabase에서 restaurant 테이블을 검색
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_name")              // 식당 이름 컬럼만 조회
        .ilike("restaurant_name", `%${value.trim()}%`) // 대소문자 구분 없이 포함 검색
        .limit(5);                             // 최대 5개까지만 가져오기

      if (!error && data) {
        // 데이터가 정상적으로 오면 이름만 배열로 추출하여 상태에 저장
        setResults(data.map((r) => r.restaurant_name));
        // 또한 검색 결과를 로컬스토리지에 저장
        localStorage.setItem("Searched_restaurant",JSON.stringify(data))
      } else {
        // 에러 발생 시 결과 초기화
        setResults([]);
      }
    }, 300);
    // 컴포넌트가 업데이트되거나 언마운트 될 때 이전 타이머를 취소해 중복 호출 방지
    return () => clearTimeout(delay);
  }, [value]); // value가 바뀔 때마다 실행

  useEffect(()=>{
    const handleClickOutside=(e:MouseEvent)=>{
      if(wrapperRef.current && !wrapperRef.current.contains(e.target as Node)){
        setResults([]);
      }
    };
    document.addEventListener("mousedown",handleClickOutside);
    return ()=>document.removeEventListener("mousedown",handleClickOutside);
  },[]);

  return (
    <div className="relative">
      {/* 검색 아이콘: 입력창 왼쪽에 위치 */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

      {/* 입력창 */}
      <Input
        placeholder="지역, 음식 또는 식당명 검색"
        className="pl-10 h-12 rounded-full shadow-lg border-transparent" // 아이콘 공간만큼 padding-left 추가
        value={value}
        onChange={(e) => onChange(e.target.value)}  // 입력 변화 시 부모 컴포넌트에 알려줌
        autoComplete="off"                          // 브라우저 기본 자동완성 끔
        onKeyDown={(e)=>{
            if(e.key==="Enter") {
                e.preventDefault();
                if(onEnter)onEnter();
            }
        }}
      />

      {/* 자동완성 결과 리스트 */}
      {results.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md max-h-48 overflow-y-auto shadow-md mt-1">
          {results.map((name) => (
            <li
              key={name}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => {
                onChange(name);   // 리스트 아이템 클릭 시 입력값을 선택한 이름으로 변경
                setResults([]);   // 결과 목록 닫기
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
