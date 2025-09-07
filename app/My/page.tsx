"use client"; // Next.js App Router에서 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect, useCallback } from "react";      // React 훅
import { supabase } from "@/lib/supabaseClient";                      // Supabase 클라이언트
import { useRouter } from "next/navigation";                          // Next.js 라우터
import HeaderWithBack from "@/components/HeaderWithBack";             // 상단 헤더 컴포넌트

// ===== 타입 정의 ===== //
interface Post { // 게시글 타입
  id: string; // 게시글 ID
  title: string; // 제목
  content?: string; // 내용 (선택)
  created_at: string; // 작성일
  image_urls?: string[]; // 이미지 배열 (선택)
}

interface Comment { // 댓글 타입
  id: string; // 댓글 ID
  post_id: string; // 연결된 게시글 ID
  content: string; // 댓글 내용
  created_at: string; // 작성일
  post_title: string; // 게시글 제목
  post_content?: string; // 게시글 내용 (선택)
  post_images?: string[]; // 게시글 이미지
  isImageComment?: boolean; // 이미지 댓글 여부
}

interface ChatRoom { // 채팅방 타입
  id: string; // 채팅방 ID
  room_name: string; // 채팅방 이름
  created_at: string; // 생성일
  creator_id: string; // 만든 사람 ID
}

interface RestaurantReview { // 레스토랑 리뷰 타입
  id: string; // 리뷰 ID
  restaurant_id: string; // 식당 ID
  review: string; // 리뷰 내용
  created_at: string; // 작성일
  nickname: string; // 작성자 닉네임
  menu: string | null; // 메뉴명 (없을 수 있음)
  tags: string[] | null; // 태그 배열 (없을 수 있음)
  restaurant?: {               // restaurant 조인
    restaurant_name: string;
    address?: string;
    phone?: string;
    image_url?: string;
  };
}

// ===== 공통 리스트 컴포넌트 ===== //
interface ListSectionProps<T> {
  title: string; // 섹션 제목
  items: T[]; // 렌더링할 아이템 리스트
  onClick: (item: T) => void; // 클릭 시 동작
  emptyText: string; // 비어있을 때 표시 문구
  renderItem: (item: T) => React.ReactNode; // 아이템 렌더링 함수
}

