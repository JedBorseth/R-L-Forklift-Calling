import { pusher } from "~/lib/pusher";

export async function POST(req: Request) {
  try {
    // Read as plain text, then parse as URLSearchParams
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const socket_id = params.get("socket_id");
    const channel_name = params.get("channel_name");

    if (!socket_id || !channel_name) {
      return new Response("Missing socket_id or channel_name", { status: 400 });
    }

    // Presence data
    const presenceData = {
      user_id: crypto.randomUUID(),
      user_info: {
        name: params.get("name") || "Guest",
      },
    };

    const authResponse = pusher.authorizeChannel(
      socket_id,
      channel_name,
      presenceData
    );

    return new Response(JSON.stringify(authResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Pusher auth error:", err);
    return new Response(JSON.stringify({ error: "Auth failed" }), {
      status: 500,
    });
  }
}
