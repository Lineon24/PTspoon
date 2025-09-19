import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, ModelMessage } from "ai";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

export const runtime = "edge";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// --- zod schema ---
const searchParamsSchema = z.object({
  intent: z.enum([
    "search_by_taste_and_type",
    "search_by_restaurant_name",
    "search_by_menu_name",
    "general_conversation",
  ] as const),
  type: z.enum(["한식", "중식", "양식", "일식", "카페", "치킨"]).optional(),
  taste: z
    .enum([
      "매콤한맛","짠맛","담백한맛","얼큰한맛","달콤한맛","이국적인맛",
      "고소한맛","새콤한맛","시원한맛","진한맛","바삭한맛","쫄깃한맛",
      "부드러운맛","향긋한맛","개운한맛","감칠맛",
    ])
    .optional(),
  name: z.string().optional(),
  menu: z.string().optional(),
});

export async function POST(req: Request) {
  const { messages }: { messages: ModelMessage[] } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: "너는 평택대학교 마스코트 '피투'이며, 맛집 전문가야.",
    messages,
    tools: {
      searchRestaurants: tool({
        description: "사용자의 요청에 따라 DB에서 식당을 검색한다.",
        schema: searchParamsSchema,   // ✅ parameters → schema
        handler: async (params: z.infer<typeof searchParamsSchema>) => {
          const { intent, type, taste, name, menu } = params;
          let restaurants: any[] = [];

          switch (intent) {
            case "search_by_taste_and_type":
              const { data: d1 } = await supabase.rpc("search_restaurants", {
                p_type: type ?? null,
                p_taste: taste ?? null,
              });
              restaurants = d1 ?? [];
              break;
            case "search_by_restaurant_name":
              const { data: d2 } = await supabase.rpc(
                "search_by_restaurant_name",
                { p_name: name ?? null }
              );
              restaurants = d2 ?? [];
              break;
            case "search_by_menu_name":
              const { data: d3 } = await supabase.rpc("search_by_menu_name", {
                p_menu: menu ?? null,
              });
              restaurants = d3 ?? [];
              break;
          }

          if (restaurants.length === 0) return "검색된 결과가 없습니다피!";

          return restaurants
            .map(
              (r) =>
                `가게 이름: ${r.restaurant_name}, 주소: ${r.address}, 종류: ${r.type?.join(
                  ", "
                )}, 맛 특징: ${r.taste?.join(", ")}, 메뉴: ${r.menu
                  ?.map((m: any) => `${m.menu} (${m.price})`)
                  .join(", ")}`
            )
            .join("\n\n");
        },
      }),
    },
  });

  return result.toTextStreamResponse();
}
