// app/api/pusher/trigger/route.ts
import Pusher from "pusher";
import { NextResponse } from "next/server";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const eventName = body.event || "signal";
    const payload = body.payload || {};

    await pusher.trigger("presence-walkie", eventName, body.payload ?? {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
