"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  ArrowLeft,
  Save,
  UploadCloud,
  FileText,
  Building2,
  CalendarDays,
  FileSignature,
  MapPin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast, Toaster } from "react-hot-toast";

// --- COMPONENT WRAPPER ---
export default function InputPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-slate-700 font-medium">Memuat Halaman...</p>
        </div>
      }
    >
      <InputForm />
    </Suspense>
  );
}

// --- FORM LOGIC ---
function InputForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  // State UI
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Menyimpan...");
  const [fetching, setFetching] = useState(false);

  // State Data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const initialForm = {
    vendor: "",
    pekerjaan: "",
    nomor_kontrak: "",
    tanggal_awal_kontrak: "",
    nominal_jaminan: 0,
    jenis_garansi: "Bank Garansi",
    nomor_garansi: "",
    bank_penerbit: "",
    tanggal_awal_garansi: "",
    tanggal_akhir_garansi: "",
    status: "Aktif",
    kategori: "Jaminan Pelaksanaan",
    file_url: "",
    lokasi: "",
  };

  const [formData, setFormData] = useState(initialForm);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // 1. Load Data (Parallel Fetching)
  useEffect(() => {
    const init = async () => {
      const userPromise = supabase.auth.getUser();

      // FIX ERROR TYPESCRIPT 2698 & 2339:
      // Kita beri tahu TS bahwa promise ini isinya bisa 'any' (objek data) atau 'null'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let dataPromise: Promise<any> = Promise.resolve(null);

      if (editId) {
        setFetching(true);
        dataPromise = fetch(`${API_URL}/letters/${editId}`).then((res) => {
          if (!res.ok) throw new Error("Gagal mengambil data");
          return res.json();
        });
      }

      try {
        const [userRes, letterData] = await Promise.all([
          userPromise,
          dataPromise,
        ]);

        if (!userRes.data.user) {
          router.push("/auth");
          return;
        }
        setUserEmail(userRes.data.user.email || "Unknown");

        if (letterData) {
          // Sekarang TS tahu letterData adalah object (any), jadi spread operator aman
          setFormData({
            ...letterData,
            tanggal_awal_kontrak: letterData.tanggal_awal_kontrak || "",
            tanggal_awal_garansi: letterData.tanggal_awal_garansi || "",
            tanggal_akhir_garansi: letterData.tanggal_akhir_garansi || "",
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("Terjadi kesalahan memuat data");
      } finally {
        setFetching(false);
      }
    };
    init();
  }, [editId, router, API_URL]);

  // 2. PROSES SIMPAN
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vendor || !formData.nomor_kontrak) {
      toast.error("Nama Vendor & Nomor Kontrak wajib diisi!");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Memulai proses...");

    try {
      let uploadedUrl = formData.file_url;

      // A. UPLOAD FILE
      if (selectedFile) {
        setLoadingText("Mengupload Dokumen...");

        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, selectedFile);

        if (uploadError)
          throw new Error(`Gagal Upload: ${uploadError.message}`);

        const { data } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);
        uploadedUrl = data.publicUrl;
      }

      // B. SIMPAN DATA
      setLoadingText("Menyimpan Database...");

      const payload = {
        ...formData,
        file_url: uploadedUrl || null,
        user_email: userEmail,
      };

      const url = editId
        ? `${API_URL}/letters/${editId}?user_email=${userEmail}`
        : `${API_URL}/letters?user_email=${userEmail}`;
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Gagal menyimpan ke server");
      }

      setLoadingText("Selesai!");
      toast.success("Berhasil Disimpan!", { id: toastId, duration: 3000 });

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1000);

      // FIX ESLINT ERROR (no-explicit-any):
      // Gunakan 'unknown' lalu cek tipe errornya
    } catch (error: unknown) {
      console.error(error);
      setLoadingText("Gagal");

      let msg = "Terjadi kesalahan";
      if (error instanceof Error) {
        msg = error.message;
      }

      toast.error(`Error: ${msg}`, { id: toastId });
      setLoading(false);
    }
  };

  if (fetching)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center animate-pulse">
          <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-blue-100 text-slate-800">
      <Toaster position="top-center" reverseOrder={false} />

      {/* NAVBAR */}
      <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            aria-label="Kembali ke Dashboard"
            className="p-2.5 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-display">
              {editId ? "Edit Data Surat" : "Registrasi Surat Baru"}
            </h1>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              SIJAGAD FORM SYSTEM
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${editId ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}
          >
            {editId ? "Mode: Perubahan Data" : "Mode: Input Baru"}
          </span>
        </div>
      </nav>

      {/* FORM WRAPPER */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-[2rem] shadow-lg border border-slate-200 overflow-hidden">
          {/* HEADER CARD */}
          <div className="px-8 md:px-12 py-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex items-center gap-4">
            <div
              className={`w-14 h-14 text-white rounded-2xl flex items-center justify-center shadow-lg ${editId ? "bg-amber-500 shadow-amber-500/20" : "bg-slate-900 shadow-slate-900/20"}`}
            >
              {editId ? <FileSignature size={28} /> : <FileText size={28} />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {editId ? "Perbarui Data Jaminan" : "Isi Data Jaminan"}
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Pastikan data fisik dan digital sesuai.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-10">
              {/* KOLOM 1 */}
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  <Building2 size={18} className="text-blue-600" /> Pihak
                  Terkait
                </h3>
                <InputGroup
                  label="Nama Vendor / Perusahaan"
                  value={formData.vendor}
                  onChange={(v) => setFormData({ ...formData, vendor: v })}
                  placeholder="PT. Contoh Karya Sejahtera"
                />
                <InputGroup
                  label="Bank / Asuransi Penerbit"
                  value={formData.bank_penerbit}
                  onChange={(v) =>
                    setFormData({ ...formData, bank_penerbit: v })
                  }
                  placeholder="PT. Bank Mandiri (Persero) Tbk."
                />
                <InputGroup
                  label="Nama Pekerjaan (Judul Kontrak)"
                  type="textarea"
                  value={formData.pekerjaan}
                  onChange={(v) => setFormData({ ...formData, pekerjaan: v })}
                  placeholder="Pengadaan dan Pemasangan..."
                />
              </div>

              {/* KOLOM 2 */}
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  <FileSignature size={18} className="text-blue-600" /> Detail
                  Jaminan
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup
                    label="Nomor Kontrak"
                    value={formData.nomor_kontrak}
                    onChange={(v) =>
                      setFormData({ ...formData, nomor_kontrak: v })
                    }
                  />
                  <InputGroup
                    label="Nomor Garansi"
                    value={formData.nomor_garansi}
                    onChange={(v) =>
                      setFormData({ ...formData, nomor_garansi: v })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup
                    label="Kategori"
                    type="select"
                    value={formData.kategori}
                    onChange={(v) => setFormData({ ...formData, kategori: v })}
                    options={["Jaminan Pelaksanaan", "Jaminan Pemeliharaan"]}
                  />
                  <InputGroup
                    label="Nominal (Rp)"
                    value={formData.nominal_jaminan}
                    onChange={(v) =>
                      setFormData({ ...formData, nominal_jaminan: Number(v) })
                    }
                    isCurrency
                  />
                </div>
                <InputGroup
                  label="Lokasi Fisik Arsip"
                  value={formData.lokasi || ""}
                  onChange={(v) => setFormData({ ...formData, lokasi: v })}
                  placeholder="Cth: Lemari A - Rak 2"
                  icon={
                    <MapPin
                      size={16}
                      className="text-slate-500 absolute right-4 top-10"
                    />
                  }
                />
              </div>

              {/* KOLOM 3 */}
              <div className="space-y-6">
                <h3 className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
                  <CalendarDays size={18} className="text-blue-600" /> Waktu &
                  Dokumen
                </h3>
                <InputGroup
                  label="Tanggal Awal Kontrak"
                  type="date"
                  value={formData.tanggal_awal_kontrak}
                  onChange={(v) =>
                    setFormData({ ...formData, tanggal_awal_kontrak: v })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup
                    label="Tgl Awal Garansi"
                    type="date"
                    value={formData.tanggal_awal_garansi}
                    onChange={(v) =>
                      setFormData({ ...formData, tanggal_awal_garansi: v })
                    }
                  />
                  <InputGroup
                    label="Tgl Akhir (Expired)"
                    type="date"
                    value={formData.tanggal_akhir_garansi}
                    onChange={(v) =>
                      setFormData({ ...formData, tanggal_akhir_garansi: v })
                    }
                  />
                </div>

                {/* UPLOAD */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">
                    Upload Dokumen (PDF)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:bg-slate-50 hover:border-blue-400"}`}
                    >
                      <UploadCloud
                        size={32}
                        className={
                          selectedFile
                            ? "text-blue-600"
                            : "text-slate-400 group-hover:text-blue-500 transition-colors"
                        }
                      />
                      <p className="text-sm font-bold mt-3 text-slate-600 text-center px-4 truncate w-full">
                        {selectedFile
                          ? selectedFile.name
                          : "Klik untuk Upload File"}
                      </p>
                      {formData.file_url && !selectedFile && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-green-700 font-bold bg-green-100 px-3 py-1 rounded-full border border-green-200">
                          <AlertCircle size={12} /> File Lama Tersimpan
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTONS */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex justify-end gap-4">
              <Link href="/dashboard">
                <button
                  type="button"
                  className="px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all hover:shadow-sm"
                >
                  Batal
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`px-10 py-4 text-white rounded-2xl font-bold shadow-xl flex items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98] ${editId ? "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600" : "bg-slate-900 shadow-slate-900/20 hover:bg-slate-800"}`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {loadingText}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {editId ? "Simpan Perubahan" : "Simpan Data"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENT (OPTIMIZED) ---
interface InputGroupProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: "text" | "date" | "number" | "select" | "textarea";
  placeholder?: string;
  isCurrency?: boolean;
  options?: string[];
  icon?: React.ReactNode;
}
function InputGroup({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  isCurrency = false,
  options = [],
  icon,
}: InputGroupProps) {
  const displayValue =
    isCurrency && typeof value === "number"
      ? new Intl.NumberFormat("id-ID").format(value)
      : value;
  // Perbaiki kontras placeholder: text-slate-500 (bukan 400)
  const baseClasses =
    "w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-medium text-slate-800 placeholder:text-slate-500 focus:bg-white";

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-slate-600 uppercase mb-2 ml-1 tracking-wider">
        {label}
      </label>
      {type === "select" ? (
        <div className="relative">
          <select
            className={`${baseClasses} appearance-none cursor-pointer`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
      ) : type === "textarea" ? (
        <textarea
          rows={3}
          className={`${baseClasses} resize-none`}
          placeholder={placeholder}
          value={displayValue || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <>
          <input
            type={type}
            className={baseClasses}
            placeholder={placeholder}
            value={displayValue || ""}
            onChange={(e) =>
              onChange(
                isCurrency
                  ? e.target.value.replace(/[^0-9]/g, "")
                  : e.target.value,
              )
            }
          />
          {icon && icon}
        </>
      )}
    </div>
  );
}
