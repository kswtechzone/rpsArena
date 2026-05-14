// Socket.IO API route for Next.js App Router
// Uses a custom server approach via next.config.js

import { NextResponse } from 'next/server';

export async function GET(req) {
  // The actual socket is initialized in server.js
  // This route just confirms the socket path
  return NextResponse.json({ status: 'Socket server running' });
}
