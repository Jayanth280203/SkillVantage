// Enums must be standard enums, not const enums
export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  JOBS = 'JOBS',
  CHAT = 'CHAT',
  RESUME_ANALYZER = 'RESUME_ANALYZER'
}

export enum SkillCategory {
  TECHNICAL = 'Technical',
  SOFT = 'Soft Skills',
  TOOLS = 'Tools & Platforms',
  DOMAIN = 'Domain Knowledge'
}

export interface SkillPoint {
  name: string;
  userLevel: number; // 0-100
  marketDemand: number; // 0-100
  category: string;
  gapAnalysis: string;
}

export interface StudentProfile {
  id: string;
  department?: string;
  rawSkills: string[];
  matchScore: number; // 0-100
  missingSkills: string[];
}

export interface RoleDefinition {
  title: string;
  requiredSkills: string[];
}

export interface DepartmentMapping {
  department: string;
  possibleRoles: RoleDefinition[];
}

export interface CleaningReport {
  totalRows: number;
  validRows: number;
  missingValuesFixed: number;
  uniqueSkillsFound: number;
  processingTimeMs: number;
}

export interface AnalysisResult {
  role: string;
  summary: string;
  skills: SkillPoint[]; // Aggregated skills with market data
  departmentMappings: DepartmentMapping[]; // Map Dept -> Roles -> Skills
  missingSkills: string[]; // Global missing skills (dataset wide)
  clustering: {
    category: string;
    skills: string[];
  }[];
  cleaningReport?: CleaningReport;
  students?: StudentProfile[]; // Individual student data
}

export interface ResumeAnalysisResult {
  atsScore: number;
  detectedRole: string;
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface JobListing {
  title: string;
  company: string;
  location?: string;
  url: string;
  snippet: string;
}