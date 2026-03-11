"use client";

import React from "react";
import { Send } from "lucide-react";

export default function TelegramButton() {
  const handleTelegramClick = () => {
    window.open(
      "https://t.me/Sijagad_pln_bot",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <button
      onClick={handleTelegramClick}
      className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm flex-1 lg:flex-none"
      title="Buka Telegram"
    >
      <Send size={20} />
      <span className="hidden xl:inline font-bold text-xs">TELEGRAM</span>
    </button>
  );
}
