import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Bangunkan Supabase
    await supabase.from("letters").select("id").limit(1);

    // 2. Bangunkan Backend Python di Vercel
    const backendUrl = "https://sijagadbackend.vercel.app/";
    await fetch(backendUrl);

    return NextResponse.json({
      status: "Berjaya",
      message: "Supabase & Vercel Backend sudah bangun! ⚡",
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    // <-- Tambahkan underscore di sini
    return NextResponse.json(
      { status: "Gagal", message: "Terjadi kesalahan pada sistem keep-alive" },
      { status: 500 },
    );
  }
}
