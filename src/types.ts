import { Timestamp } from 'firebase/firestore';

export interface Issue {
  severity: 'high' | 'medium' | 'low';
  type: string;
  line: number;
  description: string;
  fix: string;
}

export interface Scan {
  id: string;
  userId: string;
  spaceId: string;
  projectName: string;
  fileName?: string;
  code: string;
  status: 'completed' | 'failed' | 'scanning';
  securityScore: number;
  issuesCount: number;
  issues: Issue[];
  createdAt: Timestamp;
  time?: string;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  userId?: string;
  ownerId: string;
  members: Record<string, string>;
  createdAt: Timestamp;
}

export interface Report {
  id: string;
  spaceId: string;
  userId: string;
  title: string;
  summary: string;
  technicalAnalysis: {
    projectName: string;
    fileName: string;
    summary: string;
    impact: string;
    findings: Finding[];
  }[];
  metrics: {
    totalScans: number;
    averageSecurityScore: number;
    criticalIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  diagram: string;
  createdAt: Timestamp;
  time?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  currentSpaceId?: string;
  spaceIds?: string[];
}

export interface GithubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

export interface Finding {
  type: string;
  severity: 'high' | 'medium' | 'low';
  line: number;
  explanation: string;
  fix?: string;
}
