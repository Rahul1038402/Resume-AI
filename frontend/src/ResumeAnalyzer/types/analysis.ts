export interface Project {
  name: string;
  skills: string[];
  skills_count: number;
  metrics: string[];
  metrics_count: number;
  has_quantifiable_results: boolean;
  effectiveness_indicators: any[];
  relevance_score: number;
  description: string;
  skill_relevance: Record<string, number>;
}

export interface ProjectRelevance {
  skills: string[];
  matched_skills: string[];
  relevance_score: number;
  relevance_label: "Highly Relevant" | "Somewhat Relevant" | "Not Relevant";
}

export interface JobMatch {
  job_title: string;
  matched_skills: string[];
  missing_skills: string[];
  extra_skills: string[];
  skill_match_score: number;
  avg_project_relevance: number;
  overall_relevance_score: number;
  overall_fit: "Strong Fit" | "Moderate Fit" | "Weak Fit";
  project_relevance: Record<string, ProjectRelevance>;
}

export interface AnalysisResult {
  score: number;
  target_job: string;
  matched_skills: Record<string, number>;
  missing_skills: Record<string, number>;
  projects: Project[];
  relevant_projects: Array<{
    name: string;
    skills: string[];
    metrics: string[];
    relevance_score: number;
  }>;
  recommendations: string[];
  analysis: {
    total_skills_found: number;
    total_projects: number;
    relevant_projects: number;
    skills_with_metrics: number;
    achieved_score: number;
    project_bonus: number;
    diversity_bonus: number;
  };
  skills?: string[];
  projects_with_skills?: Record<string, string[]>;
  quantifiable_impacts?: Record<string, string[]>;
  job_match?: JobMatch;
  /** What the daily scan quota looks like after this request. */
  rate_limit?: {
    limit: number;
    used: number;
    remaining: number;
    resets_in_seconds: number;
    resets_at?: string;
  };
}

export interface ResumeResultsProps {
  result: AnalysisResult | null;
  loading: boolean;
  error?: string | null;
}

