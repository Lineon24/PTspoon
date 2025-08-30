"use client";

import { useState, useEffect, useRef } from "react"                               // React에서 상태/생명주기/참조(레퍼런스) 기능을 쓰기 위한 훅들
import Script from "next/script"                                                  // Next.js에서 외부 스크립트(Kakao Map SDK 같은 것)를 안전하게 로드하는 컴포넌트
import { ChevronUp, ChevronDown, SlidersHorizontal } from "lucide-react"          // 아이콘 라이브러리(lucide-react)에서 위/아래 화살표 아이콘 컴포넌트를 가져옴
import { cn } from "@/lib/utils"                                                  // 조건에 따라 Tailwind 클래스명을 깔끔하게 합쳐주는 유틸 함수
import { supabase } from '@/lib/supabaseClient';                                  // Supabase와 통신(인증, DB조회 등)하기 위한 미리 설정해둔 클라이언트
import { useRouter } from "next/navigation"                                       // Next.js 클라이언트 라우터 훅. 코드로 페이지 이동(router.push)할 때 사용
import HeaderWithBack from '@/components/HeaderWithBack';                         // 프로젝트에 만든 커스텀 헤더 컴포넌트(뒤로가기 버튼 포함)


export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("home"); // 현재 활성화된 탭
  const [nickname, setNickname] = useState(""); // 닉네임 상태
  const router = useRouter();

  // 로그인 유저 닉네임 불러오기
  useEffect(() => {
    async function fetchNickname() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        // 로그인 안 돼 있으면 로그인 페이지로
        if (!session) {
          router.push("/login");
          return;
        }

        const userId = session.user.id;

        // profiles 테이블에서 해당 유저의 닉네임 가져오기
        const { data, error } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", userId);

        if (error) throw error;

        if (data && data.length > 0) {
          setNickname(data[0].nickname);
        }
      } catch (err) {
        console.error("닉네임 가져오기 실패:", err);
      }
    }

    fetchNickname();
  }, []);

  // 탭 내용 정의
  const tabContents = {
    home: (
      <>
        <p className="text-base sm:text-lg md:text-xl">
          <strong>{nickname}님의 홈페이지에 오신 것을 환영합니다!</strong>
        </p>

        <p className="text-sm sm:text-base">
          <strong>글을 통해 소통해 보세요.</strong>
        </p>

        <p className="text-sm sm:text-base">
          상단의 ✏️ 버튼으로 게시글 작성해 보세요.
        </p>
      </>
    ),

    posts: (
      <>
        <h3 className="text-left sm:text-xl font-bold">📝 채팅방</h3>
        <p className="text-left sm:text-base">아직 채팅방이 없습니다.</p>
      </>
    ),

    info: (
      <>
        <h3 className="text-left sm:text-xl font-bold">ℹ️ 정보</h3>
        <p className="text-left sm:text-base">한 줄 소개: 크크</p>
      </>
    ),
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 max-w-[540px] mx-auto">
      {/* 상단바 header */}
      <HeaderWithBack
        title={`${nickname}의 프로필`}
        backTF={true}
      />

      {/* 배너 영역 */}
      <section className="bg-blue-100 p-10 sm:p-20 text-center">
        <div className="flex justify-center gap-4 text-xl sm:text-2xl md:text-3xl">
          <span>😀</span>
          <span>🐮</span>
          <span>🐱</span>
          <span>🐸</span>
          <span>🐻</span>
        </div>
      </section>

      {/* 프로필 정보 영역 */}
      <section className="flex items-center p-4 border-b">
        {/* 프로필 이미지 자리 */}
        <div className="w-16 h-16 rounded-full bg-gray-300 mr-4"></div>
        {/* 프로필 정보 설정 */}
        <div className="text-left sm:text-left">
          <h2 className="font-bold text-lg sm:text-xl md:text-2xl flex items-center justify-left sm:justify-start gap-2">
            {nickname}
            <span>⚙️</span>
          </h2>
          <p className="text-sm sm:text-base">팔로우 0 팔로잉 0 </p>
          <p className="text-gray-600 text-xs sm:text-sm"> 가나다 </p>
        </div>
      </section>

      {/* 탭 네비게이션 */}
      <nav className="flex border-b text-sm sm:text-base">
        {["home", "posts", "info"].map((tab) => (
          <button
            key={tab}
            className={`flex-1 py-2 text-center ${
              activeTab === tab
                ? "border-b-2 border-blue-500 text-blue-500 font-bold"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "home" && "홈"}
            {tab === "posts" && "게시글"}
            {tab === "info" && "정보"}
          </button>
        ))}
      </nav>

      {/* 탭 컨텐츠 */}
      <main className="p-4 text-center sm:text-left">
      </main>
    </div>
  );
}