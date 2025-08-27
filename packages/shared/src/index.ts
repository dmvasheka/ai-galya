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
export type BatchDateInput = {
    type: "batch";
    birthYear: string; // "1980" or "1980-1982"
    splitMonth?: boolean; // if true, split each month into two halves
    language?: string;
    theme?: "classic" | "modern";
    uploadToDrive?: boolean;
};

export type BatchForecastResult = {
    totalGenerated: number;
    successful: number;
    failed: number;
    results: ForecastResult[];
    errors: string[];
};
export type ForecastResult = {
    id: string;
    title: string;
    summary: string;
    sections: { heading: string; content: string }[];
    pdfUrl: string;
    driveFileId?: string;
};