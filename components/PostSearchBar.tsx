"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";

type TagOption = "전체" | "행사" | "음식" | "자유";

interface PostSearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;

  // ✅ 부모(AllPostsPage)에서 태그 상태를 관리
  selectedTag: TagOption;
  onTagChange: (tag: TagOption) => void;
}

const TAG_OPTIONS: TagOption[] = ["전체", "행사", "음식", "자유"];

export function PostSearchAutocomplete({
  value,
  onChange,
  onEnter,
  selectedTag,
  onTagChange,
}: PostSearchAutocompleteProps) {
  const [results, setResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isClosedByClick, setIsClosedByClick] = useState(false);

  // 태그 드롭다운 열림/닫힘
  const [tagOpen, setTagOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const queryTimeout = useRef<NodeJS.Timeout | null>(null);

  // 검색어/태그 변경 시 자동완성 쿼리
  useEffect(() => {
    if (isClosedByClick) return;

    const q = value.trim();

    // 검색어도 없고 태그도 전체면 자동완성 닫기
    if (!q && selectedTag === "전체") {
      setResults([]);
      setShowResults(false);
      return;
    }

    let active = true;
    if (queryTimeout.current) clearTimeout(queryTimeout.current);

    queryTimeout.current = setTimeout(async () => {
      //  title만 가져와 자동완성에 씀
      let query = supabase.from("posts").select("title").limit(5);

      // 검색어가 있으면 title/content에서 OR 검색
      if (q) {
        query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
      }

      // 태그가 선택돼 있으면 tag 배열 포함 조건
      if (selectedTag !== "전체") {
        query = query.contains("tag", [selectedTag]);
      }

      const { data, error } = await query;

      if (!active) return;

      if (!error && data) {
        const uniqueTitles = [...new Set(data.map((r) => r.title).filter(Boolean))] as string[];
        setResults(uniqueTitles);
        setShowResults(uniqueTitles.length > 0);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => {
      active = false;
      if (queryTimeout.current) clearTimeout(queryTimeout.current);
    };
  }, [value, selectedTag, isClosedByClick]);

  // 바깥 클릭 시: 자동완성과 태그 드롭다운 둘 다 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
        setTagOpen(false);
        setIsClosedByClick(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // input에 입력하면 자동완성 다시 열 수 있게
  const handleInputChange = (val: string) => {
    setIsClosedByClick(false);
    onChange(val);
  };

  const handleClickItem = (title: string) => {
    onChange(title);
    setShowResults(false);
    setIsClosedByClick(true);
  };

  // 태그 선택
  const selectTag = (tag: TagOption) => {
    onTagChange(tag);
    setTagOpen(false);
    setIsClosedByClick(false); // 태그 바꾸면 다시 쿼리 가능
  };

  // “태그 텍스트” + “▼” 둘 다 클릭하면 열리게
  const toggleTagMenu = () => {
    setTagOpen((prev) => !prev);
    setIsClosedByClick(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* 왼쪽 돋보기 */}
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

      {/* 오른쪽 태그 버튼(텍스트 + ▼) */}
      <button
        type="button"
        onClick={toggleTagMenu}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-gray-600"
      >
        {/* 선택된 태그 표시 (전체면 '태그') */}
        <span className="select-none">
          {selectedTag === "전체" ? "태그" : `#${selectedTag}`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${tagOpen ? "rotate-180" : ""}`} />
      </button>

      {/* input (오른쪽 버튼 공간 확보: pr 크게) */}
      <Input
        placeholder="찾고 싶은 게시글을 검색해 보세요"
        className="pl-10 pr-24 h-12 rounded-full shadow-lg border-transparent"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        autoComplete="off"
        onFocus={() => setIsClosedByClick(false)} // 포커스만 와도 다시 검색 가능
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.();
            setShowResults(false);
            setIsClosedByClick(true);
          }
        }}
      />

      {/*태그 드롭다운 메뉴 (태그/▼ 눌러서 열림) */}
      {tagOpen && (
        <div className="absolute right-3 mt-2 z-20 w-32 rounded-md border bg-white shadow-md overflow-hidden">
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => selectTag(t)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                selectedTag === t ? "font-semibold" : ""
              }`}
            >
              {t === "전체" ? "전체" : `#${t}`}
            </button>
          ))}
        </div>
      )}

      {/* 자동완성 목록 */}
      {showResults && results.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border rounded-md max-h-48 overflow-y-auto shadow-md mt-1">
          {results.map((title) => (
            <li
              key={title}
              className="p-2 cursor-pointer hover:bg-gray-200"
              onClick={() => handleClickItem(title)}
            >
              {title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
