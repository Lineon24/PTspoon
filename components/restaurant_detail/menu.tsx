"use client"

import React from "react"
import { useParams } from "next/navigation"
import { useState,useEffect } from "react"
import { supabase } from "@/lib/supabaseClient";
//너는 레스토랑 메뉴
interface Restaurant_menu{
    id:string;
    menu:string;
    price:string;
}
//너는 레스토랑 id받아오는 새끼
interface Restaurant{
    restaurantId:string;
}
interface description{
  dummy_menu_description:"이건 더미 메뉴 설명임";
}

//지금부터 컴포넌트 시작

export default function Menu_list({restaurantId}:Restaurant){
    //메뉴 정보 및 로딩 상태
    const [menu,setmenu]=useState<Restaurant_menu[]|null>(null);
    const [loading,setLoading]=useState(true);

    //컴포넌트 마운트 시 레스토랑 id로 supabase로 해당 식당 정보를 받아옴
    useEffect(()=>{
        const fetchRestaurant=async()=>{
            setLoading(true) //로딩 시작

            const{data,error}=await supabase
            .from('menu') //menu 테이블에서
            .select('id,menu,price') //값을 찾기
            .eq('restaurant_id',restaurantId) //물론 레스토랑 id가 일치할때만
        if (error){
            console.error('메뉴 조회 실패',error) //만약 에러나면 콘솔에 로그 남기고
            setmenu(null) //null로 설정
        }
        else{
            //성공시 데이터 저장 아니 이 친구 맨날 형식이 안 맞는다고함 미치겠네
            //자 잠시 소란이 있었어요
            setmenu(data) 
        }
        setLoading(false) //로딩 끝
        };
        if(restaurantId){
            fetchRestaurant(); //레스토랑 id 있으면 fetch 실행
        }
    },[restaurantId]);
    //로딩 중이면
    if(loading){
        return <div className="p-4 text-gray-500">로딩 중...</div>;
    }
    //데이터가 씹히면
    if(!menu){
        return <div className="p-4 text-red-500">메뉴 정보를 불러올 수 없습니다.</div>;
    }
    //메뉴의 스타일인 초기에 v0로 만든 스타일 코드를 대다수 참고함
    return(
      <div className="mb-6">
        <h2 className="test-2x1 font-bold mb-4">메뉴</h2>
        <div className="grid gap-3">
          {menu.map((item:any, index:number)=> (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">{item.menu}</span>
              <div className="text-xs text-gray-500">이건 더미 메뉴 설명임</div>
              <span className="test-blue-600 font-bold">{item.price.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      </div>
    );
}

