"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Menu {
  menu: string;
}

interface MenuselectProps {
  selectedMenu: string[];
  onToggleMenu: (menuName: string) => void; // 함수 타입으로 변경
  restaurantID: string;
}

export function MenuSelect({ restaurantID, selectedMenu, onToggleMenu }: MenuselectProps) {
  const [menu, setMenu] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(false);

  // 데이터베이스에서 메뉴를 불러오기
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("menu") // menu 테이블에서
        .select("menu") // 값 찾기
        .eq("restaurant_id", restaurantID); // 레스토랑 ID가 같은 거

      if (error) {
        console.error("레스토랑 메뉴 찾기 오류", error);
        setMenu([]);
      } else {
        setMenu(data || []);
      }
      setLoading(false);
    };

    if (restaurantID) {
      fetchMenu();
    }
  }, [restaurantID]);

  if (loading) {
    return <div>메뉴 불러오는 중...</div>;
  }

  if (menu.length === 0) {
    return <div>메뉴가 없습니다.</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {menu.map(({ menu: menuName }) => {
        const isSelected = selectedMenu.includes(menuName);

        return (
          <button
            key={menuName}
            onClick={() => onToggleMenu(menuName)}
            className={`px-3 py-1 rounded-full border ${
              isSelected
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-200 text-gray-800 border-gray-300"
            }`}
          >
            {menuName}
          </button>
        );
      })}
    </div>
  );
}
