import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { supabase } from "@/lib/supabaseClient";

let profiles: any[] = [];
let restaurantInfos: any[] = [];
let menus: any[] = [];
let isDataLoaded = false;

// --- 전체 데이터 로드 ---
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

// --- DB 필터링 ---
function filterProfiles(params: { type?: string; taste?: string }) {
  return profiles.filter(p => {
    if (params.type && !p.type.includes(params.type)) return false;
    if (params.taste && !p.taste.includes(params.taste)) return false;
    return true;
  });
}

// --- API POST ---
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  await loadAllData();

  const lastPart = messages[messages.length - 1]?.parts?.[0];
  let userText = "";
  if (lastPart && lastPart.type === "text") userText = lastPart.text;

  // --- 키워드 분석 ---
  const typeKeywords = ["한식","중식","양식","일식","치킨","카페"];
  const tasteKeywords = ["매콤","달콤","짠","고소","담백","얼큰","이국적","시원","진한","바삭","쫄깃","부드러운","향긋","감칠","새콤","개운"];

  const type = typeKeywords.find(t => userText.includes(t));
  const tasteKeyword = tasteKeywords.find(t => userText.includes(t));

  const filteredProfiles = filterProfiles({ type, taste: tasteKeyword });

  // --- 추천 텍스트 생성 (HTML 하이퍼링크 포함) ---
  let recommendationText = "";
  if (!filteredProfiles.length) {
    recommendationText = "검색된 DB 결과가 없습니다. 일반 지식을 참고해 안내드릴게요.";
  } else {
    recommendationText = filteredProfiles
      .map(p => {
        const info = restaurantInfos.find(r => r.restaurant_id === p.restaurant_id);
        if (!info) return "";
        const menuStr = menus
          .filter(m => m.restaurant_id === p.restaurant_id)
          .map(m => `${m.menu} (${m.price})`)
          .join(", ");
        const link = `https://restaurant-find-one.vercel.app/restaurants/${p.restaurant_id}`;
        return `가게: <a href="${link}" target="_blank" rel="noopener noreferrer">${info.restaurant_name}</a>
주소: ${info.address}
전화: ${info.phone}
종류: ${p.type.join(", ")}
맛: ${p.taste.join(", ")}
메뉴: ${menuStr}`;
      })
      .filter(Boolean)
      .join("<br><br>");
  }

  // --- GPT 메시지 ---
  const responseMessage: UIMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: recommendationText }],
  };

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system: `
      너는 평택대학교 마스코트 '피투'야. 친근하고 귀여운 말투로 대답을 해줘.
      사용자가 식당이나 메뉴를 명확하게 추천해달라고 요청할 때만 추천을 해줘 그외에는 일상적인 대화를 하면 돼.
      DB에서 찾은 정보가 있다면, 최대 3개의 식당을 링크와 함께 안내해줘. 만약 3개 미만이 검색되면 있는 식당만 알려주면 돼.
      만약 DB에 없는 내용이라면, DB를 언급하지 말고 그냥 일반적인 정보(예: "그 메뉴는 평택대 주변에 유명한 곳이 없어요.")로 친절하고 귀엽게 안내해줘. 절대 DB에 없는 정보를 있는 것처럼 꾸며내지 마.
      "더 추천해줘"와 같은 추가 요청이 있을 때만 3개를 초과해서 추천해줘.
    `,
    messages: convertToModelMessages([...messages, responseMessage]),
  });

  return result.toUIMessageStreamResponse();
}
