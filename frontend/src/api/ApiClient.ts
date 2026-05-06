const TOKEN_KEY = "wellness_token";

export type ApiIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly issues?: ApiIssue[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorJson = {
  code?: string;
  message?: string;
  issues?: Array<{ path?: string; message?: string }>;
};

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private getAccessToken: () => string | null = () => localStorage.getItem(TOKEN_KEY),
  ) {}

  setTokenAccessor(getter: () => string | null): void {
    this.getAccessToken = getter;
  }

  saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  private buildHeaders(init?: HeadersInit): Headers {
    const headers = new Headers(init);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const token = this.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  }

  private async parse<T>(res: Response): Promise<T> {
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!res.ok) {
      const body = data as ErrorJson | null;
      const message = typeof body?.message === "string" ? body.message : res.statusText;
      const code = typeof body?.code === "string" ? body.code : undefined;
      const issues =
        Array.isArray(body?.issues) && body!.issues!.length > 0
          ? body!.issues!.map((i) => ({
              path: typeof i.path === "string" ? i.path : "",
              message: typeof i.message === "string" ? i.message : "",
            }))
          : undefined;
      throw new ApiError(message, res.status, code, issues);
    }

    return data as T;
  }

  async postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    return this.parse<T>(res);
  }

  async getJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.buildHeaders(),
    });
    return this.parse<T>(res);
  }
}
