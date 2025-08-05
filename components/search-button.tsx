"use client" //나 컴포넌트는 클라이언트다

import {Button} from "@/components/ui/button" //프로젝트의 공통 버튼 컴포넌트 불러옴
import {Search} from "lucide-react" //검색 아이콘


//SearchButton 컴포넌트의 props 타입 정의
interface SearchButtonProps{
    totalSelection:number //현재 선택된 필터의 총 개수
    onSearch: ()=>void //검색 버튼 클릭 시 실행할 콜백 함수
}
//컴포넌트 정의
export function SearchButton ({totalSelection,onSearch}:SearchButtonProps){
    return (
        //클릭시 onSearch함수 호출 그리고 스타일 정의
        <Button onClick={onSearch}   className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold">
            {/*버튼 왼쪽에 검색 아이콘 추가*/}
            <Search className="mr-2 h-5 w-5"/>
            {/*선택된 필터 개수 표시*/}
            {totalSelection}개 조건으로 검색하기
        </Button>
    )
}



