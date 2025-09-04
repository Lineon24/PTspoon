"use client"; // 클라이언트 컴포넌트임을 명시

import { useState } from "react"; // React 상태 관리용 훅 import
import { Button } from "@/components/ui/button"; // 버튼 UI 컴포넌트 import
import { SearchFilter_ver3 } from "@/components/SearchFilter_ver3"; // 필터 UI 컴포넌트 import
import Link from "next/link"; // Next.js 링크 컴포넌트 import
import { MapPin, List } from "lucide-react"; // 아이콘 컴포넌트 import
import { useRouter } from "next/navigation"; // Next.js 라우터 훅 import
import HeaderWithBack from '@/components/HeaderWithBack';

export default function FilterPage() {
  const router = useRouter(); // 페이지 이동(네비게이션) 제어를 위한 라우터 훅 초기화
  const [loading, setLoading] = useState(false); // 검색 요청 중임을 나타내는 로딩 상태 변수

  // SearchFilter_ver3 컴포넌트에서 "조건 검색" 버튼 클릭 시 호출됨
  const handleSearch = (params: {
    selectedFoodTypes: string[]; // 사용자가 선택한 음식 종류 목록
    selectedTasteTypes: string[]; // 사용자가 선택한 맛 종류 목록
    tasteSearchLogic: "AND" | "OR"; // 맛 필터 조건 논리 (AND 혹은 OR)
  }) => {
    setLoading(true); // 검색 요청 시작 → 로딩 상태 true로 변경

    // URL 쿼리 스트링용 파라미터 생성
    const searchParams = new URLSearchParams({
      // 음식 종류 배열을 JSON 문자열로 변환해 쿼리스트링에 추가
      foodTypes: JSON.stringify(params.selectedFoodTypes),
      // 맛 종류 배열도 JSON 문자열로 변환해 추가
      tasteTypes: JSON.stringify(params.selectedTasteTypes),
      // 맛 검색 조건 논리를 문자열로 추가 (AND 또는 OR)
      logic: params.tasteSearchLogic,
    });

    // /test_restaurants 경로로 쿼리 파라미터를 포함해 페이지 이동
    router.push(`/restaurants?${searchParams.toString()}`);
  };

  return (
    // 전체 컨테이너: 너비 최대 2xl, 가운데 정렬, 패딩, flex컬럼 레이아웃, 높이 화면에서 헤더 뺀 만큼 설정
    <div className="w-full max-w-[540px] mx-auto py-6 px-4 flex flex-col h-[calc(100vh-128px)] ">
      
      {/* 상단 버튼 영역 */}
      <HeaderWithBack title="PTU 맛집 찾기" iconColor='#3878ff' iconIndex={0} backTF= {false} /> {/* 상단 고정 헤더 */}
      <div>
        {/* 내 주변 맛집 지도로 찾기 버튼 */}
        <Link href="/map" passHref>
          <Button
            asChild // Link 내부에 버튼 자식 컴포넌트로 렌더링
            className="w-full h-10 bg-green-500 hover:bg-green-600 text-white text-[15px] font-bold rounded-lg mb-4"
          >
            {/* 버튼 내용: 아이콘 + 텍스트 */}
            <span className="flex items-center justify-center">
              <MapPin className="mr-2 h-5 w-5" /> {/* 위치 핀 아이콘 */}
              내 주변 맛집 지도로 찾기
            </span>
          </Button>
        </Link>

        {/* 전체 음식점 목록 보기 버튼 */}
        <Link href="/restaurants" passHref>
          <Button
            asChild
            variant="outline" // 테두리만 있는 스타일
            className="w-full h-10 text-[15px] font-bold rounded-lg mb-6 bg-transparent"
          >
            {/* 버튼 내용: 리스트 아이콘 + 텍스트 */}
            <span>
              <List className="mr-2 h-5 w-5" /> {/* 리스트 아이콘 */}
              전체 음식점 목록 보기
            </span>
          </Button>
        </Link>
      </div>

      {/* 검색 필터 UI 영역 */}
      <div className="flex-grow pb-20 ">
        {/* SearchFilter_ver3 컴포넌트에 handleSearch 함수와 loading 상태 전달 */}
        <SearchFilter_ver3 onSearch={handleSearch} loading={loading} sideTF={false}/>
      </div>

      {/* 검색 버튼은 SearchFilter_ver3 내부에서 관리되므로 별도 버튼 없음 */}
    </div>
  );
}
