import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'unknown';
    const currentTime = Date.now();

    const blockKey = `rate_block:${userId}`;
    const blockUntil = await redis.get<number>(blockKey);

    if (blockUntil && currentTime < blockUntil) {
        const remainingTime = Math.ceil((blockUntil - currentTime) / 1000);
        return new NextResponse(
            JSON.stringify({ isBlocked: true, remainingTime: remainingTime }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    return new NextResponse(
        JSON.stringify({ isBlocked: false, remainingTime: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}
