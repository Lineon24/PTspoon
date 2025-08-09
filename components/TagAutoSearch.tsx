"use client"; // 클라이언트 컴포넌트임을 명시 (Next.js 13+)

import { useEffect, useState } from "react"; // React 훅들 import
import { supabase } from "@/lib/supabaseClient"; // Supabase 클라이언트 import

// 컴포넌트에 전달될 props 타입 정의
interface Props {
  keyword: string; // 검색 키워드 (예: '피자')
  onSelect: (selected: string) => void; // 선택된 항목을 부모에게 전달하는 콜백
}


// 자동완성 컴포넌트 정의
export function TagAutoSearch({ keyword, onSelect }: Props) {
  const [results, setResults] = useState<string[]>([]); // 검색 결과 목록 상태
  const [visible, setVisible] = useState(true); // 자동완성 박스 표시 여부 상태

  // 키워드가 변경될 때마다 Supabase에서 레스토랑 이름 검색
  useEffect(() => {
    if (!keyword) {
      setResults([]); // 키워드가 없으면 결과 초기화
      return;
    }

    // 비동기 검색 함수 정의
    const fetchTags = async () => {
      const { data, error } = await supabase
        .from("restaurant") // 'restaurant' 테이블에서
        .select("restaurant_name") // 'restaurant_name' 필드만 선택
        .ilike("restaurant_name", `%${keyword}%`) // keyword가 포함된 이름 검색 (대소문자 구분 없음)
        .limit(5); // 최대 5개까지만 결과 받기

      if (error) {
        console.error("자동완성 실패:", error); // 에러 콘솔 출력
      } else {
        // 결과에서 restaurant_name만 추출해서 상태에 저장
        setResults(data.map(item => item.restaurant_name));
      }
    };

    fetchTags(); // 검색 실행
  }, [keyword]); // keyword가 바뀔 때마다 실행됨

  // 검색어가 없거나 결과가 없거나 표시 상태가 false면 렌더링 안 함
  if (!keyword || results.length === 0 || !visible) return null;

  // 자동완성 결과 목록 UI
  return (
    <ul
      className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto w-full shadow-md"
      style={{ bottom: 0, transform: 'translateY(-100%)', marginBottom: 8 }}
    >
      {results.map((name) => (
        <li
          key={name} // 리스트에서 고유한 key
          onClick={() => {
            onSelect(name); // 선택한 이름을 부모에게 전달
            setVisible(false); // 자동완성 박스 숨기기
          }}
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer" // hover 시 배경색, 마우스 포인터
        >
          #{name} {/* 해시태그 형식으로 보여줌 */}
        </li>
      ))}
    </ul>
  );
}
