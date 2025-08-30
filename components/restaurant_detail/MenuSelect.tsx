"use client"; 
// Next.js에서 클라이언트 컴포넌트로 선언 (상태 관리, useEffect 등 사용 가능)
//메뉴와 리뷰를 버튼으로 처리하기 때문에 구분하기 쉽게 컴포넌트를 하나로 둠
import { useEffect, useState } from "react"; // React 훅 불러오기
import { supabase } from "@/lib/supabaseClient"; // Supabase 클라이언트
import { FeatureToggle } from "@/components/feature-toggle"; // 메뉴 선택 토글 버튼 컴포넌트
import { FilterTag } from "@/components/filter-tag";

// Supabase에서 불러올 메뉴 데이터 타입 정의
interface Menu {
  menu:string;
}

// 컴포넌트 props 타입 정의
interface MenuselectProps {
  selectedMenu?: string|null; // 현재 선택된 메뉴 배열
  onToggleMenu?: (menuName: string) => void; // 메뉴 클릭 시 실행할 콜백
  restaurantID: string; // 현재 식당의 ID
}

export function MenuSelect({ restaurantID, selectedMenu, onToggleMenu }: MenuselectProps) {
  // 메뉴 데이터 상태
  const [menu, setMenu] = useState<Menu[]>([]);
  // 로딩 상태
  const [loading, setLoading] = useState(false);
  //준희가 만든 댓글 창 여닫는 기능을 가져옴
  // 메뉴 펼침/접힘 상태 (기본값: false → 처음엔 닫힘)
  const [isOpen, setIsOpen] = useState(false);

  // Supabase에서 메뉴 데이터 가져오기
  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true); // 로딩 시작
      const { data, error } = await supabase
        .from("menu") // menu 테이블에서
        .select("menu") // menu 컬럼만 가져오기
        .eq("restaurant_id", restaurantID); // restaurant_id가 현재 ID와 같은 데이터만

      if (error) {
        console.error("레스토랑 메뉴 찾기 오류", error);
        setMenu([]); // 에러 시 빈 배열로 처리
      } else {
        setMenu(data || []); // 정상 데이터 세팅
      }
      setLoading(false); // 로딩 종료
    };

    // restaurantID가 존재할 때만 실행
    if (restaurantID) {
      fetchMenu();
    }
  }, [restaurantID]); // restaurantID 변경될 때마다 메뉴 다시 불러오기

  // 로딩 중일 때 표시
  if (loading) return <div>메뉴 불러오는 중...</div>;
  // 메뉴가 없을 때 표시
  if (menu.length === 0) return <div>메뉴가 없습니다.</div>;

  return(
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/*제목,펼지기/접기 버튼*/}
      <div className="flex items-center justify-between">
        {/*메뉴 제목,개수*/}
        <h2 className="flex items-center justify-between">
          메뉴 <span className="text-gray-400 text-sm">({menu.length || 0})</span>
        </h2>
        {/*펼치기/접기 버튼*/}
        <button
          onClick={()=>setIsOpen((prev)=>!prev)}
          className="flex items-center gap-1 text-blue-500 font-semibold hover:text-blue-600 transition-colors"
        >
          {isOpen?"접기":"펼치기"}
          <span
            className={`transform transition-transform duration-300 ${
              isOpen?"rotate-180":"rotate-0"
            }`}
            >
              ▼
            </span>
        </button>
      </div>
      {/*메뉴 목록*/}
      {isOpen && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {menu.map((item,index)=>(
            <div
              key={index}
              className={`p-3 rounded-xl border text-center text-sm font-medium cursor-pointer transition 
              ${
                selectedMenu === item.menu
                  ? "bg-blue-50 border-blue-400 text-blue-600"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              onClick={()=>onToggleMenu?.(item.menu)}>
                {item.menu}
              </div>
          ))}
        </div>
      )}
    </div>
  )
  
}
