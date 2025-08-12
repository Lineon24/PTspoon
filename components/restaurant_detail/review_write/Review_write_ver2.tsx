'use client';

import { useEffect,useState } from "react";
import {supabase} from "@/lib/supabaseClient";
import {useRouter} from 'next/navigation';

//리뷰,프로필 인터페이스
interface Review{
    id:string;
    user_id:string;
    nickname:string;
    review:string;
}

interface Profile{
    id:string;
    nickname:string;
}

//맛 선택 인터페이스
interface TasteType {
  id:string
  taste: string;
  description: string;
}
//레스토랑 ID 인터페이스
interface Restaurant{
    restaurantID:string;
}


