import type { CampusMarkerCategory, MarkerDto } from "./CampusApiService.js";
import type { ApiClient } from "./ApiClient.js";

export type AdminMarkerInput = Partial<MarkerDto> & {
  category: CampusMarkerCategory;
  title: string;
  x: number;
  y: number;
};

export type AdminSurveyInput = {
  key: string;
  title: string;
  description: string;
  sharedOptionLabels?: string[];
  scoreBands?: unknown[];
  questions: Array<{ text: string; min: number; max: number; reverseScore?: boolean }>;
  isActive?: boolean;
  sortOrder?: number;
};

export type AdminSurveyQuestionDto = {
  id: string;
  text: string;
  min: number;
  max: number;
  reverseScore: boolean;
  sortOrder: number;
};

export type AdminSurveyDto = {
  id: string;
  key: string;
  title: string;
  description: string;
  sharedOptionLabels: unknown;
  scoreBands: unknown;
  version: number;
  isActive: boolean;
  sortOrder: number;
  questions: AdminSurveyQuestionDto[];
};

export type UploadKind = "campus" | "selfhelp" | "map";

export type UploadInput = {
  kind: UploadKind;
  filename: string;
  dataUrl: string;
};

export type AdminSelfHelpInput = {
  slug: string;
  title: string;
  summary: string;
  disclaimer: string;
  categories?: string[];
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
  isActive?: boolean;
  sortOrder?: number;
};

export type AdminSelfHelpSectionDto = {
  id: string;
  heading: string;
  paragraphs: unknown;
  bullets?: unknown;
  sortOrder: number;
};

export type AdminSelfHelpTopicDto = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  disclaimer: string;
  categories: unknown;
  isActive: boolean;
  sortOrder: number;
  sections: AdminSelfHelpSectionDto[];
};

export class AdminApiService {
  constructor(private readonly http: ApiClient) {}

  markers(): Promise<{ markers: MarkerDto[] }> {
    return this.http.getJson<{ markers: MarkerDto[] }>("/api/admin/campus/markers");
  }

  createMarker(input: AdminMarkerInput): Promise<{ marker: MarkerDto }> {
    return this.http.postJson<{ marker: MarkerDto }>("/api/admin/campus/markers", input);
  }

  updateMarker(id: string, input: Partial<AdminMarkerInput>): Promise<{ marker: MarkerDto }> {
    return this.http.patchJson<{ marker: MarkerDto }>(`/api/admin/campus/markers/${id}`, input);
  }

  deleteMarker(id: string): Promise<{ marker: MarkerDto }> {
    return this.http.deleteJson<{ marker: MarkerDto }>(`/api/admin/campus/markers/${id}`);
  }

  upload(input: UploadInput): Promise<{ url: string }> {
    return this.http.postJson<{ url: string }>("/api/admin/uploads", input);
  }

  setCampusPlan(imageUrl: string, title?: string): Promise<{ plan: { imageUrl: string } }> {
    return this.http.postJson<{ plan: { imageUrl: string } }>("/api/admin/campus/plan-image", {
      imageUrl,
      ...(title !== undefined ? { title } : {}),
    });
  }

  surveys(): Promise<{ surveys: AdminSurveyDto[] }> {
    return this.http.getJson<{ surveys: AdminSurveyDto[] }>("/api/admin/surveys");
  }

  createSurvey(input: AdminSurveyInput): Promise<{ survey: AdminSurveyDto }> {
    return this.http.postJson<{ survey: AdminSurveyDto }>("/api/admin/surveys", input);
  }

  updateSurvey(id: string, input: Partial<AdminSurveyInput>): Promise<{ survey: AdminSurveyDto }> {
    return this.http.patchJson<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}`, input);
  }

  deleteSurvey(id: string): Promise<{ survey: AdminSurveyDto }> {
    return this.http.deleteJson<{ survey: AdminSurveyDto }>(`/api/admin/surveys/${id}`);
  }

  selfHelpTopics(): Promise<{ topics: AdminSelfHelpTopicDto[] }> {
    return this.http.getJson<{ topics: AdminSelfHelpTopicDto[] }>("/api/admin/selfhelp/topics");
  }

  createSelfHelpTopic(input: AdminSelfHelpInput): Promise<{ topic: AdminSelfHelpTopicDto }> {
    return this.http.postJson<{ topic: AdminSelfHelpTopicDto }>("/api/admin/selfhelp/topics", input);
  }

  updateSelfHelpTopic(id: string, input: Partial<AdminSelfHelpInput>): Promise<{ topic: AdminSelfHelpTopicDto }> {
    return this.http.patchJson<{ topic: AdminSelfHelpTopicDto }>(`/api/admin/selfhelp/topics/${id}`, input);
  }

  deleteSelfHelpTopic(id: string): Promise<{ topic: AdminSelfHelpTopicDto }> {
    return this.http.deleteJson<{ topic: AdminSelfHelpTopicDto }>(`/api/admin/selfhelp/topics/${id}`);
  }
}
