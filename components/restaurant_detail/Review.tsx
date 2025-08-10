"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Restaurant_review {
  id: string;
  restaurant_id: string;
  user_id: string;
  nickname: string;
  review: string;
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
        .eq("restaurant_id", restaurantId) // 해당 식당 리뷰만 가져오기

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

          {/* 리뷰 내용 */}
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {item.review}
          </p>
        </div>
      ))}
    </section>
  );
}
