
export interface UserProfile {
  name: string;
  mobile: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO format
  description: string;
}

export interface WeeklyData {
  day: string;
  amount: number;
}

export interface MonthlySummaryData {
  month: string;
  total: number;
  savings: number;
}

export interface AppSettings {
  weeklyLimit: number;
  monthlyBudget: number;
  phoneNumber: string;
}

export enum AppTab {
  DASHBOARD = 'dashboard',
  HISTORY = 'history',
  SCANNER = 'scanner',
  EDITOR = 'editor',
  SUMMARY = 'summary',
  SETTINGS = 'settings'
}
