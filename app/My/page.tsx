"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import HeaderWithBack from "@/components/HeaderWithBack";
import Image from "next/image";
import PostList from "@/components/PostList";

const DEFAULT_IMAGE_URL = '/image/logo_bgx.png'; // 프로필 배너용
const DEFAULT_ROOM_IMAGE_URL = '/image/logo_bg.jpg'; // 채팅방 기본 이미지

// 타입 정의
interface Post {
  id: string;
  created_at: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  image_urls: string[];
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  post_title: string;
  post_content?: string;
  post_images?: string[];
  isImageComment?: boolean;
}


interface ChatRoom {
  id: string;
  room_name: string;
  created_at: string;
  creator_id: string;
  room_image?: string;       
  room_description?: string; 
}

interface RestaurantReview {
  id: string;
  restaurant_id: string;
  review: string;
  created_at: string;
  nickname: string;
  menu: string | null;
  tags: string[] | null;
  restaurant?: {
    restaurant_name: string;
    address?: string;
    phone?: string;
    image_url?: string;
  };
}

// 공통 리스트 컴포넌트 (리뷰용) 
interface ListSectionProps<T> {
  title: string;
  items: T[];
  onClick: (item: T) => void;
  emptyText: string;
  renderItem: (item: T) => React.ReactNode;
}

