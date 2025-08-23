'use client' 
//원래는 그냥 페이지에 버튼을 추가할려고 했는데
//로그인이 안되있으면 로그인 창으로 리다이렉트 되게 만들려고
//컴포넌트를 따로 만듬
//시발 원래는 딸깍이면 되는데...
import {Button} from "@/components/ui/button"
import { useEffect,useState } from "react";
import { supabase } from "@/lib/supabaseClient"
import {useRouter} from "next/navigation"
import { FilterTag } from "@/components/filter-tag";
//사용자 프로필 정보
interface Profile{
    id:string
    nickname:string;
}

interface logininfo{
    profile:Profile|null //현재 로그인된 사용자 프로필 (리뷰 쓰기 권한 확인)
    restaurant_id:string;
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
 
export function IsLogin({profile,restaurant_id}:logininfo){
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
            router.push(`/restaurants/${restaurant_id}/review_write`);
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
//리뷰 삭제 버튼 연동을 위해서 IsLogin으로 옮김
export function RestaurantReviewList({profile,restaurant_id}:logininfo) {
  const [reviewList, setReviewList] = useState<Restaurant_review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  //현재 로그인한 사용자 id 가져오기
  useEffect(()=>{
    const getUser=async()=>{
      const {data,error}=await supabase.auth.getUser();
      if(error || !data.user){
        setCurrentUserId(null)
      }
      else{
        setCurrentUserId(data.user.id);//로그인 사용자 id 저장
      }
    }
    getUser();
  },[]);

  //리뷰 패치
  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("restaurant_review")
        .select("*")
        .eq("restaurant_id", restaurant_id);

      if (error) {
        console.error("리뷰 목록 불러오기 실패", error);
        setReviewList(null);
      } else {
        setReviewList(data);
      }
      setLoading(false);
    };

    fetchReview();
  }, [restaurant_id]);

  
  //로딩 중
  if (loading) {
    return <div className="p-4 text-gray-500">로딩 중...</div>;
  }
  //리뷰가 없을때
  if (!reviewList || reviewList.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        아직 리뷰가 없습니다. 첫 리뷰어가 되어보세요! 🚀
      </div>
    );
  }
  //리뷰 삭제 함수
  const handleDelete=async(reviewId:string)=>{
    if(!currentUserId){
      alert("로그인이 필요합니다.")
      return;
    }

    const {data:review,error:fetchError}=await supabase
    .from("restaurant_review")
    .select("user_id")
    .eq("id",reviewId)
    .single();
  
  //원래 자신의 리뷰만 삭제 버튼이 보일 수 있게 만들지만 혹시 모르니까 안전장치를 만듦
  if(review?.user_id !== currentUserId){
    alert("본인이 작성한 리뷰만 삭제할 수 있습니다.")
  }

  // 삭제 확인
  const confirmDelete = window.confirm("리뷰를 삭제하시겠습니까?");
  if (!confirmDelete) return; // '아니요' 선택 시 종료
  else{
    alert("리뷰가 삭제되었습니다.")
  }

  const {error:deleteError}=await supabase
  .from("restaurant_review")
  .delete()
  .eq("id",reviewId);

  if(deleteError){
    alert("리뷰 삭제 오류");
    return;
  }

  //삭제 성공시 목록 갱신
  setReviewList((prev)=>
    prev?prev.filter((r)=>r.id!==reviewId):prev
  );
};


  return (
    <section className="bg-white rounded-xl shadow shadow-gray-200 p-4 space-y-6">

      {reviewList.map((item) => (
        <div key={item.id} className="border-b border-gray-100 pb-4 last:border-none">
          <div className="flex justify-between items-center mb-2">
          {/* 닉네임 + 삭제 버튼 묶음 */}
          <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">{item.nickname}</span>
          {currentUserId === item.user_id && (
          <button
            onClick={() => handleDelete(item.id)}
            className="text-xs text-red-500 hover:underline"
          >
            X
          </button>
          )}
          </div>
        </div>

          {/* 메뉴 필터태그 (단일 문자열) */}
          {item.menu && (
            <div className="inline-flex items-center gap-2 bg-white-50 border border-blue-200 
                  rounded-full px-4 py-1 mb-3">
              <span className="text-sm font-medium text-black-700">{item.menu}</span>
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

          {/* 작성일은 오른쪽 끝 */}
          <div className="flex justify-end">
          <span className="text-sm text-gray-400">
          {item.created_at
            ? new Date(item.created_at).toLocaleDateString()
            : ""}
          </span>
          </div>
        </div>
      ))}
    </section>
  );
}