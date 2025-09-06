"use client"; // 클라이언트 컴포넌트 선언 (Next.js App Router)

import React, { useState, useEffect, useCallback } from "react"; // React 훅 임포트
import { supabase } from "@/lib/supabaseClient"; // Supabase 클라이언트
import { useRouter } from "next/navigation"; // Next.js 라우터 (App Router)
import HeaderWithBack from "@/components/HeaderWithBack"; // 뒤로가기 헤더 컴포넌트

// ===== 타입 정의 ===== //
interface Post { // 게시글 타입
  id: string; // PK
  title: string; // 제목
  created_at: string; // 생성일시
}

interface Comment { // 댓글 타입
  id: string; // PK
  post_id: string; // 연결된 게시글 ID(FK)
  content: string; // 댓글 내용
  created_at: string; // 생성일시
  post_title: string; // JOIN한 게시글 제목 (UI에서 [제목] 표시용)
}

interface ChatRoom { // 채팅방 타입
  id: string; // PK
  room_name: string; // 채팅방 이름
  created_at: string; // 생성일시
  creator_id: string; // 방 만든 사람
}

interface RestaurantReview { // 레스토랑 리뷰 타입
  id: string; // PK/
  restaurant_id: string; // 식당 ID
  review: string; // 리뷰 내용
  created_at: string; // 생성일시
  nickname: string; // 작성자 닉네임
  menu: string | null; // 메뉴 (옵션)
  tags: string[] | null; // 태그들 (옵션)
}

// ===== 공통 리스트 컴포넌트 ===== //
interface ListSectionProps<T> { // 제너릭 리스트 섹션 프롭스
  title: string; // 섹션 타이틀
  items: T[]; // 아이템 배열
  onClick: (item: T) => void; // 아이템 클릭 핸들러
  emptyText: string; // 비어있을 때 문구
  renderItem: (item: T) => React.ReactNode; // 아이템 렌더 함수
}

