"use client";

import { useParams } from "next/navigation"; // URL 파라미터 가져오기
import Review_write from "@/components/restaurant_detail/Review_write"; // 리뷰 작성 폼 컴포넌트
import HeaderWithBack from "@/components/HeaderWithBack"; // 상단 헤더(뒤로 가기 버튼 포함)
import { Suspense } from "react"; // 비동기 로딩 시 fallback 처리
import { useRouter } from "next/navigation"; // 페이지 이동
import { useState } from "react"; // 상태 관리
import { TasteTypeSelect } from "@/components/restaurant_detail/TasteSelect"; // 맛 선택 UI
import { MenuSelect } from "@/components/restaurant_detail/MenuSelect"; // 메뉴 선택 UI

// 리뷰 작성 화면 컴포넌트
function ReviewWrite() {
  // 선택된 맛 목록 (복수 선택 가능)
  const [selectedTasteTypes, setSelectedTasteTypes] = useState<string[]>([]);
  // 선택된 메뉴 (단일 선택)
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  const router = useRouter(); // 페이지 이동 훅
  const params = useParams(); // URL 파라미터

  // URL에서 restaurants_id 값을 가져옴
  // 배열일 경우 첫 번째 값만 사용
  const restaurantid = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  // 식당 ID가 없으면 잘못된 접근 처리
  if (!restaurantid) {
    alert("잘못된 접근입니다.");
    router.push(`/restaurants`);
    return null;
  }

  // 단일 선택 토글 함수 (메뉴 선택)
  const toggleMenu = (menuName: string) => {
    setSelectedMenu((prev) => (prev === menuName ? null : menuName));
  };

  // 복수 선택 토글 함수 (맛 선택)
  const toggleTaste = (label: string) => {
    setSelectedTasteTypes((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  return (
    <div className="max-w-md mx-auto pb-10">
      {/* 상단 헤더 (뒤로가기 버튼, 제목) */}
      <HeaderWithBack title="리뷰 쓰기" backTF={true} />

      {/* 맛 선택 영역 */}
      <div className="mb-8 border p-4 rounded bg-gray-50">
        <h3 className="mb-2 font-semibold">드신 음식의 맛은 어떠셨나요?</h3>

        {/* 맛 선택 UI 컴포넌트 */}
        <TasteTypeSelect
          selectedTasteTypes={selectedTasteTypes}
          onToggleTasteType={toggleTaste}
        />

        {/* 선택된 맛 출력 */}
        <div className="mt-2 text-sm text-gray-700">
          선택된 맛: {selectedTasteTypes.join(",") || "없음"}
        </div>
      </div>

      {/* 메뉴 선택 영역 */}
      <div className="mb-8 border p-4 rounded bg-gray-50">
        <h3 className="mb-2 font-semibold">드신 메뉴를 선택해주세요</h3>

        {/* 메뉴 선택 UI 컴포넌트 */}
        <MenuSelect
          restaurantID={restaurantid}
          selectedMenu={selectedMenu}
          onToggleMenu={toggleMenu}
        />

        {/* 선택된 메뉴 출력 */}
        <div className="mt-2 text-sm text-gray-700">
          선택된 메뉴: {selectedMenu || "없음"}
        </div>
      </div>

      {/* 리뷰 작성 폼 */}
      <Review_write
        restaurantId={restaurantid} // 식당 ID
        menus={selectedMenu} // 선택된 메뉴
        tastes={selectedTasteTypes} // 선택된 맛 리스트
      />
    </div>
  );
}

// 페이지 컴포넌트 (Suspense로 감싸서 비동기 로딩 처리)
export default function ReviewWritePage() {
  return (
    <Suspense fallback={<div>Loading restaurants...</div>}>
      <ReviewWrite />
    </Suspense>
  );
}
