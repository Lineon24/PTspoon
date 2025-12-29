import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage, generateText } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

// --- 인터페이스 정의 ---
interface AnalysisResult {
  intent: string;
  categories: string[];
  tastes: string[];
  positiveKeywords: string[];
  negativeKeywords: string[];
  maxDistance: number | null;
}

// --- 전역 데이터 관리 ---
let profiles: any[] = [];
let restaurantInfos: any[] = [];
let menus: any[] = [];
let isDataLoaded = false;

const PTU_COORDS = { lat: 37.0097, lng: 127.1325 };

const ALLOWED_TYPES = ["한식", "중식", "양식", "일식", "카페", "치킨"];
const ALLOWED_TASTES = [
  "매콤한맛", "짠맛", "담백한맛", "얼큰한맛", "달콤한맛", "이국적인맛",
  "고소한맛", "새콤한맛", "시원한맛", "진한맛", "바삭한맛",
  "쫄깃한맛", "부드러운맛", "향긋한맛", "개운한맛", "감칠맛"
];

// --- 유틸리티: 거리 계산 ---
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// --- 전체 데이터 로드 ---
async function loadAllData() {
  if (isDataLoaded) return;
  const [p, r, m] = await Promise.all([
    supabase.from("restaurant_profiles").select("*"),
    supabase.from("restaurant").select("*"),
    supabase.from("menu").select("*")
  ]);
  profiles = p.data || [];
  restaurantInfos = r.data || [];
  menus = m.data || [];
  isDataLoaded = true;
}

const redis = Redis.fromEnv();

