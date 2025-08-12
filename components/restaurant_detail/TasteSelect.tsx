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
    <div>
      {/* 제목 + 펼치기/접기 버튼 */}
      <h2
        style={{
          fontSize: "16px",
          marginBottom: "0px",
          color: "#555",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        맛 종류 ({tasteTypes.length || 0})
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#414de4",
            fontSize: 16,
            fontWeight: "bold",
            padding: "10px",
          }}
        >
          {isOpen ? "접기" : "펼치기"}
          <span
            style={{
              padding: "5px",
              display: "inline-block",
              transition: "transform 0.3s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              lineHeight: 1,
            }}
          >
            ▼
          </span>
        </button>
      </h2>

      {/* 맛 종류 선택 버튼 목록 */}
      {isOpen && (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mt-3">
          {tasteTypes.map((type) => (
            <FeatureToggle
              key={type.id}
              id={type.id}
              type={type.taste}
              description=""
              isSelected={selectedTasteTypes.includes(type.taste)}
              emoji=""
              onToggle={() => onToggleTasteType(type.taste)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
