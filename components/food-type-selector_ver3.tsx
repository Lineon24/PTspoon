"use client";

import { useEffect, useState } from "react";
import { FeatureToggle } from "./feature-toggle";
import { supabase } from "@/lib/supabaseClient";

interface FoodType {
  id: string;
  type: string;
  description:string;
}
const foodTypeEmojis:Record<string,string>={
  "1":"🍚",
  "2":"🍜",
  "3":"🍝",
  "4":"🍣",
  "5":"☕",
  "6":"🍗"
}
interface FoodTypeSelectorProps {
  selectedFoodTypes: string[];
  onToggleFoodType: (food_type: string) => void;
}

export function FoodTypeSelector_ver3({
  selectedFoodTypes,
  onToggleFoodType,
}: FoodTypeSelectorProps) {
  const [foodType, setFoodTypes] = useState<FoodType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFoodTypes = async () => {
      setLoading(true);
      console.log("Supabase에서 데이터 불러오기 시작");
      const { data, error } = await supabase
        .from("foodtype")
        .select("id,type,description");

      if (error) {
        console.error("음식 종류 불러오기 실패:", error);
        setFoodTypes([]);
      } else if (data) {
        setFoodTypes(data);
        // 3. 가져온 데이터를 로컬스토리지에 저장
        localStorage.setItem("foodtype", JSON.stringify(data));
        const withEmoji=data.map((item)=>({
           ...item,emoji: foodTypeEmojis[item.type] || "❓",
        }))
        setFoodTypes(withEmoji);
        localStorage.setItem("foodtype",JSON.stringify(withEmoji))
      }

      setLoading(false);
    };

    fetchFoodTypes();
  }, []);

  if (loading) {
    return (
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          음식 종류를 불러오는 중...
        </h2>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          어떤 음식이 드시고 싶나요?
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          여러 개를 선택해서 더 정확한 추천을 받아보세요
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {foodType.map((type) => (
          <FeatureToggle
            key={type.id}
            id={type.id}
            type={type.type}
            description={type.description}
            isSelected={selectedFoodTypes.includes(type.type)}
            emoji={foodTypeEmojis[type.id]}
            onToggle={() => onToggleFoodType(type.type)}
          />
        ))}
      </div>
    </div>
  );
}
