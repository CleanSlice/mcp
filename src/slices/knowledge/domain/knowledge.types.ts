// @scope:api
// @slice:knowledge
// @layer:domain
// @type:types

/**
 * Available framework types
 */
export enum FrameworkTypes {
  NestJS = 'nestjs',
  Nuxt = 'nuxt',
}

/**
 * Slice architecture request parameters
 */
export interface ISliceArchitectureRequest {
  framework: FrameworkTypes | string; // Allow string for flexibility with external inputs
  sliceName: string;
}

/**
 * Framework information data
 */
export interface IFrameworkData {
  id: string;
  name: string;
}

/**
 * Slice architecture response data - comprehensive markdown docs
 */
export interface ISliceArchitectureData {
  frameworkName: string;
  sliceName: string;
  documentation: {
    tutorial: string; // Full tutorial markdown
    checklist: string; // Full checklist markdown
  };
  availableDocs: Array<{
    name: string;
    description: string;
    path: string;
  }>;
}

/**
 * Complete slice knowledge data - includes all pattern docs
 */
export interface ICompleteSliceKnowledgeData extends ISliceArchitectureData {
  documents: Record<string, string>; // Pattern name -> markdown content
}

/**
 * Framework architecture data - overview and structural docs
 */
export interface IFrameworkArchitectureData {
  frameworkName: string;
  documentation: {
    overview: string; // Full overview markdown
    whenToUse: string; // Full when-to-use markdown
    checklist: string; // Full checklist markdown
  };
}

/**
 * Next steps request parameters
 */
export interface INextStepsRequest {
  phase: 'initialization' | 'setup' | 'implementation' | 'testing' | 'deployment';
  lastCompleted?: string;
  workingOn: 'api' | 'app' | 'admin' | 'full-stack';
}

/**
 * Feature bundle request parameters
 */
export interface IFeatureBundleRequest {
  feature: string;
  framework: FrameworkTypes | string;
}
