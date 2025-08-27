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
    setLoading(true); setError(null); setPdfUrl(undefined); setMeta(null);
    try {
      const endpoint = payload.type === "batch" ? "/forecast/batch" : "/forecast";
      const r = await fetch(process.env.NEXT_PUBLIC_API_URL + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setMeta(data);

      // For batch results, show the first successful result or summary
      if (payload.type === "batch") {
        if (data.results && data.results.length > 0) {
          setPdfUrl(data.results[0].pdfUrl);
        }
      } else {
        setPdfUrl(data.pdfUrl);
      }
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
    <div className="relative">
      {/* Full-page loading overlay */}
      {(loading || deleting) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800">
                  {loading ? "Generating Forecast" : "Deleting Forecast"}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Please wait...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">Numerology Forecast</h1>
        <p className="text-slate-600 mb-6">Generate a personalized forecast and export to PDF. Optionally upload to Google Drive.</p>

        <DateOrRange onSubmit={submit} />

        {error && <div className="mt-4 text-red-600">{error}</div>}

        {meta?.driveFileId && (
          <div className="mt-4 text-green-700 text-sm">Uploaded to Drive. File ID: {meta.driveFileId}</div>
        )}

        {meta?.totalGenerated && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Batch Generation Results</h3>
            <div className="space-y-1 text-sm">
              <div>Total forecasts: {meta.totalGenerated}</div>
              <div className="text-green-600">Successful: {meta.successful}</div>
              {meta.failed > 0 && <div className="text-red-600">Failed: {meta.failed}</div>}
              {meta.errors && meta.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-600">View errors</summary>
                  <div className="mt-2 space-y-1">
                    {meta.errors.map((error: string, index: number) => (
                      <div key={index} className="text-xs text-red-500">{error}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {pdfUrl && meta && (
          <div className="mt-4 flex gap-3 items-center">
            <button
              onClick={deleteForecast}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm transition-colors"
            >
              Delete Forecast
            </button>
            <span className="text-sm text-slate-500">
              Not satisfied with the result? You can delete it.
            </span>
          </div>
        )}

        <PdfPreview url={pdfUrl} />
      </main>
    </div>
  );
}
