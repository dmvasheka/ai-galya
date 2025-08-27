export type DateInput = {
    type: "single" | "range";
    date?: string;            // YYYY-MM-DD если single
    start?: string;           // YYYY-MM-DD если range
    end?: string;             // YYYY-MM-DD если range
    forecastPeriod?: string;  // "August 2025" | "2025" | "01/09/2025"
    language?: string;
    theme?: string;
    uploadToDrive?: boolean;
};

export type ForecastResult = {
    id: string;
    title: string;
    summary: string;
    sections: { heading: string; content: string }[];
    pdfUrl: string;
    driveFileId?: string;
};