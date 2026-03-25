import { NextRequest, NextResponse } from 'next/server'
import redis from '@/lib/redis'

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ clientId: string }> } 
) {
  const { clientId } = await params;
  
  // Haal eventueel de huidige cover op uit Redis
  const cover = await redis.get(`client:${clientId}:cover`);
  return NextResponse.json({ cover: cover || null }); 
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ clientId: string }> } // Ook hier een Promise!
) {
  const { clientId } = await params; // Eerst awaiten
  const { photoUrl } = await req.json();
  
  await redis.set(`client:${clientId}:cover`, photoUrl);
  return NextResponse.json({ success: true });
}