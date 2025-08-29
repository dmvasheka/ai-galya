export type DateInput = {
    type: "single" | "range" | "dateRange";
    date?: string;            // YYYY-MM-DD если single
    start?: string;           // YYYY-MM-DD если range или dateRange
    end?: string;             // YYYY-MM-DD если range или dateRange
    forecastPeriod?: string;  // "August 2025" | "2025" | "01/09/2025" | "autumn" | "winter" | "spring" | "summer" | "September,October" | "Q1" | "Q2" | "Q3" | "Q4"
    language?: string;
    theme?: string;
    uploadToDrive?: boolean;
};

export type BatchDateInput = {
    type: "batch";
    birthYear: string; // "1980" or "1980-1982"
    splitMonth?: boolean; // if true, split each month into two halves
    targetPeriod?: string; // "August 2025" | "autumn 2025" | "September,October 2025" | "Q1 2025"
    language?: string;
    theme?: "classic" | "modern";
    uploadToDrive?: boolean;
};

export type SeasonType = "spring" | "summer" | "autumn" | "winter";
export type QuarterType = "Q1" | "Q2" | "Q3" | "Q4";

export type PeriodType = {
    type: "month" | "months" | "season" | "quarter" | "year";
    value: string | string[] | SeasonType | QuarterType | number;
    year?: number;
};

export type BatchForecastResult = {
    totalGenerated: number;
    successful: number;
    failed: number;
    results: ForecastResult[];
    errors: string[];
};

export type BatchProgressUpdate = {
    sessionId: string;
    totalTasks: number;
    completedTasks: number;
    currentTask: string;
    estimatedTimeRemaining: number; // in seconds
    averageTaskTime: number; // in seconds
    startTime: number;
    progress: number; // percentage 0-100
};

export type ForecastResult = {
    id: string;
    title: string;
    summary: string;
    sections: Array<{ heading: string; content: string }>;
    pdfUrl?: string;          // signed URL from backend
    driveFileId?: string;     // if uploaded to Drive
};

export type HtmlDataType = string | {
    start: string;
    end: string;
    period?: string;
};
