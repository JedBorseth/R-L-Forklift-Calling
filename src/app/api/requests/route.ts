import { NextResponse } from "next/server";
import { turso } from "~/lib/db";
import { pusher } from "~/lib/pusher";

// This is a very simple API and should probably be changed if this app were to be used in production.
// It does not handle authentication, rate limiting, or any other security measures.

export async function GET() {
  try {
    const result = await turso.execute(
      `SELECT * FROM requests ORDER BY dateAdded DESC`
    );

    // Convert to array of objects
    const data = result.rows.map((row) => {
      const obj: Record<string, string> = {};
      result.columns.forEach((col, i) => {
        const value = row[i];
        if (value instanceof ArrayBuffer) {
          obj[col] = Buffer.from(value).toString("base64");
        } else {
          obj[col] = value as string;
        }
      });
      return obj;
    });

    console.log("Fetched requests:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { username, request, machine } = body;

    if (!username || !request || !machine) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const insertResult = await turso.execute({
      sql: `
        INSERT INTO requests (username, request, machine)
        VALUES (?, ?, ?)
      `,
      args: [username, request, machine],
    });

    const newRow = {
      id: Number(insertResult.lastInsertRowid),
      username,
      request,
      machine,
      dateAdded: new Date().toISOString(),
    };

    // Trigger realtime event
    await pusher.trigger("requests", "new-request", newRow);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error inserting request:", error);
    return NextResponse.json(
      { error: "Failed to insert request" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing request id" },
        { status: 400 }
      );
    }

    await turso.execute({
      sql: `DELETE FROM requests WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    );
  }
}
