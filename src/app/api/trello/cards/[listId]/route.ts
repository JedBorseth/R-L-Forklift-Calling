import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      listId: string;
    }>;
  }
) {
  const slug = await params;
  console.log("Fetching cards for listId:", slug.listId || "undefined");

  if (!slug.listId) {
    return NextResponse.json({ error: "Missing listId" }, { status: 400 });
  }

  try {
    const url = `https://api.trello.com/1/lists/${slug.listId}/cards?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Trello cards" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
