// @scope:api
// @slice:knowledge
// @layer:data
// @type:types

/**
 * Documentation repository types
 *
 * Simplified types that return markdown documentation from docs/ folder.
 * No hardcoded guidelines or examples - everything comes from actual docs.
 */

export interface IDocumentMetadata {
  name: string;
  description: string;
  category?: string;
  tags?: string[];
}

/**
 * Slice architecture data - returns comprehensive tutorial and checklist
 */
export interface ISliceArchitectureData {
  frameworkName: string;
  sliceName: string;
  documentation: {
    tutorial: string; // Full markdown content from first-slice.md
    checklist: string; // Full markdown content from backend/frontend-checklist.md
  };
  availableDocs: Array<{
    name: string;
    description: string;
    path: string; // Actual file path in docs/ folder
  }>;
}

/**
 * Complete slice knowledge - includes all architectural pattern docs
 */
export interface ICompleteSliceKnowledgeData extends ISliceArchitectureData {
  documents: Record<string, string>; // Pattern name -> full markdown content
}

/**
 * Framework architecture data - returns overview and structural docs
 */
export interface IFrameworkArchitectureData {
  frameworkName: string;
  documentation: {
    overview: string; // Full markdown content from overview.md
    whenToUse: string; // Full markdown content from when-to-use.md
    checklist: string; // Full markdown content from backend/frontend-checklist.md
  };
}
