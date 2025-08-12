'use client' 
//원래는 그냥 페이지에 버튼을 추가할려고 했는데
//로그인이 안되있으면 로그인 창으로 리다이렉트 되게 만들려고
//컴포넌트를 따로 만듬
//시발 원래는 딸깍이면 되는데...
import {Button} from "@/components/ui/button"
import { useEffect,useState } from "react";
import { supabase } from "@/lib/supabaseClient"
import {useRouter} from "next/navigation"
import Review_write from "./Review_write";
//사용자 프로필 정보
interface Profile{
    id:string
    nickname:string;
}

interface logininfo{
    profile:Profile|null //현재 로그인된 사용자 프로필 (리뷰 쓰기 권한 확인)
    retaurant_id:string;
}

 
export default function IsLogin({profile,retaurant_id}:logininfo){
    const router=useRouter();
    const [user,setUser]=useState<any>(null)
    //사용자 로그인 및 프로필 불러오기
    useEffect(()=>{
        async function getUserProfile(){
            const{data:userData,error:userError}=await supabase.auth.getUser();

            if(userError || !userData?.user){
                console.error('사용자 정보 가져오기 오류',userError);
                setUser(null)
                return;
            }
            setUser(userData);
        }
        getUserProfile();
    },[profile]);
    //로그인 확인 함수
    const handleUser=async()=>{
        if(!user){
            alert('로그인이 필요합니다.');
            router.push("/login");
            return;
        }
        else{
            router.push(`/restaurants/${retaurant_id}/review_write`);
            return;
        }
    }
    return(
        <Button 
          className= "w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-300 transition-colors"
          onClick={handleUser}
        >
          <span className="flex items-center justify-center">
            리뷰 쓰기 페이지로
          </span>
        </Button>
    )
}