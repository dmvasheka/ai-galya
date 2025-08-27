"use client";
import React, { useState } from "react";

export type Input = {
  type: "single" | "range" | "batch";
  date?: string;
  start?: string;
  end?: string;
  birthYear?: string;
  splitMonth?: boolean;
  language?: string;
  theme?: "classic" | "modern";
  uploadToDrive?: boolean;
};

export default function DateOrRange({ onSubmit }: { onSubmit: (v: Input) => void }) {
  const [type, setType] = useState<Input["type"]>("single");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [splitMonth, setSplitMonth] = useState(false);
  const [language, setLanguage] = useState("en");
  const [theme, setTheme] = useState<Input["theme"]>("modern");
  const [upload, setUpload] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded-2xl border ${type === "single" ? "bg-black text-white" : "bg-white"}`} onClick={() => setType("single")}>Single date</button>
        <button className={`px-3 py-2 rounded-2xl border ${type === "range" ? "bg-black text-white" : "bg-white"}`} onClick={() => setType("range")}>Range</button>
        <button className={`px-3 py-2 rounded-2xl border ${type === "batch" ? "bg-black text-white" : "bg-white"}`} onClick={() => setType("batch")}>Batch</button>
      </div>

      {type === "single" ? (
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-xl px-3 py-2 w-full" />
      ) : type === "range" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="border rounded-xl px-3 py-2 w-full" placeholder="Start date" />
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="border rounded-xl px-3 py-2 w-full" placeholder="End date" />
        </div>
      ) : (
        <div className="space-y-3">
          <input 
            type="text" 
            value={birthYear} 
            onChange={e => setBirthYear(e.target.value)} 
            placeholder="Birth year (e.g., 1980 or 1980-1982)"
            className="border rounded-xl px-3 py-2 w-full" 
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={splitMonth} onChange={e => setSplitMonth(e.target.checked)} />
            Split each month in half (generates 24 forecasts per year instead of 12)
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select value={language} onChange={e => setLanguage(e.target.value)} className="border rounded-xl px-3 py-2">
          <option value="en">English</option>
          <option value="uk">Українська</option>
          <option value="ru">Русский</option>
          <option value="pl">Polski</option>
        </select>
        <select value={theme} onChange={e => setTheme(e.target.value as any)} className="border rounded-xl px-3 py-2">
          <option value="modern">Modern theme</option>
          <option value="classic">Classic theme</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={upload} onChange={e => setUpload(e.target.checked)} /> Upload to Google Drive
        </label>
      </div>

      <button
        className="px-4 py-2 rounded-2xl bg-indigo-600 text-white shadow"
        onClick={() => onSubmit({ 
          type, 
          date, 
          start, 
          end, 
          birthYear, 
          splitMonth, 
          language, 
          theme, 
          uploadToDrive: upload 
        })}
      >
        {type === "batch" ? "Generate batch forecasts" : "Generate forecast"}
      </button>
    </div>
  );
}
