"use client";
import React, { useState } from "react";
import DateOrRange from "../components/DateOrRange";
import PdfPreview from "../components/PdfPreview";

export default function Page() {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [meta, setMeta] = useState<any>(null);

  async function submit(payload: any) {
    setLoading(true); setError(null); setPdfUrl(undefined);
    try {
      const r = await fetch(process.env.NEXT_PUBLIC_API_URL + "/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setMeta(data);
      setPdfUrl(data.pdfUrl);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate forecast");
    } finally { setLoading(false); }
  }

  async function deleteForecast() {
    if (!meta?.id) return;

    setDeleting(true);
    setError(null);

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/forecast/forecast/${meta.id}` + 
                  (meta.driveFileId ? `?driveId=${meta.driveFileId}` : '');

      const r = await fetch(url, {
        method: "DELETE"
      });

      if (!r.ok) throw new Error(await r.text());

      // Clear the current forecast data
      setPdfUrl(undefined);
      setMeta(null);

    } catch (e: any) {
      setError(e.message ?? "Failed to delete forecast");
    } finally { 
      setDeleting(false); 
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Numerology Forecast</h1>
      <p className="text-slate-600 mb-6">Generate a personalized forecast and export to PDF. Optionally upload to Google Drive.</p>

      <DateOrRange onSubmit={submit} />

      {loading && <div className="mt-4">Generating… please wait.</div>}
      {deleting && <div className="mt-4">Deleting forecast… please wait.</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}

      {meta?.driveFileId && (
        <div className="mt-4 text-green-700 text-sm">Uploaded to Drive. File ID: {meta.driveFileId}</div>
      )}

      {pdfUrl && meta && (
        <div className="mt-4 flex gap-3 items-center">
          <button
            onClick={deleteForecast}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm transition-colors"
          >
            {deleting ? "Deleting..." : "Delete Forecast"}
          </button>
          <span className="text-sm text-slate-500">
            Not satisfied with the result? You can delete it.
          </span>
        </div>
      )}

      <PdfPreview url={pdfUrl} />
    </main>
  );
}
