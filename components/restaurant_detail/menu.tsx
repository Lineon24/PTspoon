"use client"

import React from "react"
import { useState,useEffect } from "react"
import { supabase } from "@/lib/supabaseClient";
import { FilterTag } from "@/components/filter-tag";
//너는 레스토랑 메뉴
interface Restaurant_menu{
    id:string;
    menu:string;
    price:string;
    description:string;
}

//너는 레스토랑 id받아오는 새끼
interface RestaurantInfoProps{
    restaurantId:string;
}

interface Restaurant_review {
  id: string;
  restaurant_id: string;
  user_id: string;
  nickname: string;
  review: string;
  menu?:string;
  tags?: string[] | null;      // 맛 태그 배열 (nullable)
  created_at?: string;
}


//지금부터 컴포넌트 시작
export function Menu_list({restaurantId}:RestaurantInfoProps){
    //메뉴 정보 및 로딩 상태
    const [menu,setmenu]=useState<Restaurant_menu[]|null>(null);
    const [loading,setLoading]=useState(true);

    //컴포넌트 마운트 시 레스토랑 id로 supabase로 해당 식당 정보를 받아옴
    useEffect(()=>{
        const fetchRestaurant=async()=>{
            setLoading(true) //로딩 시작

            const{data,error}=await supabase
            .from('menu') //menu 테이블에서
            .select('id,menu,price,description') //값을 찾기
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
        <div className="grid gap-3">
          {menu.map((item:any, index:number)=> (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">{item.menu}</span>
              <div className="text-xs text-gray-500">{item.description}</div>
              <span className="test-blue-600 font-bold">{item.price.toLocaleString()}원</span>
            </div>
          ))}
        </div>
      </div>
    );
}
//레스토랑 리뷰 함수
export function RestaurantReviewList({ restaurantId }: RestaurantInfoProps) {
  const [reviewList, setReviewList] = useState<Restaurant_review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId,setUserId]=useState<string|null>(null);
  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("restaurant_review")
        .select("*")
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("리뷰 목록 불러오기 실패", error);
        setReviewList(null);
      } else {
        setReviewList(data);
      }
      setLoading(false);
    };

    fetchReview();
  }, [restaurantId]);
  useEffect(()=>{
    const fetchUser=async()=>{
      const {data:userData}=await supabase.auth.getUser();
      setUserId(userData?.user?.id??null);
    };
    fetchUser();
  },[]);

  if (loading) {
    return <div className="p-4 text-gray-500">로딩 중...</div>;
  }

  if (!reviewList || reviewList.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        아직 리뷰가 없습니다. 첫 리뷰어가 되어보세요! 🚀
      </div>
    );
  }
  //리뷰 삭제
  const handleDeletereview=async(reviewID:string)=>{
    const confirmDelete=confirm("리뷰를 삭제하시겠습니까?");
    if(!confirmDelete)return;
    const {error}=await supabase
    .from("restaurant_review")
    .delete()
    .eq("id",reviewID);

    if(error){
      //에러나면 콘솔 출력
      console.error("리뷰 삭제 실패",error);
      alert("리뷰 삭제에 실패하였습니다.")
    }
    else{
      setReviewList((prev)=>prev?.filter((r)=>r.id!==reviewID)||null);
    }
  }

  return (
    <section className="bg-white rounded-xl shadow shadow-gray-200 p-4 space-y-6">

      {reviewList.map((item) => (
        <div key={item.id} className="border-b border-gray-100 pb-4 last:border-none">
          {/*삭제 버튼*/}
          {userId===item.user_id &&(
            <button
              onClick={()=>handleDeletereview(item.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              title="리뷰 삭제"
            >
              ✕
            </button>
          )}
          {/* 닉네임 + 작성일 */}
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-800">{item.nickname}</span>
            <span className="text-sm text-gray-400">
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : ""}
            </span>
          </div>
          {/* 메뉴 필터태그 (단일 문자열) */}
          {item.menu && (
            <div className="inline-block bg-gray-100 rounded-lg px-3 py-3 mb-3">
              <span className="font-mediun text-gray-800">{item.menu}</span>
            </div>
          )}
          {/* 리뷰 내용 */}
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {item.review}
          </p>

          {/* 맛 태그들 (배열) */}
          {item.tags && item.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1 py-6">
              {item.tags.map((tag) => (
                <FilterTag key={tag} label={tag} />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

