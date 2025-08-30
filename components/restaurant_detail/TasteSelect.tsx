"use client";

import { useEffect, useState } from "react";
import { FeatureToggle } from "@/components/feature-toggle";
import { supabase } from "@/lib/supabaseClient";

// 음식 맛 종류 데이터 타입 정의
interface TasteType {
  id: string;
  taste: string;
  description: string;
}
interface TasteTypeSelectorProps {
  selectedTasteTypes: string[];
  onToggleTasteType: (taste: string) => void;
}

export function TasteTypeSelect({
  selectedTasteTypes,
  onToggleTasteType,
}: TasteTypeSelectorProps) {
  const [tasteTypes, setTasteTypes] = useState<TasteType[]>([]);
  const [loading, setLoading] = useState(true);
  //준희가 만든 댓글 창 여닫는 기능을 가져옴
  const [isOpen, setIsOpen] = useState(false); // 기본값 false → 처음엔 닫힘

  // Supabase에서 맛 종류 데이터 불러오기
  useEffect(() => {
    const fetchTasteTypes = async () => {
      setLoading(true);
      console.log("Supabase에서 데이터 불러오기 시작");

      const { data, error } = await supabase
        .from("foodtaste")
        .select("id,taste, description");

      if (error) {
        console.error("음식 종류 불러오기 실패:", error);
        setTasteTypes([]);
      } else if (data) {
        setTasteTypes(data);
      }
      setLoading(false);
    };

    fetchTasteTypes();
  }, []);

  if (loading) {
    return (
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          맛 종류를 불러오는 중...
        </h2>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
    {/* 제목 + 펼치기/접기 버튼 */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-gray-700">
          맛 종류 <span className="text-gray-400 text-sm">({tasteTypes.length || 0})</span>
        </h2>

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 text-blue-500 font-semibold hover:text-blue-600 transition-colors"
      >
        {isOpen ? "접기" : "펼치기"}
        <span
          className={`transform transition-transform duration-300 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        >
          ▼
        </span>
      </button>
    </div>

    {/* 맛 종류 선택 버튼 목록 */}
    {isOpen && (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        {tasteTypes.map((type) => (
          <div
            key={type.id}
            className={`p-3 rounded-xl border text-center text-sm font-medium cursor-pointer transition 
              ${
                selectedTasteTypes.includes(type.taste)
                  ? "bg-blue-50 border-blue-400 text-blue-600"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            onClick={() => onToggleTasteType(type.taste)}
          >
            {type.taste}
          </div>
        ))}
      </div>
    )}
  </div>
);

}
