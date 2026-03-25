interface FetchOpenAlexAPIOptions {
  filter?: string;
  search?: string;
  sort?: string;
  select?: string;
  sample?: number;
  group_by?: string;
  page?: number;
  per_page?: number;
  cursor?: string;
  api_key?: string;
}

export type { FetchOpenAlexAPIOptions };
