'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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

interface RestaurantShareButtonProps {
  restaurantName: string;
}
export default function RestaurantShareButton({ restaurantName }: RestaurantShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<string[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [sendingRoomId, setSendingRoomId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 시트가 열릴 때 채팅방 목록 로드
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

  // 공유 실행 (핵심: #식당이름 포맷으로 메시지 전송)
  const handleShareToRoom = async (roomId: string) => {
    if (sendingRoomId) return;
    setSendingRoomId(roomId);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 채팅방 로직에서 인식할 수 있도록 #을 붙여서 전송
      const message = `#${restaurantName}`;

      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        user_id: userData.user.id,
        content: message,
      });

      if (error) throw error;
      alert(`${restaurantName} 정보를 공유했습니다!`);
      setOpen(false);
    } catch (err) {
      alert("공유 중 오류가 발생했습니다.");
    } finally {
      setSendingRoomId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* 게시글 공유 버튼과 동일한 디자인 */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors border border-gray-100"
        >
          <Share2 className="h-8 w-8" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-[540px] bg-[#f6faff] border-l-0 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-center font-bold text-lg">채팅방에 식당 공유</SheetTitle>
        </SheetHeader>

        {/* 탭 디자인 */}
        <div className="mt-6 flex justify-center gap-2">
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

        {/* 채팅방 리스트 (카드 디자인) */}
        <div className="mt-6 space-y-2.5 pb-10">
          {loadingRooms && <div className="text-center py-10 text-sm text-gray-500">목록 로드 중...</div>}
          {visibleRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleShareToRoom(room.id)}
              disabled={!!sendingRoomId}
              className={`relative w-full p-3 border border-[#ddd] rounded-[10px] flex items-center gap-3 text-left transition-colors group ${
                currentUserId === room.creator_id ? 'bg-[#eafff8]' : 'bg-white'
              } hover:bg-[#f0f0f0]`}
            >
              <img
                src={room.room_image || DEFAULT_ROOM_IMAGE_URL}
                alt="room"
                className="w-[44px] h-[44px] rounded-[8px] object-cover border border-[#ddd] flex-shrink-0"
              />
              <div className="flex-grow min-w-0 pr-12">
                <div className="font-bold text-[15px] text-[#333] truncate">{room.room_name}</div>
                {room.room_description && (
                  <div className="text-[12px] text-[#777] mt-0.5 truncate">{room.room_description}</div>
                )}
              </div>
              <div className="absolute right-3 bottom-2 text-[11px] text-[#999] group-hover:text-blue-500">
                {sendingRoomId === room.id ? '전송중...' : '식당 정보 공유'}
              </div>
            </button>
          ))}
          <div className="mt-4 px-1 py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <p className="text-[12px] text-gray-500 text-center leading-relaxed">
              💡 채팅방 안에서 <span className="font-bold text-blue-600">#식당이름</span>을 입력하면<br />
              더 빠르게 식당 정보를 공유할 수 있어요!
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}