function ListSection<T extends { id: string | number }>({ // 각 리스트 공통 UI
  title, // 제목
  items, // 아이템들 
  onClick, // 클릭 핸들러 
  emptyText, // 비었을 때 문구 
  renderItem, // 아이템 렌더러 
}: ListSectionProps<T>) {
  return (
    <section className="mb-4"> {/* 섹션 여백 하단 1rem 정도 */} 
      <h3 className="font-bold mb-1 text-sm">{title}</h3> {/* 섹션 제목 */} 
      {items.length > 0 ? ( // 아이템이 하나 이상일 때 
        items.map((item) => ( // 각 아이템을 카드로 렌더 
          <div
            key={item.id} // 고유 키 //
            className="p-2 border-b cursor-pointer hover:bg-gray-50 transition text-sm" // 행 스타일 
            onClick={() => onClick(item)} // 클릭 시 상위 onClick 호출 
          >
            {renderItem(item)} {/* 상위에서 주입한 렌더 함수 */} 
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-xs">{emptyText}</p> // 비어있을 때 안내 문구 
      )}
    </section>
  );
}

// ===== 메인 컴포넌트 ===== //
export default function ProfilePage() { // 프로필 페이지 진입 컴포넌트 
  const router = useRouter(); // 라우터 객체 
  const [activeTab, setActiveTab] = useState<"homeReview" | "posts" | "chat">("homeReview"); // 탭 구성(홈+리뷰, 게시글, 채팅) 
  const [homeReviewMode, setHomeReviewMode] = useState<"home" | "review">("home"); // 홈 탭 내부(댓글/리뷰) 토글 상태 
  const [nickname, setNickname] = useState("(알수없음)"); // 사용자 닉네임 
  const [myPosts, setMyPosts] = useState<Post[]>([]); // 내가 쓴 게시글 
  const [myComments, setMyComments] = useState<Comment[]>([]); // 내가 쓴 댓글 
  const [myChats, setMyChats] = useState<ChatRoom[]>([]); // 내가 참여한 채팅방 
  const [myReviews, setMyReviews] = useState<RestaurantReview[]>([]); // 내가 쓴 리뷰 

  const fetchProfileData = useCallback(async () => { // 데이터 일괄 로딩 함수 
    const { data: sessionData } = await supabase.auth.getSession(); // 현재 세션 요청 
    const session = sessionData.session; // 세션 객체 
    if (!session) { // 비로그인 시 
      router.push("/login"); // 로그인 페이지로 이동
      return; // 이후 로직 중단 
    }
    const userId = session.user.id; // 현재 로그인한 사용자 ID 

    // --- 프로필(닉네임) --- //
    const { data: profileData } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .single(); // 단일 로우 
    if (profileData) setNickname(profileData.nickname); // 닉네임 상태 반영 

    // --- 내가 쓴 게시글 --- //
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // 최신순 
    setMyPosts(postsData ?? []); // 없으면 빈 배열 

    // --- 내가 쓴 댓글 + 게시글 제목 JOIN --- //
    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, posts(title)") // 외래키로 posts.title 조인 
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // 최신순 
    if (commentsData) {
      setMyComments(
        commentsData.map((c: any) => ({ // any → 조인 결과 가공 
          ...c, // 기존 필드 유지 
          post_title: c.posts?.title ?? "(제목 없음)", // UI 표기용 게시글 제목 
        }))
      ); // 댓글 상태 업데이트 
    }

    // --- 내가 참여한 채팅방 (messages 기준 room_id 추출) --- //
    const { data: myMessageRooms } = await supabase
      .from("messages")
      .select("room_id")
      .eq("user_id", userId); // 내가 메시지 남긴 방이 참여한 방으로 간주 
    if (myMessageRooms) {
      const roomIds = [...new Set(myMessageRooms.map((m) => m.room_id))]; // 중복 제거 
      if (roomIds.length > 0) { // 참여한 방이 있을 때 //
        const { data: chatData } = await supabase
          .from("chat_rooms")
          .select("id, room_name, created_at, creator_id")
          .in("id", roomIds)
          .order("created_at", { ascending: false }); // 최신순 
        setMyChats(chatData ?? []); // 채팅방 상태 업데이트 
      } else {
        setMyChats([]); // 참여 방 없음 
      }
    }

    // --- 내가 쓴 레스토랑 리뷰 --- //
    const { data: reviewData } = await supabase
      .from("restaurant_review")
      .select("id, restaurant_id, review, created_at, nickname, menu, tags")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }); // 최신순 
    setMyReviews(reviewData ?? []); // 리뷰 상태 업데이트 
  }, [router]); // 라우터 변경 의존 

  useEffect(() => {
    fetchProfileData(); // 최초 마운트 시 데이터 로드 
  }, [fetchProfileData]); // 콜백 변경 시 재실행 

  // ===== 탭별 콘텐츠 ===== //
  const tabContents: Record<string, React.ReactNode> = { // 현재 탭에 따른 콘텐츠 매핑 
    homeReview: ( // 홈 + 리뷰 탭 (내부 버튼으로 전환) 
      <div> {/* 내부 토글 및 리스트 컨테이너 */} 
        {/* 🔥 내부 버튼: 홈(댓글)/리뷰 전환 */} 
        <div className="flex gap-2 mb-3"> {/* 버튼 간격 + 하단 여백 */} 
          <button
            className={`px-3 py-1 rounded-full text-xs ${ // 버튼 기본 스타일 
              homeReviewMode === "home" ? "bg-blue-500 text-white" : "bg-gray-200" // 선택 상태 색상 
            }`}
            onClick={() => setHomeReviewMode("home")} // 홈(댓글) 모드로 
          >
            홈 {/* 댓글 리스트 탭 의미 */} 
          </button>
          <button
            className={`px-3 py-1 rounded-full text-xs ${ // 버튼 기본 스타일 
              homeReviewMode === "review" ? "bg-blue-500 text-white" : "bg-gray-200" // 선택 상태 색상 
            }`}
            onClick={() => setHomeReviewMode("review")} // 리뷰 모드로 
          >
            리뷰 {/* 레스토랑 리뷰 리스트 탭 의미 */} 
          </button>
        </div>

        {homeReviewMode === "home" ? ( // 홈(댓글) 모드일 때 
          <ListSection
            title="📝 내가 쓴 댓글" // 섹션 제목 
            items={myComments} // 댓글 목록 
            onClick={(c) => router.push(`/posts/${c.post_id}`)} // 댓글 클릭 시 해당 게시글로 이동 
            emptyText="댓글이 없습니다." // 비어있을 때 문구 
            renderItem={(c) => ( // 댓글 아이템 렌더 
              <>
                {/* 🔥 제목/내용 색상 분리 (게시글/채팅방과 톤 맞춤) */} 
                <p className="font-semibold text-sm text-gray-900">[{c.post_title}]</p> {/* 제목: 진한 색 */} 
                <p className="text-gray-600 text-sm break-words">{c.content}</p> {/* 내용: 회색 계열 */} 
              </>
            )}
          />
        ) : ( // 리뷰 모드일 때 //
          <ListSection
            title="🍴 내가 쓴 레스토랑 리뷰" // 섹션 제목 
            items={myReviews} // 리뷰 목록 
            onClick={(r) => router.push(`/restaurants/${r.restaurant_id}`)} // 클릭 시 해당 식당 페이지로 이동 
            emptyText="작성한 리뷰 없습니다" // 비어있을 때 문구 
            renderItem={(r) => ( // 리뷰 아이템 렌더 
              <>
                <p className="font-semibold text-sm text-gray-900">{r.review}</p> {/* 리뷰 본문(제목 역할) */} 
                <p className="text-gray-500 text-xs">
                  {new Date(r.created_at).toLocaleDateString()} {/* 생성일 */} 
                </p>
              </>
            )}
          />
        )}
      </div>
    ),
    posts: ( // 게시글 탭 //
      <ListSection
        title="📝 내가 쓴 게시글" // 섹션 제목 
        items={myPosts} // 게시글 목록 
        onClick={(p) => router.push(`/posts/${p.id}`)} // 클릭 시 해당 게시글로 
        emptyText="게시글 없습니다" // 비어있을 때 문구 
        renderItem={(p) => ( // 게시글 아이템 렌더 
          <>
            <p className="font-semibold text-sm text-gray-900">{p.title}</p> {/* 제목: 진한 색 */} 
            <p className="text-gray-500 text-xs">
              {new Date(p.created_at).toLocaleDateString()} {/* 생성일 */} 
            </p>
          </>
        )}
      />
    ),
    chat: ( // 채팅방 탭 //
      <ListSection
        title="💬 내가 참여한 채팅방" // 섹션 제목 
        items={myChats} // 채팅방 목록 
        onClick={(c) => router.push(`/chat/${c.id}`)} // 클릭 시 해당 채팅방으로 
        emptyText="채팅방 없습니다" // 비어있을 때 문구
        renderItem={(c) => ( // 채팅방 아이템 렌더 
          <>
            <p className="font-semibold text-sm text-gray-900">{c.room_name}</p> {/* 방 이름: 진한 색 */} 
            <p className="text-gray-500 text-xs">
              {new Date(c.created_at).toLocaleDateString()} {/* 생성일 */} 
            </p>
          </>
        )}
      />
    ),
  };

  return (
    <div className="w-full max-w-[540px] mx-auto flex flex-col h-[calc(100vh-128px)]"> {/* 모바일 폭 기준 컨테이너 */} 
      <HeaderWithBack title={``} backTF={true} /> {/* 상단 헤더(뒤로가기) */} 
      <section className="bg-blue-100 p-10 text-center"> {/* 배너 영역 */} 
        <div className="flex justify-center gap-2 text-xl"> {/* 이모지 나열 */} 
          {["😀", "🐮", "🐱", "🐸", "🐻"].map((emoji) => ( // 샘플 이모지 
            <span key={emoji}>{emoji}</span> // 키로 이모지 자체 사용 
          ))}
        </div>
      </section>

      {/* 프로필 영역 */} 
      <section className="flex items-center p-4 border-b"> {/* 아바타 + 기본정보 */} 
        <div className="w-16 h-16 rounded-full bg-gray-300 mr-4"></div> {/* 프로필 이미지 플레이스홀더 */} 
        <div className="text-left"> {/* 텍스트 정렬 */} 
          <h2 className="font-bold text-lg flex items-center gap-2"> {/* 닉네임 + 설정 아이콘 */} 
            {nickname} {/* 사용자 닉네임 */} 
            <span>⚙️</span> {/* 설정 아이콘 자리 */} 
          </h2>
          <p className="text-sm">팔로우 0 팔로잉 0</p> {/* 더미 카운트 */} 
          <p className="text-gray-600 text-xs">가나다</p> {/* 상태 메시지/소개 등 */} 
        </div>
      </section>

      {/* 탭 네비게이션 */} 
      <nav className="flex border-b text-sm"> {/* 탭 바 */} 
        {[
          { key: "homeReview", label: "홈" }, // 홈(댓글/리뷰 내부 토글) 
          { key: "posts", label: "게시글" }, // 게시글 탭 
          { key: "chat", label: "채팅방" }, // 채팅방 탭 
        ].map((tab) => (
          <button
            key={tab.key} // 유니크 키 
            className={`flex-1 py-2 text-center ${
              activeTab === tab.key
                ? "border-b-2 border-blue-500 text-blue-500 font-bold" // 활성 탭 스타일 
                : "text-gray-600" // 비활성 탭 스타일 
            }`}
            onClick={() => setActiveTab(tab.key as any)} // 탭 전환 
          >
            {tab.label} {/* 탭 라벨 */} 
          </button>
        ))}
      </nav>

      {/* 현재 탭의 콘텐츠 출력 */} 
      <main className="p-3">{tabContents[activeTab]}</main> {/* 섹션 컨텐츠 */} 
    </div>
  );
}