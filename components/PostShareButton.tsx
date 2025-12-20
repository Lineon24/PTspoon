'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
//공유 아이콘
import { Share2 } from 'lucide-react';

//UI 컴포넌트
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
// 채팅방 목록 필터 모드
// -mine : 내가 참여한 방
// -all : 전체 방
type ViewMode = 'all' | 'mine';

//채팅방 타입

interface ChatRoom{
    id: string;
    room_name:string;
    created_at:string;
    creator_id:string;
    room_image?:string;
    room_description?:string;
}

//PostShareButton 컴포넌트

interface PostShareButtonProps{
    postId:string; //공유할 게시글 ID
    postTitle?:string; //게시글 제목 
    postUrl?:string; //게시글 URL
}

export default function PostShareButton({postId, postTitle, postUrl}:PostShareButtonProps){
    const [open , setOpen]= useState(false) //시트 열림/닫힘
    const [viewMode,setViewMode]=useState<ViewMode>('mine'); //탭 상태
    const [rooms, setRooms]=useState<ChatRoom[]>([]); //전체 채팅방 목록
    const [myRoomIds,setMyRoomIds]=useState<string[]>([]); //내가 참여한 방 ID
    const [loadingRooms, setLoadingRooms]= useState(false); //채팅방 로딩 상태
    const [sendingRoomId, setSendingRoomId]= useState<string | null> (null) //전송 중 방

    //postUrl이 전달되면 그대로 사용, 없으면 현재 origin 기준으로 /post/{id} 생성
    const finalPostUrl= useMemo(()=>{
        if (postUrl) return postUrl;
        if (typeof window==='undefined') return `/posts/${postId}`;
        return `${window.location.origin}/posts/${postId}`;
    },[postId,postUrl]);

    /*============================
     * Sheet 열릴 때 채팅방 불러오기
     *============================*/

    useEffect(()=>{
        if (!open) return; //Sheet가 닫혀 있으면 실행 안함

        const loadRooms = async () => {
            setLoadingRooms(true);

            try{
                //현재 로그인 유저 가져오기
                const {data : userData, error:userError}= await supabase.auth.getUser();
                if (userError || !userData?.user) return;

                //전체 채팅방 조회
                const {data:roomsData, error:roomsError}= await supabase
                .from('chat_rooms')
                .select('*')
                .order('created_at', { ascending:false});

                if (!roomsError && roomsData){
                    setRooms(roomsData as ChatRoom[]);
                }
                else{
                    setRooms([]);
                }
                // 내가 메시지를 보낸 적 있는 방 조회
                const {data:myMessages} = await supabase
                .from('messages')
                .select('room_id')
                .eq('user_id',userData.user.id);

                //중복 제거
                const uniqueRoomIds = Array.from(
                    new Set((myMessages || []).map((m:any)=> m.room_id))
                );
                setMyRoomIds(uniqueRoomIds);
            }
            finally{
                setLoadingRooms(false);
            }
        };
        loadRooms();
    },[open]);
    /*============================
     * 탭에 따른 필터링(mine/all)
     *============================*/
    const visiableRooms = useMemo(()=>{
        //전체 보기
        if (viewMode==='all') return rooms;
        //참여한 방만 보기
        return rooms.filter((room)=> myRoomIds.includes(room.id));
    },[rooms,myRoomIds,viewMode]);
    /*============================
     * 특정 채팅방에 게시글 공유
     *============================*/
    const handleShareToRoom= async (roomId:string)=>{
        //이미 전송 중이면 중복 방지
        if (sendingRoomId) return;

        setSendingRoomId(roomId);

        try{
            //로그인 체크
            const {data:userData}=await supabase.auth.getUser();
            if (!userData?.user){
                alert('로그인이 필요합니다.');
                return;
            }
            //채팅에 남길 메시지 포맷
            const message= `게시글을 공유했습니다!\n` + `${postTitle ? `제목: ${postTitle}\n`: ''}` + `${finalPostUrl}`;

            //messages 테이블에 메시지 insert
            const {error} = await supabase.from('messages').insert({
                room_id : roomId,
                user_id : userData.user.id,
                content: message,
            });
            if (error) {
                console.error(error);
                alert("공유 중 오류가 발생했습니다. 관리자에게 신고 바랍니다.");
                return;
            }
            alert('게시글을 공유했습니다!');
            setOpen(false); //Sheet 닫기
        }
        finally{
            setSendingRoomId(null);
        }
    };
    //UI
    return(
        <Sheet open={open} onOpenChange={setOpen}>
            {/*공유 아이콘 버튼*/}
            <SheetTrigger asChild>
                <Button variant={"ghost"} size={"icon"} aria-label='게시글 공유' className='h-11 w-11 rounded-full'>
                    <Share2 className='h-11 w-11'/>
                </Button>
            </SheetTrigger>
            {/*바텀/사이드 시트*/}
            <SheetContent className='w-full sm:max-w-[540px]'>
                <SheetHeader>
                    <SheetTitle>채팅방에 공유하기</SheetTitle>
                </SheetHeader>
            {/*탭 버튼*/}
            <div className='mt-4 flex gap-2'>
                <Button 
                variant={viewMode ==='mine'? 'default' : 'secondary'}
                onClick={()=>setViewMode('mine')}
                >
                    참여한 방
                </Button>
                <Button 
                variant={viewMode ==='all'? 'default' : 'secondary'}
                onClick={()=>setViewMode('all')}>
                    전체 채팅방
                </Button>
            </div>
            {/*채팅방 리스트*/}
            <div className='mt-4 space-y-2'>
                {loadingRooms && (
                    <div className='text-sm text-gray-500'>채팅방 불러오는 중</div>
                )}
                {!loadingRooms && visiableRooms.length===0 && (
                    <div className='text-sm text-gray-500'>표시할 채팅방이 없습니다.</div>
                )}
            {visiableRooms.map((room) => (
                <button
                key={room.id}
                onClick={() => handleShareToRoom(room.id)}
                className="w-full rounded-lg border p-3 hover:bg-gray-50
                             flex items-center justify-between text-left"
                >
                <div className="min-w-0">
                    <div className="font-semibold truncate">
                    {room.room_name}
                    </div>
                    {room.room_description && (
                    <div className="text-xs text-gray-500 truncate">
                        {room.room_description}
                    </div>
                    )}
                </div>

                <div className="text-xs text-gray-500">
                    {sendingRoomId === room.id ? '전송중...' : '공유'}
                </div>
                </button>
            ))}
            </div>
            </SheetContent>
        </Sheet>
    )
}