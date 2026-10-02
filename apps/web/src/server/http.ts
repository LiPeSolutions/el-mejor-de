import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Runs a route handler body and turns errors into JSON responses. */
export async function handle(run: () => unknown): Promise<NextResponse> {
  try {
    return NextResponse.json(await run(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ error: "invalid-request" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