function ListSection<T extends { id: string | number }>({ // 제네릭 컴포넌트
  title,
  items,
  onClick,
  emptyText,
  renderItem,
}: ListSectionProps<T>) {
  return (
    <section className="mb-4"> {/* 섹션 컨테이너 */}
      <h3 className="font-bold mb-1 text-sm">{title}</h3> {/* 섹션 제목 */}
      {items.length > 0 ? ( // 아이템 있으면 map
        items.map((item) => (
          <div
            key={item.id} // key 필수
            className="p-2 border-b cursor-pointer hover:bg-gray-50 transition text-sm" // 스타일
            onClick={() => onClick(item)} // 클릭 이벤트
          >
            {renderItem(item)} {/* 개별 아이템 렌더 */}
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-xs">{emptyText}</p> // 아이템 없으면 빈 메시지
      )}
    </section>
  );
}

// ===== 메인 컴포넌트 ===== //
export default function ProfilePage() {
  const router = useRouter(); // Next.js 라우터
  const [activeTab, setActiveTab] = useState<"homeReview" | "posts" | "chat">("homeReview"); // 탭 상태
  const [homeReviewMode, setHomeReviewMode] = useState<"home" | "review">("home"); // 홈 탭 모드
  const [nickname, setNickname] = useState("(알수없음)"); // 유저 닉네임
  const [myPosts, setMyPosts] = useState<Post[]>([]); // 내가 쓴 게시글
  const [myComments, setMyComments] = useState<Comment[]>([]); // 내가 쓴 댓글
  const [myChats, setMyChats] = useState<ChatRoom[]>([]); // 내가 참여한 채팅방
  const [myReviews, setMyReviews] = useState<RestaurantReview[]>([]); // 내가 쓴 리뷰

  const fetchProfileData = useCallback(async () => { // 데이터 로딩 함수
    const { data: sessionData } = await supabase.auth.getSession(); // 세션 가져오기
    const session = sessionData.session; // 세션 데이터
    if (!session) return router.push("/login"); // 로그인 안 됐으면 로그인 페이지로 이동

    const userId = session.user.id; // 유저 ID

    // ===== 닉네임 가져오기 ===== //
    const { data: profileData } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .single();
    if (profileData) setNickname(profileData.nickname); // 닉네임 저장

    // ===== 내가 쓴 게시글 ===== //
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, title, content, created_at, image_urls")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const postsWithImages = (postsData ?? []).map(p => ({ // image_urls 파싱
      ...p,
      image_urls: Array.isArray(p.image_urls) ? p.image_urls : JSON.parse(p.image_urls ?? "[]")
    }));

    setMyPosts(postsWithImages); // 상태 저장

    // ===== 내가 쓴 댓글 ===== //
    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, posts(title, content, image_urls)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const { data: imageCommentsData } = await supabase
      .from("image_comments")
      .select("id, post_id, content, created_at, posts(title, content, image_urls)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const combinedComments: Comment[] = [
      ...(commentsData ?? []).map((c: any) => ({
        id: c.id,
        post_id: c.post_id,
        content: c.content,
        created_at: c.created_at,
        post_title: c.posts?.title ?? "(제목 없음)",
        post_content: c.posts?.content,
        post_images: c.posts?.image_urls,
        isImageComment: false,
      })),
      ...(imageCommentsData ?? []).map((c: any) => ({
        id: c.id,
        post_id: c.post_id,
        content: c.content,
        created_at: c.created_at,
        post_title: c.posts?.title ?? "(제목 없음)",
        post_content: c.posts?.content,
        post_images: c.posts?.image_urls,
        isImageComment: true,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // 최신순 정렬

    setMyComments(combinedComments); // 댓글 상태 저장

    // ===== 채팅방 ===== //
    const { data: myMessageRooms } = await supabase
      .from("messages")
      .select("room_id")
      .eq("user_id", userId);

    const roomIds = [...new Set(myMessageRooms?.map((m) => m.room_id) ?? [])]; // 중복 제거

    if (roomIds.length > 0) {
      const { data: chatData } = await supabase
        .from("chat_rooms")
        .select("id, room_name, created_at, creator_id")
        .in("id", roomIds)
        .order("created_at", { ascending: false });
      setMyChats(chatData ?? []); // 채팅방 상태 저장
    } else setMyChats([]); // 없으면 빈 배열

    // ===== 레스토랑 리뷰 ===== //
    const { data: reviewData, error } = await supabase
      .from("restaurant_review")
      .select("id, restaurant_id, review, created_at, nickname, menu, tags, restaurant:restaurant_id (restaurant_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
      if (error) {
        console.error("리뷰 불러오기 에러:", error);
        setMyReviews([]); // 에러 시 빈 배열
      } else {
        // 
        setMyReviews((reviewData as any[]) ?? []);
      }
  }, [router]);

  useEffect(() => {
    fetchProfileData(); // 컴포넌트 마운트 시 데이터 로드
  }, [fetchProfileData]);

  // ===== 탭 콘텐츠 ===== //
  const tabContents: Record<string, React.ReactNode> = {
    homeReview: ( // 홈 탭
      <div>
        <div className="flex gap-2 mb-3"> {/* 홈/리뷰 모드 스위치 */}
          <button
            className={`px-3 py-1 rounded-full text-xs ${homeReviewMode === "home" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setHomeReviewMode("home")}
          >
            댓글
          </button>
          <button
            className={`px-3 py-1 rounded-full text-xs ${homeReviewMode === "review" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setHomeReviewMode("review")}
          >
            리뷰
          </button>
        </div>

        {homeReviewMode === "home" ? ( // 댓글 모드
          <ListSection
            title="📝 내가 쓴 댓글"
            items={myComments}
            onClick={(c) => router.push(`/posts/${c.post_id}`)}
            emptyText="댓글이 없습니다."
            renderItem={(c) => (
              <>
                <p className="font-semibold text-sm text-gray-900">{c.post_title}{c.isImageComment}</p>
                {c.post_content && <p className="text-black text-sm break-words line-clamp-3">{c.post_content}</p>}
                {(c.post_images?.length ?? 0) > 0 && (
                  <div className="flex gap-1 mt-1 overflow-x-auto flex-nowrap no-scrollbar">
                    {c.post_images!.map((url, idx) => (
                      <img key={idx} src={url} alt="post image" className="w-50 h-50 object-cover rounded flex-shrink-0"/>
                    ))}
                  </div>
                )}
                <p className="text-black text-sm break-words mt-1">{c.content}</p>
              </>
            )}
          />
        ) : ( // 리뷰 모드
          <ListSection
            title="🍴 내가 쓴 레스토랑 리뷰"
            items={myReviews}
            onClick={(r) => router.push(`/restaurants/${r.restaurant_id}`)}
            emptyText="작성한 리뷰 없습니다"
            renderItem={(r) => (
              <>
                <p className="font-semibold text-sm text-gray-900">
                {r.restaurant?.restaurant_name ?? "(이름 없음)"} {/* 식당 이름 */}
                </p>
                <p className="font-normal text-sm text-gray-900">{r.review}</p>
                <p className="text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
              </>
            )}
          />
        )}
      </div>
    ),
    posts: ( // 게시글 탭
      <ListSection
        title="📝 내가 쓴 게시글"
        items={myPosts}
        onClick={(p) => router.push(`/posts/${p.id}`)}
        emptyText="게시글 없습니다"
        renderItem={(p) => (
          <>
            <p className="font-semibold text-sm text-gray-900">{p.title}</p>
            {p.content && <p className="text-black text-sm break-words line-clamp-3">{p.content}</p>}
            {(p.image_urls?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {p.image_urls!.map((url, idx) => (
                  <img key={idx} src={url} alt="post image" className="w-50 h-50 object-cover rounded"/>
                ))}
              </div>
            )}
            <p className="text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
          </>
        )}
      />
    ),
    chat: ( // 채팅방 탭
      <ListSection
        title="💬 내가 참여한 채팅방"
        items={myChats}
        onClick={(c) => router.push(`/chat/${c.id}`)}
        emptyText="채팅방 없습니다"
        renderItem={(c) => (
          <>
            <p className="font-semibold text-sm text-gray-900">{c.room_name}</p>
            <p className="text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</p>
          </>
        )}
      />
    ),
  };

  return (
    <div className="w-full max-w-[540px] mx-auto flex flex-col h-[calc(100vh-128px)]"> {/* 메인 컨테이너 */}
      <HeaderWithBack title={``} backTF={true} /> {/* 뒤로가기 헤더 */}
      <section className="bg-blue-100 p-10 text-center"> {/* 프로필 영역 */}
        <div className="flex justify-center gap-2 text-xl">
          {["😀", "🐮", "🐱", "🐸", "🐻"].map((emoji) => ( // 이모지 나열
            <span key={emoji}>{emoji}</span>
          ))}
        </div>
      </section>

      <section className="p-4"> {/* 닉네임 표시 */}
        <div className="text-left">
          <h2 className="font-bold text-lg">{nickname}</h2>
        </div>
      </section>

      <nav className="flex border-b text-sm"> {/* 탭 네비게이션 */}
        {[
          { key: "homeReview", label: "홈" },
          { key: "posts", label: "게시글" },
          { key: "chat", label: "채팅방" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`flex-1 py-3 text-center font-medium border-b ${
              activeTab === tab.key
                ? "border-b-2 border-blue-500 text-blue-500 font-bold"
                : "border-gray-500 text-gray-500"
            } transition-colors duration-200`}
            onClick={() => setActiveTab(tab.key as any)} // 탭 전환
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-3 flex-1 overflow-auto">{tabContents[activeTab]}</main> {/* 탭 콘텐츠 렌더 */}
    </div>
  );
}