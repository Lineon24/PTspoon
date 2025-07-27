"use client"

import {useEffect,useState} from "react";
import { FeatureToggle } from "@/components/feature-toggle";
import {supabase} from "@/lib/supabaseClient"; //Supabase 클라이언트 불러오기
interface TasteType{
  emoji: string;
  label:string;
  description:string;
}

interface TasteTypeSelectorProps{
  selectedTasteTypes: string[]; //현재 선택됙 맛 종류 리스트
  onToggleTasteType:(label:string)=>void; //맛 종류 토글 함수
}
//컴포넌트 시작
export function TasteTypeSelector_ver2(
  {selectedTasteTypes,onToggleTasteType}:TasteTypeSelectorProps){
    //db에서 불러온 맛 종류 리스트 상태
    const[foodType,setTasteTypes]=useState<TasteType[]>([]);
    //로딩 여부 상태
    const [loading,setLoading]=useState(true);

    //supabase에서 데이터 가져오기 함수
    useEffect(()=>{
        const fetchTasteTypes=async () =>{
            setLoading(true); //데이터 로딩 시작
            //db의 tastetypes 테이블에서 이모티콘,라벨,설명 컬럼만 가져오기
            const {data,error}=await supabase
            .from("tastetype")
            .select("emoji,label,description");

            if (error) {
            console.error("맛 종류 불러오기 실패:",error);
            }
            else{ //데이터가 존재하면 상태 저장
            setTasteTypes(data || []);
            }
            setLoading(false);
        };

      //컴포넌트가 마운트될때 한 번 실행
      fetchTasteTypes();
    },[]);
//로딩 중일 때 화면 표시
    if (loading){
        return <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">음식 종류를 불러오는 중...</h2>
        </div>
    }

    return (
        <div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">어떤 음식이 드시고 싶나요?</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">여러 개를 선택해서 더 정확한 추천을 받아보세요</p>
          </div>
          {/*음식 종류 리스트*/}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {foodType.map((type) => (
              <FeatureToggle
                key={type.label}        //각 음식 종류의 label을 key로 사용
                emoji={type.emoji}      //음식 이모지
                label={type.label}      //음식 이름
                description={type.description}      //설명
                isSelected={selectedTasteTypes.includes(type.label)}     //선택 여부
                onToggle={() => onToggleTasteType(type.label)}       //선택/해제 이벤트
              />
            ))}
          </div>
        </div>
      )
  }

