"use client";
//선택된 맛 종류를 출력 및 페이지에 넘기는 컴포넌트
import { TasteTypeSelector_ver3 } from "../taste-selector_ver3";
import { useEffect,useState } from "react";
import { FilterTag } from "../filter-tag";
import { Button } from "../ui/button";

//부모 페이지에서 전달 받는 props 타입 정의
interface SelectedTasteProps{
    onSearch:(params:{
        selectedTasteTypes:string[]; //선택된 맛 종류 배열
    })=> void;
}
//SearchFilter_ver3의 코드 대부분을 재활용함
export function TasteSelect_Review({onSearch}:SelectedTasteProps){
    const [selectedTaste,setSelectedTaste]=useState<string[]>([]);

    //맛 종류 토글 함수
    const toggleTaste=(label:string)=>{
        setSelectedTaste((prev)=>
            prev.includes(label)?prev.filter((t)=>t!==label):[...prev,label]
        );
    };

    //리셋 함수
    const resetFilters=()=>{
        setSelectedTaste([]);
    }
    //
    //맛 종류를 부모컴포넌트에 전달
    const handleSelect=()=>{
        onSearch({
            selectedTasteTypes:selectedTaste
        });
    }

    const totalSelections=selectedTaste.length

    return(
        <div className="flex flex-col">
            <div className="flex w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
                <span className="mr-2">✨</span>
                <h2 className="font-semibold text-gray-900 dark:text-gray-50">맛 특징</h2>
            </div>

            {/*맛 종류 선택 UI*/}
            <TasteTypeSelector_ver3
            selectedTasteTypes={selectedTaste}
            onToggleTasteType={toggleTaste}
            />

            <div className="flex flex-wrap gap-2 mt-4 mb-4">
                {selectedTaste.map((taste)=>(
                    <FilterTag key={taste} label={taste} onRemove={()=>toggleTaste(taste)}/>
                ))}
            </div>
            {/*버튼*/}
            <div className="flex gap-3">
                <Button
                    className="flex-grow"
                    onClick={handleSelect}
                    disabled={totalSelections===0}
                >
                    {totalSelections}개 조건으로 검색하기
                </Button>
                <Button className="flex-grow" variant="ghost" onClick={resetFilters}>
                    초기화
                </Button>
            </div>
        </div>
    )
}