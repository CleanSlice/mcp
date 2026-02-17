// @scope:api
// @slice:knowledge
// @layer:presentation
// @type:dto

import { z } from 'zod';

/**
 * Framework request schema
 *
 * Used for validating framework selection in MCP tools.
 */
export const FrameworkRequestSchema = z.object({
  framework: z
    .string()
    .default('nestjs')
    .describe(
      "Framework identifier (e.g., 'nestjs', 'nuxt'). Use 'list-frameworks' to see available options."
    ),
});

/**
 * Slice architecture request schema
 *
 * Used for validating slice architecture requests in MCP tools.
 */
export const SliceArchitectureRequestSchema = z.object({
  framework: z
    .string()
    .default('nestjs')
    .describe(
      "Framework identifier (e.g., 'nestjs', 'nuxt'). Use 'list-frameworks' to see available options."
    ),
  sliceName: z
    .string()
    .default('example')
    .describe('Name of the slice to generate architecture for'),
});

/**
 * Complete slice knowledge request schema
 *
 * Used for validating complete knowledge requests in MCP tools.
 */
export const CompleteSliceKnowledgeRequestSchema = z.object({
  framework: z.string().default('nestjs').describe('Framework identifier'),
  sliceName: z.string().default('example').describe('Name of the slice'),
});

/**
 * Type inference for framework request
 */
export type FrameworkRequestDto = z.infer<typeof FrameworkRequestSchema>;

/**
 * Type inference for slice architecture request
 */
export type SliceArchitectureRequestDto = z.infer<
  typeof SliceArchitectureRequestSchema
>;

/**
 * Type inference for complete slice knowledge request
 */
export type CompleteSliceKnowledgeRequestDto = z.infer<
  typeof CompleteSliceKnowledgeRequestSchema
>;
