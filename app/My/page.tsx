"use client"; // Next.js App Router에서 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect, useCallback } from "react"; // React 훅 임포트
import { supabase } from "@/lib/supabaseClient"; // Supabase 클라이언트 임포트
import { useRouter } from "next/navigation"; // Next.js 라우터 훅
import HeaderWithBack from "@/components/HeaderWithBack"; // 뒤로가기 헤더 컴포넌트

// ===== 타입 정의 ===== //
interface Post { // 게시글 타입 정의
  id: string; // 게시글 ID
  title: string; // 게시글 제목
  content?: string; // 게시글 내용 (선택)
  created_at: string; // 생성일
  image_urls?: string[]; // 이미지 배열 (선택)
}

interface Comment { // 댓글 타입 정의
  id: string; // 댓글 ID
  post_id: string; // 소속 게시글 ID
  content: string; // 댓글 내용
  created_at: string; // 작성일
  post_title: string; // 댓글 달린 게시글 제목
  post_content?: string; // 댓글 달린 게시글 내용 (선택)
  post_images?: string[]; // 댓글 달린 게시글 이미지 (선택)
  isImageComment?: boolean; // 이미지 댓글 여부 (선택)
}

interface ChatRoom { // 채팅방 타입 정의
  id: string; // 채팅방 ID
  room_name: string; // 채팅방 이름
  created_at: string; // 생성일
  creator_id: string; // 생성자 ID
}

interface RestaurantReview { // 레스토랑 리뷰 타입 정의
  id: string; // 리뷰 ID
  restaurant_id: string; // 레스토랑 ID
  review: string; // 리뷰 내용
  created_at: string; // 작성일
  nickname: string; // 작성자 닉네임
  menu: string | null; // 메뉴명 (선택)
  tags: string[] | null; // 태그 배열 (선택)
  restaurant?: { // 레스토랑 정보 (선택)
    restaurant_name: string; // 레스토랑 이름
    address?: string; // 주소 (선택)
    phone?: string; // 전화번호 (선택)
    image_url?: string; // 이미지 URL (선택)
  };
}

// ===== 공통 리스트 컴포넌트 ===== //
interface ListSectionProps<T> { // 제네릭 리스트 컴포넌트 Props 정의
  title: string; // 리스트 제목
  items: T[]; // 렌더링할 아이템 배열
  onClick: (item: T) => void; // 아이템 클릭 이벤트
  emptyText: string; // 아이템 없을 때 표시 텍스트
  renderItem: (item: T) => React.ReactNode; // 각 아이템 렌더링 함수
}

