//레스토랑 정보 (연락처,이름,주소) 컴포넌트
"use clinet"
import {supabase} from "@/lib/supabaseClient";
import React from "react";
import { useEffect,useState } from "react";

//컴포넌트 props 타입: 상위에서 레스토랑id만 넘겨 받음
interface RestaurantInfoProps{
    restaurantId:string;
}

//supabase에서 받아올 데이터의 타입 정의
interface Restaurant{
    restaurant_name:string;
    phone:string;
    address:string;
}

//아니 시발 레스토랑 영타 왜 이 힘드냐 진짜
//레스토랑 정보 표시용 컴포넌트
export default function RestaurantInfo({restaurantId}:RestaurantInfoProps){
    //식당 정보와 로딩 상태
    const [restaurant,setRestaurant]=useState<Restaurant|null>(null);
    const [loading,setLoading]=useState(true);

    //컴포넌트 마운트 시, 레스토랑 id로 supabase에서 해당 식당 정보 fetch
    useEffect(() => {
        const fetchRestaurant= async() =>{
            setLoading(true) //로딩 시작

            const{data,error}=await supabase
            .from('restaurant') //테이블 이름
            .select('restaurant_name,phone,address') //필요한 정보만 가져오기
            .eq('restaurant_id',restaurantId) //id가 일치할때만
            .single(); //하나만 가져옴
        if (error){
            console.error('레스토랑 조회 실패',error) //오류 뜨면 콘솔에 로그 남기기
            setRestaurant(null) //에러시 null로 설정
        }
        else{
            setRestaurant(data) //성공시 데이터 저장
        }
        setLoading(false) //로딩 끝
        };
        if (restaurantId){
            fetchRestaurant(); //레스토랑 id가 있으면 fetch 실행
        }
    },[restaurantId]);
    //로딩 중
    if(loading){
        return <div className="p-4 text-gray-500">로딩 중...</div>;
    }

    //데이터 조회 실패
    if(!restaurant){
        return <div className="p-4 text-red-500">레스토랑 정보를 불러올 수 없습니다.</div>;
    }

    //정상적으로 데이터 받아오면 출력
    return(
        <div className="p-4 bg-white rounded-md shadow-md space-y-3">
            {/*식당이름*/}
            <h1 className="text-2xl font-bold">{restaurant.restaurant_name}</h1>
            {/*연락처와 주소*/}
            {/*역시 위대하신 chatgpt야 이거 실제 전화로 연결됨*/}
            <p>
                📞{' '};
                 <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:underline">
                    {restaurant.phone}
                 </a>
            </p>
            <p>
                📍{' '}
                <a
                     href={`https://map.kakao.com/link/search/${encodeURIComponent(restaurant.address)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-green-600 hover:underline"
                     >
                        {restaurant.address}
                </a>
            </p>
        </div>
    );
}


