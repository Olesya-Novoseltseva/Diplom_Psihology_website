import type { ApiClient } from "./ApiClient.js";

export type HelpTopicDto = {
  slug: string;
  title: string;
  summary: string;
  disclaimer: string;
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
};

export class SelfHelpApiService {
  constructor(private readonly http: ApiClient) {}

  list(): Promise<{ topics: Array<{ slug: string; title: string; summary: string }> }> {
    return this.http.getJson<{ topics: Array<{ slug: string; title: string; summary: string }> }>("/api/selfhelp/topics");
  }

  bySlug(slug: string): Promise<{ topic: HelpTopicDto }> {
    return this.http.getJson<{ topic: HelpTopicDto }>(`/api/selfhelp/topics/${encodeURIComponent(slug)}`);
  }
}