function ListSection<T extends { id: string | number }>({
  title,
  items,
  onClick,
  emptyText,
  renderItem,
}: ListSectionProps<T>) {
  return (
    <section className="mb-4">
      {title && <h3 className="font-bold mb-1 text-l mb-3">{title}</h3>}
      {items.length > 0 ? (
        items.map((item) => (
          <div
            key={item.id}
            className="p-2 border-b cursor-pointer hover:bg-gray-50 transition text-sm"
            onClick={() => onClick(item)}
          >
            {renderItem(item)}
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-xs">{emptyText}</p>
      )}
    </section>
  );
}

// 메인 컴포넌트
export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"homeReview" | "posts" | "chat">("homeReview");
  const [commentMode, setCommentMode] = useState<"text" | "image" | "review">("text");
  
  const [userId, setUserId] = useState<string>(""); 
  const [nickname, setNickname] = useState("(알수없음)");
  
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myComments, setMyComments] = useState<Comment[]>([]);
  const [myChats, setMyChats] = useState<ChatRoom[]>([]);
  const [myReviews, setMyReviews] = useState<RestaurantReview[]>([]);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null); // 채팅방 호버 상태

  const COMMENTS_PREVIEW_COUNT = 3;

  const fetchProfileData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) return router.push("/login");

    const currentUserId = session.user.id;
    setUserId(currentUserId);

    // 1. 닉네임 가져오기
    let currentNickname = "(알수없음)";
    const { data: profileData } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", currentUserId)
      .single();
    
    if (profileData) {
      currentNickname = profileData.nickname;
      setNickname(profileData.nickname);
    }

    // 2. 게시글 가져오기
    const { data: postsData } = await supabase
      .from("posts")
      .select("id, title, content, created_at, image_urls")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    const postsWithDetails: Post[] = (postsData ?? []).map((p) => ({
      id: p.id,
      created_at: p.created_at,
      title: p.title,
      content: p.content ?? "",
      image_urls: Array.isArray(p.image_urls) ? p.image_urls : JSON.parse(p.image_urls ?? "[]"),
      user_id: currentUserId,
      username: currentNickname, 
    }));
    setMyPosts(postsWithDetails);

    // 3. 댓글 데이터 가져오기 
    const { data: commentsData } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, posts(title, content, image_urls)")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    const { data: imageCommentsData } = await supabase
      .from("image_comments")
      .select("id, post_id, content, created_at, posts(title, content, image_urls)")
      .eq("user_id", currentUserId)
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
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setMyComments(combinedComments);

    // 4. 채팅방 가져오기 (참여한 방 + 내가 만든 방)
    // A. 내가 메시지를 보낸 방 ID 조회
    const { data: myMessageRooms } = await supabase
      .from("messages")
      .select("room_id")
      .eq("user_id", currentUserId);
    
    const participatedRoomIds = (myMessageRooms || []).map((m) => m.room_id);

    // B. 내가 참여했거나(OR) 내가 만든(creator_id) 방 조회
    const { data: chatData, error: chatError } = await supabase
      .from("chat_rooms")
      .select("id, room_name, created_at, creator_id, room_image, room_description") 
      .or(`id.in.(${participatedRoomIds.join(',') || '00000000-0000-0000-0000-000000000000'}),creator_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (chatError) {
        console.error("채팅방 로드 실패", chatError);
        setMyChats([]);
    } else {
        // 중복 제거 (Supabase OR 쿼리가 중복을 줄 수도 있으므로 안전장치)
        const uniqueChats = Array.from(new Map((chatData || []).map(item => [item.id, item])).values());
        setMyChats(uniqueChats);
    }

    // 5. 레스토랑 리뷰 가져오기
    const { data: reviewData, error } = await supabase
      .from("restaurant_review")
      .select(
        "id, restaurant_id, review, created_at, nickname, menu, tags, restaurant:restaurant_id (restaurant_name)"
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      setMyReviews([]);
    } else setMyReviews((reviewData as any[]) ?? []);
  }, [router]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handlePostDeleted = (deletedPostId: string) => {
    setMyPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
  };

  // 채팅방 삭제 함수
  const handleDeleteChatRoom = async (roomId: string, creatorId: string) => {
    if (userId !== creatorId) {
      alert('본인이 만든 채팅방만 삭제할 수 있습니다.');
      return;
    }

    if (!window.confirm('정말로 이 채팅방을 삭제하시겠습니까?')) return;

    // 1. 이미지 경로 확인
    const roomToDelete = myChats.find(r => r.id === roomId);
    
    // 2. DB 삭제
    const { error: deleteError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (deleteError) {
      alert('채팅방 삭제 중 오류가 발생했습니다.');
      console.error(deleteError);
      return;
    }

    // 3. 스토리지 이미지 삭제
    if (roomToDelete?.room_image && !roomToDelete.room_image.includes(DEFAULT_ROOM_IMAGE_URL)) {
        try {
          const url = roomToDelete.room_image;
          const parts = url.split('/room-images/');
          if (parts.length > 1) {
            await supabase.storage.from('room-images').remove([parts[1]]);
          }
        } catch (err) {
          console.error('이미지 삭제 오류:', err);
        }
    }

    // 4. 상태 업데이트
    setMyChats((prev) => prev.filter((room) => room.id !== roomId));
    alert('채팅방이 삭제되었습니다.');
  };

  // 필터링 & 그룹핑
  const filteredComments = myComments.filter((c) =>
    commentMode === "text" ? !c.isImageComment : commentMode === "image" ? c.isImageComment : true
  );
  const groupedComments = filteredComments.reduce((acc: Record<string, Comment[]>, c) => {
    if (!acc[c.post_id]) acc[c.post_id] = [];
    acc[c.post_id].push(c);
    return acc;
  }, {});

  // 탭 콘텐츠 
  const tabContents: Record<string, React.ReactNode> = {
    homeReview: (
      <div>
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

        {commentMode === "text" && <h3 className="font-bold text-base mb-2">📝 내가 쓴 일반 댓글</h3>}
        {commentMode === "image" && <h3 className="font-bold text-base mb-2">📝 내가 쓴 이미지 댓글</h3>}
        {commentMode === "review" && <h3 className="font-bold text-base mb-2">📝 내가 쓴 레스토랑 리뷰</h3>}

        {commentMode === "review" ? (
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
        ) : (
            // 댓글 렌더링 부분 
            Object.keys(groupedComments).length === 0 ? (
                <p className="text-gray-500 text-xs">작성한 댓글 없습니다</p>
            ) : (
                Object.entries(groupedComments).map(([postId, comments]) => {
                const isExpanded = expandedPosts[postId] ?? false;
                const showCount = isExpanded ? comments.length : COMMENTS_PREVIEW_COUNT;

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
    posts: (
      <div className="mt-2">
        <h3 className="font-bold text-l mb-3">📝 내가 쓴 게시글</h3>
        {myPosts.length > 0 ? (
          <PostList
            posts={myPosts}
            profile={{ id: userId, nickname: nickname }}
            onPostDeleted={handlePostDeleted}
          />
        ) : (
          <p className="text-gray-500 text-xs">게시글이 없습니다.</p>
        )}
      </div>
    ),
    chat: (
      <div>
        <h3 className="font-bold text-l mb-3">💬 내 채팅방 목록</h3>
        {myChats.length === 0 ? (
            <p className="text-gray-500 text-xs">참여하거나 생성한 채팅방이 없습니다.</p>
        ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {myChats.map((room) => {
                    const isHovered = hoveredRoomId === room.id;
                    return (
                        <li
                            key={room.id}
                            onMouseEnter={() => setHoveredRoomId(room.id)}
                            onMouseLeave={() => setHoveredRoomId(null)}
                            onClick={() => router.push(`/chat/${room.id}`)} // 리스트 클릭 시 이동
                            style={{
                                position: 'relative',
                                padding: 12,
                                border: `1px solid #ddd`,
                                borderRadius: 10,
                                marginBottom: 10,
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 10,
                                backgroundColor: isHovered
                                    ? '#f0f0f0'
                                    : userId === room.creator_id
                                    ? '#eafff8ff'
                                    : 'white',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                            }}
                        >
                            <img
                                src={room.room_image || DEFAULT_ROOM_IMAGE_URL}
                                alt={`${room.room_name} 대표 이미지`}
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 8,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                    border: `1px solid #ddd`,
                                }}
                            />

                            <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: 15, wordBreak: 'break-word', color: '#333' }}>
                                    {room.room_name}
                                </span>
                                {room.room_description && (
                                    <span style={{ fontSize: 12, color: '#777', marginTop: 3, marginBottom: '7px', wordBreak: 'break-word' }}>
                                        {room.room_description}
                                    </span>
                                )}
                            </div>

                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 6,
                                    right: 6,
                                    fontSize: 11,
                                    color: '#999',
                                    userSelect: 'none',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {room.created_at ? new Date(room.created_at).toLocaleDateString() : ''}
                            </div>

                            {userId === room.creator_id && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // 부모 클릭(이동) 방지
                                        handleDeleteChatRoom(room.id, room.creator_id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 6,
                                        right: 6,
                                        backgroundColor: 'transparent',
                                        color: 'gray',
                                        border: '1px solid gray',
                                        padding: '2px 6px',
                                        borderRadius: '50%',
                                        fontSize: 12,
                                        cursor: 'pointer',
                                        lineHeight: 1,
                                        zIndex: 10,
                                    }}
                                    aria-label="삭제"
                                    title="삭제"
                                >
                                    ×
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        )}
      </div>
    ),
  };

  return (
    <div className="w-full max-w-[540px] mx-auto flex flex-col h-screen">
      <HeaderWithBack title={`내 정보`} backTF={true} />
      
      <div className="flex-none">
        <section className="bg-blue-100 p-3 text-center">
          <div className="flex justify-center gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Image
                key={idx}
                src={DEFAULT_IMAGE_URL}
                alt="profile banner"
                width={96}
                height={96}
                className="rounded-lg"
              />
            ))}
          </div>
        </section>

        <section className="p-4">
          <div className="text-left">
            <h2 className="font-bold text-lg">{nickname}</h2>
          </div>
        </section>

        <nav className="flex border-b text-sm bg-white z-10 sticky top-0">
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
      </div>

      <main className="p-3 flex-1 overflow-y-auto">
          {tabContents[activeTab]}
      </main>
    </div>
  );
}