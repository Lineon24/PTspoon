'use client';

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FilterTag } from "@/components/filter-tag";

interface Restaurant_review {
  id: string;
  restaurant_id: string;
  user_id: string;
  nickname: string;
  review: string;
  menu?: string | null;        // 단일 메뉴 이름 (nullable)
  tags?: string[] | null;      // 맛 태그 배열 (nullable)
  created_at?: string;
}

interface RestaurantInfoProps {
  restaurantId: string;
}

export default function RestaurantReviewList({ restaurantId }: RestaurantInfoProps) {
  const [reviewList, setReviewList] = useState<Restaurant_review[] | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <section className="bg-white rounded-xl shadow shadow-gray-200 p-4 space-y-6">
      {reviewList.map((item) => (
        <div key={item.id} className="border-b border-gray-100 pb-4 last:border-none">
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
            <div className="flex flex-wrap gap-1 mb-1 py-1">
              <FilterTag label={item.menu} />
            </div>
          )}
          {/* 리뷰 내용 */}
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {item.review}
          </p>

          {/* 맛 태그들 (배열) */}
          {item.tags && item.tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
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
