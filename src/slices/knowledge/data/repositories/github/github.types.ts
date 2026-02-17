// @scope:api
// @slice:knowledge
// @layer:data
// @type:types

/**
 * GitHub tree API response item
 */
export interface IGitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

/**
 * GitHub tree API response
 */
export interface IGitHubTreeResponse {
  sha: string;
  url: string;
  tree: IGitHubTreeItem[];
  truncated: boolean;
}

/**
 * Cache entry with TTL
 */
export interface ICacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * GitHub loader configuration
 */
export interface IGitHubLoaderConfig {
  /** Repository in format 'owner/repo' */
  repo: string;
  /** Branch to fetch from */
  branch: string;
  /** Optional GitHub token for higher rate limits */
  token?: string;
  /** Cache TTL in seconds */
  cacheTtl: number;
}

/**
 * Scanned document from GitHub
 */
export interface IGitHubScannedDocument {
  /** Path relative to repo root */
  path: string;
  /** Document name (from frontmatter or filename) */
  name: string;
  /** Document description */
  description: string;
  /** Category (from directory structure) */
  category: string;
  /** Tags extracted from frontmatter and path */
  tags: string[];
  /** Keywords for search */
  keywords: string[];
  /** SHA for cache invalidation */
  sha: string;
}
