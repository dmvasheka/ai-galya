"use client";
import React from "react";

export default function PdfPreview({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <div className="mt-6">
      <div className="text-sm text-slate-600 mb-2">Preview</div>
      <iframe src={url} className="w-full h-[720px] border rounded-xl"></iframe>
    </div>
  );
}
