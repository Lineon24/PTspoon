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
  const preventQuery = useRef(false); // 클릭 시 쿼리 방지

  useEffect(() => {
    if (preventQuery.current) {
      console.log("쿼리 방지 활성, useEffect 종료");
      preventQuery.current = false;
      return;
    }

    if (!value.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    let active = true;

    const delay = setTimeout(async () => {
      const { data, error } = await supabase
        .from("restaurant")
        .select("restaurant_name")
        .ilike("restaurant_name", `%${value.trim()}%`)
        .limit(5);

      if (!error && data && active) {
        const uniqueNames = [...new Set(data.map((r) => r.restaurant_name))];
        setResults(uniqueNames);
        setShowResults(true);
      } else if (active) {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(delay);
    };
  }, [value]);

  const handleClick = (name: string) => {
    preventQuery.current = true; // 클릭 시 쿼리 방지
    onChange(name);
    setShowResults(false); // 목록 닫기
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

      <Input
        placeholder="지역, 음식 또는 식당명 검색"
        className="pl-10 h-12 rounded-full shadow-lg border-transparent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (onEnter) onEnter();
            setShowResults(false);
          }
        }}
      />

      {showResults && results.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md max-h-48 overflow-y-auto shadow-md mt-1">
          {results.map((name) => (
            <li
              key={name}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleClick(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
