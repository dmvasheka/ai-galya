export type DateInput = {
    type: "single" | "range";
    date?: string;            // YYYY-MM-DD
    start?: string;           // YYYY-MM-DD
    end?: string;             // YYYY-MM-DD
    locale?: string;          // e.g. "uk-UA", "ru-RU", "en-US"
    language?: string;        // output language preference
    theme?: "classic" | "modern";
    uploadToDrive?: boolean;
};

export type ForecastResult = {
    title: string;
    summary: string;
    sections: Array<{ heading: string; content: string }>;
    pdfUrl?: string;          // signed URL from backend
    driveFileId?: string;     // if uploaded to Drive
};