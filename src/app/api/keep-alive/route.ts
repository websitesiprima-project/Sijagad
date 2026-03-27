import { NextResponse } from "next/server";
// Pastikan laluan (path) import ini betul mengikut kedudukan fail supabase anda
import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic"; // Elakkan Next.js daripada meletakkan cache pada fail ini

export async function GET() {
  try {
    // Buat carian (query) paling ringkas untuk memastikan pangkalan data aktif
    // Kita hanya panggil 1 data sahaja supaya tidak membebankan server
    const { data, error } = await supabase
      .from("letters") // Tukar jika anda mahu guna jadual (table) lain
      .select("id")
      .limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: "Berjaya",
      message: "Supabase telah berjaga! 🚀",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "Gagal", message: error.message },
      { status: 500 },
    );
  }
}
