import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage, generateText } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

let profiles: any[] = [];
let restaurantInfos: any[] = [];
let menus: any[] = [];
let isDataLoaded = false;

// --- 전체 데이터 로드 (한 번만 실행) ---
async function loadAllData() {
  if (isDataLoaded) return;

  // restaurant_profiles
  const profilesRes = await supabase.from("restaurant_profiles").select("restaurant_id, type, taste");
  profiles = profilesRes.data || [];

  // restaurants
  const restaurantsRes = await supabase.from("restaurant").select("restaurant_id, restaurant_name, address, phone");
  restaurantInfos = restaurantsRes.data || [];

  // menu 
  const menuRes = await supabase.from("menu").select("*");
  menus = menuRes.data || [];

  isDataLoaded = true;
}

const redis = Redis.fromEnv();

// --- API POST ---
export async function POST(req: NextRequest) {
  const { messages, data }: { messages: UIMessage[], data: any } = await req.json();

  const MAX_REQUESTS = 5; // 제한 횟수
  const COUNT_EXPIRATION_SECONDS = 1800; // 제한 횟수 데이터베이스 유지시간
  const BLOCK_DURATION_SECONDS = 100; // 제한 시간

  const lastUserMessage = messages[messages.length - 1];
  const userId = (lastUserMessage?.metadata as { userId?: string })?.userId || 'unknown';
  const currentTime = Date.now();

  const countKey = `rate_count:${userId}`;
  const blockKey = `rate_block:${userId}`;

  // 블록 확인
  const blockUntilStr = await redis.get(blockKey);
  const blockUntil = blockUntilStr ? Number(blockUntilStr) : null;

  if (blockUntil && currentTime < blockUntil) {
    const remainingTime = Math.ceil((blockUntil - currentTime) / 1000); // 초 단위
    return new NextResponse(
      JSON.stringify({ error: `요청 한도를 초과했습니다. ${remainingTime}초 후에 다시 시도해주세요.`, remainingTime }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 요청 횟수 증가
  const currentCount = await redis.incr(countKey);
  if (currentCount === 1) {
    await redis.expire(countKey, COUNT_EXPIRATION_SECONDS);
  }

  if (currentCount > MAX_REQUESTS) {
    await redis.set(blockKey, currentTime + BLOCK_DURATION_SECONDS * 1000, { ex: BLOCK_DURATION_SECONDS });
    await redis.del(countKey);
    return new NextResponse(
      JSON.stringify({ error: `요청 한도를 초과했습니다. ${BLOCK_DURATION_SECONDS}초 후에 다시 시도해주세요.` }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // 횟수 제한 로직 끝


  await loadAllData();

  
  const lastUserText = lastUserMessage?.parts?.find(p => p.type === 'text')?.text || "";

  // --- 1단계: AI를 이용해 사용자 의도 분석 ---
  const typeKeywords = ["한식", "중식", "양식", "일식", "치킨", "카페", "기타"];
  
  const analysisResult = await generateText({
    model: openai("gpt-4.1-mini"),
    system: `
      You are a helpful assistant that analyzes user's text and extracts information about food preferences.
      First, classify the user's intent as either "restaurant_recommendation" or "chit_chat".
      If the intent is "restaurant_recommendation", classify the user's request into one or more categories from the provided list.
      If you can't find any relevant categories, return ONLY "기타" as the single category.
      Extract specific keywords related to food type, taste, or menu.
      Respond ONLY in JSON format. Do not use any markdown or extra text.
    `,
    prompt: `
      Analyze the following user's request: "${lastUserText}".
      Choose the intent from ["restaurant_recommendation", "chit_chat"].
      If the intent is "restaurant_recommendation", choose up to 3 categories from this list that best match the request: ${typeKeywords.join(", ")}.
      Provide the result in the following JSON format:
      {
        "intent": "...",
        "categories": ["category1", "category2", ...],
        "keywords": ["keyword1", "keyword2", ...]
      }
    `,
  });
  
  let analysis: { intent: string; categories: string[]; keywords: string[] } = { intent: "chit_chat", categories: [], keywords: [] };
  try {
    const cleanedText = analysisResult.text.replace(/```json\n?|\n?```/g, '').trim();
    analysis = JSON.parse(cleanedText);
  } catch (error) {
    console.error("Failed to parse AI analysis:", error);
    // JSON 파싱 실패 시 일상 대화로 간주
    analysis.intent = "chit_chat"; 
    analysis.keywords = lastUserText.split(" ");
  }

  // --- 2단계: 의도에 따라 로직 분기 ---
  let instructionText = "";
  let restaurantsForAnalysis: any[] = [];

  if (analysis.intent === "restaurant_recommendation") {
    const aiSuggestedCategories = analysis.categories;
    let primaryFilteredProfiles;

    // '기타'만 있으면 전체 식당을 대상으로 검색
    if (aiSuggestedCategories.length === 1 && aiSuggestedCategories[0] === "기타") {
      primaryFilteredProfiles = profiles;
    } else {
      primaryFilteredProfiles = profiles.filter(p => 
        aiSuggestedCategories.some(suggestedCat => p.type.includes(suggestedCat))
      );
    }
    
    // 3단계: 2차 분석 및 최종 답변 생성을 위한 정보 가공
    restaurantsForAnalysis = primaryFilteredProfiles.map(p => {
      const info = restaurantInfos.find(r => r.restaurant_id === p.restaurant_id);
      if (!info) return null;

      const menuItems = menus
        .filter(m => m.restaurant_id === p.restaurant_id)
        .map(m => {
          const menuDetail = m.description ? `${m.menu} (${m.description})` : m.menu;
          return `${menuDetail} - ${m.price}원`;
        })
        .join(", ");

      return {
        name: info.restaurant_name,
        description: `종류: ${p.type.join(", ")}, 맛 특징: ${p.taste.join(", ")}, 주요 메뉴: ${menuItems || '메뉴 정보 없음'}`,
        link: `https://restaurant-find-one.vercel.app/restaurants/${p.restaurant_id}`
      };
    }).filter(Boolean);

    if (restaurantsForAnalysis.length === 0) {
      instructionText = "검색된 DB 결과가 없습니다. 일반 지식을 참고해 안내드릴게요.";
    } else {
      instructionText = 
      `사용자가 원한 음식의 특징은 "${analysis.keywords.join(", ")}"이야. 아래 식당 목록을 보고, 사용자의 요구사항과 가장 일치하는 식당을 최대 3개까지 골라 추천해줘. 
      각 식당의 메뉴와 메뉴 설명을 잘 읽고 판단해야 해. 추천할 때는 식당 이름과 링크, 그리고 왜 추천하는지에 대한 간단한 이유를 친근하고 귀엽게 설명해줘. 
      링크는 ()에 깜싸줘야해.
      [식당 목록]
      ${JSON.stringify(restaurantsForAnalysis)}`;
    }
  } else {
    // 일상 대화일 경우, DB를 사용하지 않는 간결한 지시를 보냄
    instructionText = "일상적인 대화에 대한 응답을 생성해줘.";
  }

  const responseMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: instructionText }],
  };

  const limitedMessages = messages.slice(-8, -1);
  
  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system: `
      너는 평택대학교 마스코트 '피투'야. 친근하고 귀여운 말투로 대답을 해줘.
      사용자가 식당이나 메뉴를 명확하게 추천해달라고 요청할 때만 추천을 해줘. 그 외에는 일상적인 대화를 하면 돼.
      내가 제공한 [식당 목록] 정보를 바탕으로 최종 답변을 생성해야 해. 절대 목록에 없는 정보를 꾸며내면 안 돼.
      일상적인 대화에는 식당 목록을 언급하지 않고 자유롭게 대화해줘.
    `,
    messages: convertToModelMessages([...limitedMessages, messages[messages.length - 1], responseMessage]),
  });

  return result.toUIMessageStreamResponse();
}