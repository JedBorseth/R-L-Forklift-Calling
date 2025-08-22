import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = `https://api.trello.com/1/boards/63390b8081b969008b509f36/lists?key=${process.env.TRELLO_KEY}&token=${process.env.TRELLO_TOKEN}`;

    const res = await fetch(url, { cache: "no-store" }); // disable caching
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Trello lists" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", details: error },
      { status: 500 }
    );
  }
}
