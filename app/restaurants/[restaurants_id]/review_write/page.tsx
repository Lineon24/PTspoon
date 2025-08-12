"use client"
import { useParams } from "next/navigation";
import Review_write from "@/components/restaurant_detail/Review_write";
import HeaderWithBack from "@/components/HeaderWithBack";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TasteTypeSelect } from "@/components/restaurant_detail/TasteSelect";
import { MenuSelect } from "@/components/restaurant_detail/MenuSelect";

function ReviewWrite() {
  const [selectedTasteTypes, setSelectedTasteTypes] = useState<string[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null); // 단일 선택
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

  const handleTasteSearch = (params: { selectedTasteTypes: string[] }) => {
    console.log("TasteSelect_Review onSearch params:", params);
  };

  // 단일 선택 토글 함수
  const toggleMenu = (menuName: string) => {
    setSelectedMenu((prev) => (prev === menuName ? null : menuName));
  };

  const toggleTaste = (label: string) => {
    setSelectedTasteTypes((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  return (
    <div>
      <HeaderWithBack title="리뷰 쓰기" backTF={true} />

      {/* TasteSelect */}
      <div className="mb-8 border p-4 rounded bg-gray-50">
        <h3 className="mb-2 font-semibold">새 컴포넌트 테스트 영역</h3>
        <TasteTypeSelect
          selectedTasteTypes={selectedTasteTypes}
          onToggleTasteType={toggleTaste}
        />
        <div className="mt-2 text-sm text-gray-700">
          선택된 맛: {selectedTasteTypes.join(", ") || "없음"}
        </div>
      </div>

      {/* MenuSelect */}
      <div className="mb-8 border p-4 rounded bg-gray-50">
        <h3 className="mb-2 font-semibold">새 컴포넌트 테스트 영역</h3>
        <MenuSelect
          restaurantID={restaurantid}
          selectedMenu={selectedMenu}
          onToggleMenu={toggleMenu}
        />
        <div className="mt-2 text-sm text-gray-700">
          선택된 메뉴: {selectedMenu || "없음"}
        </div>
      </div>

      <Review_write
        restaurantId={restaurantid}
        menus={selectedMenu}  // 배열로 감싸서 전달
        tastes={selectedTasteTypes}
      />
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
