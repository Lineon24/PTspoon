"use client";

import { useEffect, useState } from "react";
import { FeatureToggle } from "@/components/feature-toggle";
import { supabase } from "@/lib/supabaseClient";

interface TasteType {
  id:string
  taste: string;
  description: string;
}

const TasteTypeEmojis:Record<string,string>={
  "1": "🌶️",
  "2": "🧂",
  "3": "🌿",
  "4": "🔥",
  "5": "🍬",
  "6": "🌍",
  "7": "🧀",
  "8": "🍋",
  "9": "🧊",
  "10": "🍲",
  "11": "🍤",
  "12": "🍮", 
  "13": "🥛",
  "14": "🌸", 
  "15": "🍃",
  "16": "💪" 
}

interface TasteTypeSelectorProps {
  selectedTasteTypes: string[];
  onToggleTasteType: (taste: string) => void;
}

export function TasteTypeSelector_ver3({
  selectedTasteTypes,
  onToggleTasteType,
}: TasteTypeSelectorProps) {
  const [TasteType, setTasteTypes] = useState<TasteType[]>([]);
  const [loading, setLoading] = useState(true);

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
        // 3. 가져온 데이터를 로컬스토리지에 저장
         localStorage.setItem("foodtype", JSON.stringify(data));
        const withEmoji=data.map((item)=>({
           ...item,emoji: TasteTypeEmojis[item.taste] || "❓",
        }))
        setTasteTypes(withEmoji);
        localStorage.setItem("foodtype",JSON.stringify(withEmoji))
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          맛을 선택해 주세요
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          여러 개를 선택하시면 더 좋습니다.
        </p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
        {TasteType.map((type) => (
          <FeatureToggle
            key={type.id}
            id={type.id}
            type={type.taste}
            description={type.description}
            isSelected={selectedTasteTypes.includes(type.taste)}
            emoji={TasteTypeEmojis[type.id]}
            onToggle={() => onToggleTasteType(type.taste)}
          />
        ))}
      </div>
    </div>
  );
}
