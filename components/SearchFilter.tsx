"use client" //이 컴포넌트는 클라이언트다

import {useState} from "react"
import { FoodTypeSelector_ver2 } from "@/components/food-type-selector_ver2"
import { TasteTypeSelector_ver2 } from "@/components/taste-selector_ver2"
import { SearchLogicToggle } from "./search-logic-toggle"
import {Button} from "@/components/ui/button"
import {supabase} from "@/lib/supabaseClient"

//검색 논리 타입 정의
type SearchLogic="AND" | "OR"

interface SearchFilterProps{
    //검색 결과를 부모 컴포넌트에 전달하는 콜백 함수 (일단 void로 해놓음 나중에 바꿀수도 있음)
    onSearchResult?: (data:any[]) => void
}

//컴포넌트 정의

export function SearchFilter({onSearchResult}:SearchFilterProps){
    //선택된 음식 종류 배열 상태
    const [selectedFoodTypes,setSelectedFoodTypes]=useState<string[]>([])
    //선택된 맛 배열 상태
    const [selectedTastes,setSelectedTastes]=useState<string[]>([])
    //맛 필터의 AND/OR 논리 상태
    const [tasteSearchLogic,setTasteSearchLogic]=useState<SearchLogic>("OR")
    //검색 결과 데이터 상태
    const[searchResults,setSearchResult]=useState<any[]>([])
    //로딩 상태 (검색이 느려질때 표시용)
    const [loading,setLoading] =useState(false)
    //에러 메세지
    const[error,setError]=useState<string | null>(null)
    //음식 종류 선택/해제 토글 함수
    const toggleFoodType=(label:string)=> {
        setSelectedFoodTypes(prev=>
            prev.includes(label)?prev.filter(t=>t!==label):[...prev,label]
        )
    }
    //맛 선택/해제 토글 함수
    const toggleTaste=(label:string)=> {
        setSelectedTastes(prev=>
            prev.includes(label)?prev.filter(t=>t!==label):[...prev,label]
        )
    }
    // 검색 버튼 클릭 시 호출되는 쿼리 함수->이거는 supabase와 연동됨
    const handleSearch=async()=>{
        setLoading(true) //로딩 시작
        setError(null)  //에러 초기화
        setSearchResult([]) //기존 결과 초기화

        try{
            //레스토랑 테이블에서 전체 선택된 컬럼 조회
            let query=supabase.from("restaurants").select("*")
            //음식 종류 조건 추가(선택된 음식 종류가 있을 때만)
            if (selectedFoodTypes.length>0)
                query=query.in("food_type",selectedFoodTypes)
            //맛 조건 추가(선택된 맛이 있을 떄만)
            if (selectedTastes.length>0){
                if (tasteSearchLogic==="AND"){
                    //AND 조건: 선택된 모든 맛을 포함하는 레코드만 조회
                    selectedTastes.forEach(taste=>{
                        query=query.contains("tastes",[taste])
                    })
                }
                //OR 조건:선택된 맛 중 하나라도 포함하는 레코드 조회
                else{
                    query=query.overlaps("tastes",selectedTastes)
                }
            }
            //쿼리 실행
            const{data,error}=await query

            if(error){
                //에러가 발생하면 상태에 저장
                setError(error.message)
                setSearchResult([])
            }
            //정상 응답시
            else{
                setSearchResult(data||[])
                //부모 콜백이 있으면 결과 전달
                if (onSearchResult) onSearchResult(data || [])
            }
        }
        catch(err){
            //에러 처리
            setError("오류가 발생했습니다.")
            setSearchResult([])
        }
        finally{
            setLoading(false) //로딩 종료
        }
    }
    return (
    <div>
      {/* 음식 종류 선택 컴포넌트 */}
      <FoodTypeSelector_ver2
        selectedFoodTypes={selectedFoodTypes}
        onToggleFoodType={toggleFoodType}
      />

      {/* 맛 선택 컴포넌트 */}
      <TasteTypeSelector_ver2
        selectedTasteTypes={selectedTastes}
        onToggleTasteType={toggleTaste}
      />

      {/* AND/OR 토글 스위치 (맛을 2개 이상 선택했을 때만 노출) */}
      {selectedTastes.length > 1 && (
        <div className="my-4">
          <SearchLogicToggle logic={tasteSearchLogic} onLogicChange={setTasteSearchLogic} />
        </div>
      )}

      {/* 검색 실행 버튼 */}
      <Button
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold"
        onClick={handleSearch}
        disabled={loading}  // 로딩 중엔 버튼 비활성화
      >
        {/* 로딩 상태에 따라 버튼 텍스트 변경 */}
        {loading ? "검색 중..." : `${selectedFoodTypes.length + selectedTastes.length}개 조건으로 검색하기`}
      </Button>

      {/* 에러 메시지 출력 */}
      {error && <p className="mt-4 text-red-600 font-semibold">{error}</p>}

      {/* 검색 결과 리스트 */}
      <div className="mt-6">
        {/* 결과 없고 로딩 중이 아닐 때 안내 문구 */}
        {searchResults.length === 0 && !loading && <p>검색 결과가 없습니다.</p>}

        {/* 결과 목록 출력 */}
        <ul>
          {searchResults.map(r => (
            <li key={r.id} className="border-b py-2">
              <strong>{r.name}</strong> — {r.food_type} — 맛: {r.tastes?.join(", ")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}


