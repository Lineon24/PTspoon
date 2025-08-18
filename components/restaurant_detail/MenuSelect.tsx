"use client"; 
// Next.js에서 클라이언트 컴포넌트로 선언 (상태 관리, useEffect 등 사용 가능)
//메뉴와 리뷰를 버튼으로 처리하기 때문에 구분하기 쉽게 컴포넌트를 하나로 둠
import { useEffect, useState } from "react"; // React 훅 불러오기
import { supabase } from "@/lib/supabaseClient"; // Supabase 클라이언트
import { FeatureToggle } from "@/components/feature-toggle"; // 메뉴 선택 토글 버튼 컴포넌트
import { FilterTag } from "@/components/filter-tag";

interface Restaurant_review {
  id: string;
  restaurant_id: string;
  user_id: string;
  nickname: string;
  review: string;
  menu?: string | null;        // 단일 메뉴 이름 (nullable)
  tags?: string[] | null;      // 맛 태그 배열 (nullable)
  created_at?: string;
}

// Supabase에서 불러올 메뉴 데이터 타입 정의
interface Menu {
  menu: string;
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
        {/* 메뉴 제목 & 개수 */}
        메뉴 ({menu.length || 0})
        
        {/* 펼치기/접기 버튼 */}
        <button
          onClick={() => setIsOpen(prev => !prev)} // 클릭 시 isOpen 상태 토글
          style={{
            background: "none", // 배경 없음
            border: "none", // 테두리 없음
            cursor: "pointer", // 커서 모양 변경
            color: "#414de4", // 버튼 텍스트 색상
            fontSize: 16,
            fontWeight: "bold",
            padding: "10px",
          }}
        >
          {/* 버튼 텍스트: 상태에 따라 변경 */}
          {isOpen ? "접기" : "펼치기"}
          {/* 화살표 아이콘 */}
          <span
            style={{
              padding: "5px",
              display: "inline-block",
              transition: "transform 0.3s ease", // 부드러운 회전 애니메이션
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", // 열렸을 때 뒤집힘
              lineHeight: 1,
            }}
          >
            ▼
          </span>
        </button>
      </h2>

      {/* 메뉴 목록: isOpen이 true일 때만 표시 */}
      {isOpen && (
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mt-3">
          {menu.map((item, index) => (
            <FeatureToggle
              key={index} // React 리스트 key
              id={String(index)} // id는 인덱스를 문자열로 변환
              type={item.menu} // 메뉴 이름
              description="" // 설명은 비워둠
              emoji="" // 이모지도 비워둠
              isSelected={selectedMenu===item.menu} // 선택 여부
              onToggle={() => onToggleMenu?.(item.menu)} // 클릭 시 부모에서 받은 함수 실행
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RestaurantReviewList({ restaurantID}: MenuselectProps) {
  const [reviewList, setReviewList] = useState<Restaurant_review[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("restaurant_review")
        .select("*")
        .eq("restaurant_id", restaurantID);

      if (error) {
        console.error("리뷰 목록 불러오기 실패", error);
        setReviewList(null);
      } else {
        setReviewList(data);
      }
      setLoading(false);
    };

    fetchReview();
  }, [restaurantID]);

  if (loading) {
    return <div className="p-4 text-gray-500">로딩 중...</div>;
  }

  if (!reviewList || reviewList.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        아직 리뷰가 없습니다. 첫 리뷰어가 되어보세요! 🚀
      </div>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow shadow-gray-200 p-4 space-y-6">

      {reviewList.map((item) => (
        <div key={item.id} className="border-b border-gray-100 pb-4 last:border-none">
          {/* 닉네임 + 작성일 */}
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-800">{item.nickname}</span>
            <span className="text-sm text-gray-400">
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : ""}
            </span>
          </div>
          {/* 메뉴 필터태그 (단일 문자열) */}
          {item.menu && (
            <div className="flex flex-wrap gap-1 mb-1 py-1">
              <FilterTag label={item.menu} />
            </div>
          )}
          {/* 리뷰 내용 */}
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {item.review}
          </p>

          {/* 맛 태그들 (배열) */}
          {item.tags && item.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <FilterTag key={tag} label={tag} />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}