function ListSection<T extends { id: string | number }>({ // 제네릭 리스트 컴포넌트
  title,
  items,
  onClick,
  emptyText,
  renderItem,
}: ListSectionProps<T>) {
  return (
    <section className="mb-4"> {/* 섹션 전체 컨테이너 */}
      {title && <h3 className="font-bold mb-1 text-l mb-3">{title}</h3>} {/* 제목 렌더링 */}
      {items.length > 0 ? (
        items.map((item) => ( // 아이템 존재 시 map 돌려서 렌더링
          <div
            key={item.id} // key 필수
            className="p-2 border-b cursor-pointer hover:bg-gray-50 transition text-sm" // 스타일
            onClick={() => onClick(item)} // 클릭 시 콜백 호출
          >
            {renderItem(item)} {/* 각 아이템 렌더링 */}
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-xs">{emptyText}</p> // 아이템 없을 때 텍스트
      )}
    </section>
  );
}

// ===== 메인 컴포넌트 ===== //
export default function ProfilePage() {
  const router = useRouter(); // 라우터 훅
  const [activeTab, setActiveTab] = useState<"homeReview" | "posts" | "chat">("homeReview"); // 현재 탭 상태
  const [commentMode, setCommentMode] = useState<"text" | "image" | "review">("text"); // 댓글/리뷰 모드 상태
  const [nickname, setNickname] = useState("(알수없음)"); // 닉네임 상태
  const [myPosts, setMyPosts] = useState<Post[]>([]); // 내가 쓴 게시글
  const [myComments, setMyComments] = useState<Comment[]>([]); // 내가 쓴 댓글
  const [myChats, setMyChats] = useState<ChatRoom[]>([]); // 내가 참여한 채팅방
  const [myReviews, setMyReviews] = useState<RestaurantReview[]>([]); // 내가 쓴 리뷰
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({}); // 댓글 확장 상태
  const COMMENTS_PREVIEW_COUNT = 3; // 댓글 미리보기 수

  const fetchProfileData = useCallback(async () => { // 프로필 데이터 가져오는 함수
    const { data: sessionData } = await supabase.auth.getSession(); // 세션 정보 가져오기
    const session = sessionData.session; // 실제 세션
    if (!session) return router.push("/login"); // 세션 없으면 로그인 페이지로

    const userId = session.user.id; // 현재 사용자 ID

    // 닉네임 가져오기
    const { data: profileData } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .single();
    if (profileData) setNickname(profileData.nickname); // 상태 업데이트

    // 게시글 가져오기
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, title, content, created_at, image_urls")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const postsWithImages = (postsData ?? []).map((p) => ({ // image_urls가 문자열이면 배열로 변환
      ...p,
      image_urls: Array.isArray(p.image_urls) ? p.image_urls : JSON.parse(p.image_urls ?? "[]"),
    }));
    setMyPosts(postsWithImages); // 상태 업데이트

    // 일반 댓글 가져오기
    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, posts(title, content, image_urls)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // 이미지 댓글 가져오기
    const { data: imageCommentsData } = await supabase
      .from("image_comments")
      .select("id, post_id, content, created_at, posts(title, content, image_urls)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // 댓글 합치기 & 정렬
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
    setMyComments(combinedComments); // 상태 업데이트

    // 채팅방 가져오기
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
      setMyChats(chatData ?? []); // 상태 업데이트
    } else setMyChats([]); // 없으면 빈 배열

    // 레스토랑 리뷰 가져오기
    const { data: reviewData, error } = await supabase
      .from("restaurant_review")
      .select(
        "id, restaurant_id, review, created_at, nickname, menu, tags, restaurant:restaurant_id (restaurant_name)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("리뷰 불러오기 에러:", error); // 에러 로그
      setMyReviews([]); // 빈 배열
    } else setMyReviews((reviewData as any[]) ?? []); // 상태 업데이트
  }, [router]); // router가 바뀔 때만 재생성

  useEffect(() => {
    fetchProfileData(); // 컴포넌트 마운트 시 데이터 가져오기
  }, [fetchProfileData]);

  // 필터링 & 그룹핑
  const filteredComments = myComments.filter((c) =>
    commentMode === "text" ? !c.isImageComment : commentMode === "image" ? c.isImageComment : true
  ); // 선택 모드에 맞게 댓글 필터링
  const groupedComments = filteredComments.reduce((acc: Record<string, Comment[]>, c) => {
    if (!acc[c.post_id]) acc[c.post_id] = []; // 배열 없으면 생성
    acc[c.post_id].push(c); // 댓글 추가
    return acc;
  }, {}); // 게시글 ID별로 그룹핑

  // ===== 탭 콘텐츠 ===== //
  const tabContents: Record<string, React.ReactNode> = { // 탭별 렌더링
    homeReview: ( // 홈 탭
      <div>
        {/* 댓글/리뷰 모드 버튼 */}
        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1 rounded-full text-xs ${commentMode === "text" ? "bg-blue-500 text-white" : "bg-gray-200"}`} 
            onClick={() => setCommentMode("text")}
          >
            일반 댓글
          </button>
          <button
            className={`px-3 py-1 rounded-full text-xs ${commentMode === "image" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setCommentMode("image")}
          >
            이미지 댓글
          </button>
          <button
            className={`px-3 py-1 rounded-full text-xs ${commentMode === "review" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setCommentMode("review")}
          >
            리뷰
          </button>
        </div>

        {/* 댓글/리뷰 타이틀 */}
        {commentMode === "text" && <h3 className="font-bold text-base mb-2">📝 내가 쓴 일반 댓글</h3>}
        {commentMode === "image" && <h3 className="font-bold text-base mb-2">📝 내가 쓴 이미지 댓글</h3>}
        {commentMode === "review" && <h3 className="font-bold text-base mb-2">📝 내가 쓴 레스토랑 리뷰</h3>}

        {commentMode === "review" ? ( // 리뷰 모드일 때
          <ListSection
            title=""
            items={myReviews}
            onClick={(r) => router.push(`/restaurants/${r.restaurant_id}`)}
            emptyText="작성한 리뷰 없습니다"
            renderItem={(r) => (
              <>
                <p className="font-semibold text-sm text-gray-900">{r.restaurant?.restaurant_name ?? "(이름 없음)"}</p>
                <p className="text-sm text-gray-900">{r.review}</p>
                <p className="text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
              </>
            )}
          />
        ) : ( // 댓글 모드일 때
          Object.keys(groupedComments).length === 0 ? (
            <p className="text-gray-500 text-xs">작성한 댓글 없습니다</p>
          ) : (
            Object.entries(groupedComments).map(([postId, comments]) => {
              const isExpanded = expandedPosts[postId] ?? false; // 확장 상태
              const showCount = isExpanded ? comments.length : COMMENTS_PREVIEW_COUNT; // 보여줄 댓글 수

              return (
                <div
                  key={postId}
                  className="border-b-2 p-2 mb-2 bg-white cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/posts/${postId}`)}
                >
                  <p className="font-semibold text-sm text-gray-900">{comments[0].post_title}</p>
                  {comments[0].post_content && <p className="text-black text-sm break-words line-clamp-3">{comments[0].post_content}</p>}
                  {(comments[0].post_images?.length ?? 0) > 0 && (
                    <div className="flex gap-2 mt-1 overflow-x-auto flex-nowrap no-scrollbar">
                      {comments[0].post_images!.map((url, idx) => (
                        <img key={idx} src={url} alt="post image" className="w-50 h-50 object-cover rounded" />
                      ))}
                    </div>
                  )}

                  {comments.slice(0, showCount).map((c) => (
                    <p key={c.id} className="text-black text-sm break-words mt-1">- {c.content}</p>
                  ))}

                  {comments.length > COMMENTS_PREVIEW_COUNT && (
                    <p
                      className="text-blue-500 text-xs mt-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
                      }}
                    >
                      {isExpanded ? "댓글 접기" : `댓글 ${comments.length - COMMENTS_PREVIEW_COUNT}개 더보기`}
                    </p>
                  )}
                </div>
              );
            })
          )
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
              <div className="flex flex-wrap gap-2 mt-1">
                {p.image_urls!.map((url, idx) => (
                  <img key={idx} src={url} alt="post image" className="w-50 h-50 object-cover rounded" />
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
    <div className="w-full max-w-[540px] mx-auto flex flex-col h-[calc(100vh-128px)]"> {/* 전체 컨테이너 */}
      <HeaderWithBack title={`내 정보`} backTF={true} /> {/* 헤더 */}
      <section className="bg-blue-100 p-10 text-center"> {/* 이모지 배너 */}
        <div className="flex justify-center gap-2 text-xl">
          {["😀", "🐮", "🐱", "🐸", "🐻"].map((emoji) => (
            <span key={emoji}>{emoji}</span>
          ))}
        </div>
      </section>

      <section className="p-4"> {/* 닉네임 섹션 */}
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
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-3 flex-1 overflow-auto">{tabContents[activeTab]}</main> {/* 탭 콘텐츠 렌더링 */}
    </div>
  );
}