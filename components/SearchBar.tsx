"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}

export function SearchAutocomplete({ value, onChange, onEnter }: SearchAutocompleteProps) {
  const [results, setResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isClosedByClick, setIsClosedByClick] = useState(false); // 외부 클릭 상태
  const containerRef = useRef<HTMLDivElement>(null);
  const queryTimeout = useRef<NodeJS.Timeout | null>(null);

  // 검색어 변경 시 자동완성 쿼리
  useEffect(() => {
    if (isClosedByClick) return; // 외부 클릭 후 쿼리 막기

    if (!value.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    let active = true;

    if (queryTimeout.current) clearTimeout(queryTimeout.current);

    queryTimeout.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_name")
        .ilike("restaurant_name", `%${value.trim()}%`)
        .limit(5);

      if (!active) return;

      if (!error && data) {
        const uniqueNames = [...new Set(data.map((r) => r.restaurant_name))];
        setResults(uniqueNames);
        setShowResults(uniqueNames.length > 0);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => {
      active = false;
      if (queryTimeout.current) clearTimeout(queryTimeout.current);
    };
  }, [value, isClosedByClick]);

  // 외부 클릭 처리
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setIsClosedByClick(true); // 외부 클릭 상태로 변경
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // input에 입력하면 외부 클릭 플래그 해제
  const handleInputChange = (val: string) => {
    setIsClosedByClick(false); // 다시 쿼리 가능
    onChange(val);
  };

  const handleClickItem = (name: string) => {
    onChange(name);
    setShowResults(false);
    setIsClosedByClick(true); // 클릭 후 쿼리 막기
  };

  return (
    <div className="relative" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
      <Input
        placeholder="찾고 싶은 식당 명을 검색해 보세요"
        className="pl-10 h-12 rounded-full shadow-lg border-transparent"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (onEnter) onEnter();
            setShowResults(false);
            setIsClosedByClick(true); // 엔터 후 쿼리 막기
          }
        }}
      />

      {showResults && results.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md max-h-48 overflow-y-auto shadow-md mt-1">
          {results.map((name) => (
            <li
              key={name}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleClickItem(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
