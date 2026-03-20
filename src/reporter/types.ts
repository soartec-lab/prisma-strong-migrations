export interface ReportItem {
  ruleName: string;
  severity: "error" | "warning";
  migrationPath: string;
  line: number;
  message: string;
  suggestion: string;
}

export interface JsonReport {
  errors: ReportItem[];
  warnings: ReportItem[];
  totalErrors: number;
  totalWarnings: number;
}
