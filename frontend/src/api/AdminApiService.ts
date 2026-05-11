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

  surveys(): Promise<{ surveys: unknown[] }> {
    return this.http.getJson<{ surveys: unknown[] }>("/api/admin/surveys");
  }

  createSurvey(input: AdminSurveyInput): Promise<{ survey: unknown }> {
    return this.http.postJson<{ survey: unknown }>("/api/admin/surveys", input);
  }

  selfHelpTopics(): Promise<{ topics: unknown[] }> {
    return this.http.getJson<{ topics: unknown[] }>("/api/admin/selfhelp/topics");
  }

  createSelfHelpTopic(input: AdminSelfHelpInput): Promise<{ topic: unknown }> {
    return this.http.postJson<{ topic: unknown }>("/api/admin/selfhelp/topics", input);
  }
}
