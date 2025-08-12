"use client";
import { useParams } from "next/navigation";
import Review_write from "@/components/restaurant_detail/Review_write";
import HeaderWithBack from "@/components/HeaderWithBack";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
// 새로 만든 컴포넌트 임포트 (경로는 실제 위치에 맞게 바꿔주세요)
import { TasteSelect_Review } from "@/components/restaurant_detail/TasteSelect";
import { MenuSelect } from "@/components/restaurant_detail/MenuSelect";

function ReviewWrite() {
    const [selectedMenu, setSelectedMenu] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams();
  const restaurantid = Array.isArray(params.restaurants_id)
    ? params.restaurants_id[0]
    : params.restaurants_id;

  if (!restaurantid) {
    alert("잘못된 접근입니다.");
    router.push(`/restaurants`);
    return null;
  }

  // 새 컴포넌트 테스트용 상태 & 콜백
  const handleTasteSearch = (params: { selectedTasteTypes: string[] }) => {
    console.log("TasteSelect_Review onSearch params:", params);
    // 필요하면 상태 업데이트나 추가 동작 가능
  };

  const toggleMenu = (menuName: string) => {
    setSelectedMenu((prev) =>
      prev.includes(menuName) ? prev.filter((m) => m !== menuName) : [...prev, menuName]
    );
  };

  return (
    <div>
      <HeaderWithBack title="리뷰 쓰기" backTF={true} />

      {/* 새 컴포넌트 임시 렌더링 */}
      <div className="mb-8 border p-4 rounded bg-gray-50">
        <h3 className="mb-2 font-semibold">새 컴포넌트 테스트 영역</h3>
        <TasteSelect_Review onSearch={handleTasteSearch} />
      </div>
      <div className="mb-8 border p-4 rounded bg-gray-50">
        <h3 className="mb-2 font-semibold">새 컴포넌트 테스트 영역</h3>
        <MenuSelect
          restaurantID={restaurantid}
          selectedMenu={selectedMenu}
          onToggleMenu={toggleMenu}
        />
        <div className="mt-2 text-sm text-gray-700">
          선택된 메뉴: {selectedMenu.join(", ") || "없음"}
        </div>
      </div>


      <Review_write restaurantId={restaurantid} />
    </div>
  );
}

export default function ReviewWritePage() {
  return (
    <Suspense fallback={<div>Loading restaurants...</div>}>
      <ReviewWrite />
    </Suspense>
  );
}
