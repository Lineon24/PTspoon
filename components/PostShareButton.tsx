'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Share2 } from 'lucide-react';

// UI 컴포넌트
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// 채팅방 기본 이미지 (ChatRoomListPage와 동일하게 설정)
const DEFAULT_ROOM_IMAGE_URL = '/image/logo_bg.jpg';

type ViewMode = 'all' | 'mine';

interface ChatRoom {
  id: string;
  room_name: string;
  created_at: string;
  creator_id: string;
  room_image?: string;
  room_description?: string;
}

interface PostShareButtonProps {
  postId: string;
  postTitle?: string;
  postUrl?: string;
}

export default function PostShareButton({ postId, postTitle, postUrl }: PostShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<string[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [sendingRoomId, setSendingRoomId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const finalPostUrl = useMemo(() => {
    if (postUrl) return postUrl;
    if (typeof window === 'undefined') return `/posts/${postId}`;
    return `${window.location.origin}/posts/${postId}`;
  }, [postId, postUrl]);

  /*============================
   * Sheet 열릴 때 데이터 로드
   *============================*/
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoadingRooms(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) setCurrentUserId(userData.user.id);

        const { data: roomsData } = await supabase
          .from('chat_rooms')
          .select('*')
          .order('created_at', { ascending: false });

        setRooms((roomsData as ChatRoom[]) || []);

        if (userData?.user) {
          const { data: myMsgs } = await supabase
            .from('messages')
            .select('room_id')
            .eq('user_id', userData.user.id);

          const ids = Array.from(new Set((myMsgs || []).map((msg: any) => msg.room_id)));
          setMyRoomIds(ids);
        }
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchData();
  }, [open]);

  const visibleRooms = useMemo(() => {
    if (viewMode === 'all') return rooms;
    return rooms.filter((room) => myRoomIds.includes(room.id));
  }, [rooms, myRoomIds, viewMode]);

  const handleShareToRoom = async (roomId: string) => {
    if (sendingRoomId) return;
    setSendingRoomId(roomId);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        alert('로그인이 필요합니다.');
        return;
      }
      const message = `게시글을 공유했습니다!\n${postTitle ? `제목: ${postTitle}\n` : ''}${finalPostUrl}`;

      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        user_id: userData.user.id,
        content: message,
      });

      if (error) throw error;
      alert('게시글을 공유했습니다!');
      setOpen(false);
    } catch (err) {
      alert("공유 중 오류가 발생했습니다.");
    } finally {
      setSendingRoomId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* 1. 트리거 버튼: 요청하신 블루 호버 효과와 mt-1 적용 */}
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          aria-label='게시글 공유' 
          className='h-12 w-12 mt-1 rounded-full hover:text-blue-600 hover:bg-blue-50 transition-colors'
        >
          <Share2 className='h-9 w-9'/>
        </Button>
      </SheetTrigger>

      {/* 2. 시트 내부: ChatRoomListPage의 배경색(#f6faff) 적용 */}
      <SheetContent className='w-full sm:max-w-[540px] bg-[#f6faff] border-l-0 overflow-y-auto'>
        <SheetHeader>
          <SheetTitle className="text-center font-bold text-lg">채팅방에 공유하기</SheetTitle>
        </SheetHeader>

        {/* 3. 탭 버튼 디자인: 둥근 알약 형태(#3478ff)로 통일 */}
        <div className='mt-6 flex justify-center gap-2'>
          <button
            onClick={() => setViewMode('mine')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'mine' ? 'bg-[#3478ff] text-white shadow-sm' : 'bg-[#eee] text-[#333]'
            }`}
          >
            참여한 방
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              viewMode === 'all' ? 'bg-[#3478ff] text-white shadow-sm' : 'bg-[#eee] text-[#333]'
            }`}
          >
            전체 채팅방
          </button>
        </div>

        {/* 4. 채팅방 리스트: 카드 디자인(보더, 둥근 모서리, 배경색 로직) 적용 */}
        <div className='mt-6 space-y-2.5 pb-10'>
          {loadingRooms && (
            <div className='text-center py-10 text-sm text-gray-500'>목록을 불러오는 중...</div>
          )}
          
          {!loadingRooms && visibleRooms.length === 0 && (
            <div className='text-center py-10 text-sm text-gray-500'>표시할 채팅방이 없습니다.</div>
          )}

          {visibleRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleShareToRoom(room.id)}
              disabled={!!sendingRoomId}
              className={`relative w-full p-3 border border-[#ddd] rounded-[10px] flex items-center gap-3 text-left transition-colors group ${
                currentUserId === room.creator_id ? 'bg-[#eafff8]' : 'bg-white'
              } hover:bg-[#f0f0f0]`}
            >
              {/* 채팅방 썸네일 (44x44, 8px 라운드) */}
              <img
                src={room.room_image || DEFAULT_ROOM_IMAGE_URL}
                alt="room"
                className="w-[44px] h-[44px] rounded-[8px] object-cover border border-[#ddd] flex-shrink-0"
              />

              {/* 텍스트 정보 */}
              <div className="flex-grow min-w-0 pr-12">
                <div className="font-bold text-[15px] text-[#333] truncate">
                  {room.room_name}
                </div>
                {room.room_description && (
                  <div className="text-[12px] text-[#777] mt-0.5 truncate leading-tight">
                    {room.room_description}
                  </div>
                )}
              </div>

              {/* 오른쪽 하단 상태 표시 (클릭 유도 문구) */}
              <div className="absolute right-3 bottom-2 text-[11px] text-[#999] group-hover:text-blue-500 transition-colors">
                {sendingRoomId === room.id ? '전송중...' : '공유하기'}
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}