// --- API POST 핸들러 ---
export async function POST(req: NextRequest) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUserMessage = messages[messages.length - 1];
  const lastUserText = lastUserMessage?.parts?.find(p => p.type === 'text')?.text || "";

  // (레이트 리밋 로직 생략 - 필요 시 기존 코드 유지)

  await loadAllData();

  // 1단계: AI 의도 분석 (태그 및 키워드 추출)
  const analysisResult = await generateText({
    model: openai("gpt-4.1-mini"),
    system: `
      너는 사용자의 질문을 분석해 검색 조건을 추출하는 분석가야.
      반드시 아래 리스트의 단어를 우선적으로 사용해.

      [카테고리: ALLOWED_TYPES]
      ${ALLOWED_TYPES.join(", ")}

      [맛 특징: ALLOWED_TASTES]
      ${ALLOWED_TASTES.join(", ")}

      - intent: "restaurant_recommendation" 또는 "chit_chat"
      - categories: 위 리스트 중 해당하는 항목 추출
      - tastes: 위 리스트 중 해당하는 항목 추출
      - positiveKeywords: 브랜드명(맘스터치, BBQ, BHC, 롯데리아), 식당 명, 요리 방식(케이준, 튀긴 등), 재료(닭고기, 돼지고기), 메뉴명 추출
      - negativeKeywords: 사용자가 싫어하거나 제외하고 싶은 재료나 음식
      - maxDistance: 거리 언급 시 미터 단위 추출 (없으면 null)
    `,
    prompt: `질문: "${lastUserText}"`,
  });

  let analysis: AnalysisResult = { 
    intent: "restaurant_recommendation", 
    categories: [], 
    tastes: [], 
    positiveKeywords: [], 
    negativeKeywords: [], 
    maxDistance: null 
  };

  try {
    const cleanedJson = analysisResult.text.replace(/```json\n?|\n?```/g, '').trim();
    analysis = JSON.parse(cleanedJson) as AnalysisResult;
  } catch (e) {
    console.error("JSON 파싱 에러");
  }

  let instructionText = "";
  let restaurantsForAnalysis: any[] = [];

  if (analysis.intent !== "chit_chat") {
    // 2단계: 복합 필터링 (제외 필터 포함)
    restaurantsForAnalysis = profiles.map(p => {
      const info = restaurantInfos.find(r => r.restaurant_id === p.restaurant_id);
      if (!info) return null;

      const resMenus = menus.filter(m => m.restaurant_id === p.restaurant_id);
      const dist = (info.lat && info.lng) ? getDistance(PTU_COORDS.lat, PTU_COORDS.lng, info.lat, info.lng) : null;

      // 거리 필터
      if (analysis.maxDistance && dist && dist > analysis.maxDistance) return null;

      // --- 제외 필터 (Negative Keywords) ---
      const fullTextForExclusion = `${info.restaurant_name} ${info.description} ${resMenus.map(m => m.menu + (m.description || "")).join(" ")} ${p.type} ${p.taste}`.toLowerCase();
      const isExcluded = analysis.negativeKeywords.some((neg: string) => fullTextForExclusion.includes(neg.toLowerCase()));
      if (isExcluded) return null;

      // --- 매칭 로직 ---
      const isTypeMatch = analysis.categories.some(cat => p.type.includes(cat));
      const isTasteMatch = analysis.tastes.some(t => p.taste.includes(t));
      const isKeywordMatch = analysis.positiveKeywords.some(kw => 
        info.restaurant_name.includes(kw) || 
        info.description?.includes(kw) || 
        resMenus.some(m => m.menu.includes(kw) || m.description?.includes(kw))
      );

      const hasCriteria = analysis.categories.length > 0 || analysis.tastes.length > 0 || analysis.positiveKeywords.length > 0;
      
      if (!hasCriteria || isTypeMatch || isTasteMatch || isKeywordMatch) {
        return {
          name: info.restaurant_name,
          distance: dist ? `${dist}m` : "정보 없음",
          rawDistance: dist || 9999,
          description: info.description || "",
          address: info.address || "주소 정보 없음",
          phone: info.phone || "연락처 정보 없음",
          // 모든 메뉴와 설명을 포함하도록 수정
          allMenus: resMenus.map(m => {
            const desc = m.description ? ` (${m.description})` : "";
            return `${m.menu}${desc}: ${m.price}원`;
          }).join(", "),
          type: p.type,
          taste: p.taste,
          link: `(https://restaurant-find-one.vercel.app/restaurants/${p.restaurant_id})`
        };
      }
      return null;
    }).filter(Boolean);

    // 가까운 거리순 정렬
    restaurantsForAnalysis.sort((a, b) => a.rawDistance - b.rawDistance);

    instructionText = `
      사용자 선호: ${analysis.positiveKeywords.join(", ")}
      사용자 기호: ${analysis.tastes.join(", ")}
      제외 요청: ${analysis.negativeKeywords.join(", ")}
      
      아래 식당 목록 중 조건에 가장 부합하는 5곳을 추천해줘.
      각 식당의 'allMenus' 항목에 메뉴 설명이 포함되어 있으니, 이를 참고해서 왜 추천하는지 친근하게 설명해줘!
      [식당 목록]
      ${JSON.stringify(restaurantsForAnalysis.slice(0, 10))}
    `;
  } else {
    instructionText = "일상적인 대화야. 피투답게 귀엽게 대답해줘.";
  }

  // 3단계: 최종 스트리밍 응답
  const responseMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: instructionText }],
  };

  return streamText({
    model: openai("gpt-4.1-mini"),
    system: `
      너는 평택대학교 마스코트 '피투'야! 귀엽고 친절하게 대답해줘.
      
      [응답 규칙]
      1. 일상적인 대화면 식당 목록을 언급하지 말고 평범하게 대답해줘 근데 (날씨, 축제, 행사 등) 정보를 물어본다면 검색을 해서 알려줘.
      2. 식당 추천 시 [식당이름](링크) 형식과 거리 정보(약 100m) 필수 포함.
      3. 주소(address)와 전화번호(phone) 정보를 활용해서 안내해줘.
      4. 메뉴 정보(allMenus)와 메뉴 설명을 읽고, 사용자가 원하는 요구사항에 맞춰서 추천해줘!
         (예: "여기 {메뉴이름}은 {메뉴설명}이라서 너가 좋아할 것 같아!")
      5. 사용자가 싫어하는 재료(${analysis.negativeKeywords.join(",")})가 언급된 메뉴는 추천에서 제외하거나 주의사항으로 알려줘.
    `,
    messages: convertToModelMessages([...messages.slice(-8), responseMessage]),
  }).toUIMessageStreamResponse();
}