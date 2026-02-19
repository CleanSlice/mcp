// @scope:api
// @slice:knowledge
// @layer:presentation
// @type:dto

import {
  IFrameworkData,
  ISliceArchitectureData,
  ICompleteSliceKnowledgeData,
  IFrameworkArchitectureData,
} from '../domain/knowledge.types';

/**
 * Base response DTO for MCP formatting
 */
abstract class BaseMcpResponseDto {
  abstract toMarkdown(): string;

  toMcpResponse() {
    return {
      content: [{ type: 'text', text: this.toMarkdown() }],
    };
  }

  toMcpResourceResponse(uri: string) {
    return {
      content: [
        {
          uri,
          text: this.toMarkdown(),
          mimeType: 'text/markdown',
        },
      ],
    };
  }
}

/**
 * Framework list response DTO
 */
export class FrameworkListResponseDto extends BaseMcpResponseDto {
  constructor(private readonly frameworks: IFrameworkData[]) {
    super();
  }

  toMarkdown(): string {
    let content = '# Available Frameworks\n\n';
    content +=
      'The following frameworks are available in the knowledge base:\n\n';

    this.frameworks.forEach((framework) => {
      content += `- **${framework.name}** (ID: \`${framework.id}\`)\n`;
    });

    content +=
      '\nUse the framework ID with other tools to get framework-specific documentation.';

    return content;
  }
}

/**
 * Slice architecture response DTO
 *
 * Returns comprehensive tutorial and checklist documentation.
 */
export class SliceArchitectureResponseDto extends BaseMcpResponseDto {
  constructor(readonly data: ISliceArchitectureData) {
    super();
  }

  toMarkdown(): string {
    let content = `# ${this.data.frameworkName} Slice Architecture: ${this.data.sliceName}\n\n`;

    content += '## Tutorial\n\n';
    content += this.data.documentation.tutorial;
    content += '\n\n---\n\n';

    content += '## Checklist\n\n';
    content += this.data.documentation.checklist;
    content += '\n\n---\n\n';

    if (this.data.availableDocs.length > 0) {
      content += '## Additional Patterns & Guides\n\n';
      this.data.availableDocs.forEach((doc) => {
        content += `### ${doc.name}\n`;
        content += `${doc.description}\n`;
        content += `Path: \`${doc.path}\`\n\n`;
      });
    }

    return content;
  }
}

/**
 * Complete slice knowledge response DTO
 *
 * Returns all architectural patterns and documentation.
 */
export class CompleteSliceKnowledgeResponseDto extends BaseMcpResponseDto {
  constructor(private readonly data: ICompleteSliceKnowledgeData) {
    super();
  }

  toMarkdown(): string {
    let content = `# Complete ${this.data.frameworkName} Slice Knowledge: ${this.data.sliceName}\n\n`;

    content += '## Table of Contents\n\n';
    content += '1. [Tutorial](#tutorial)\n';
    content += '2. [Checklist](#checklist)\n';
    content += '3. [Architectural Patterns](#architectural-patterns)\n\n';

    content += '---\n\n';

    content += '## Tutorial\n\n';
    content += this.data.documentation.tutorial;
    content += '\n\n---\n\n';

    content += '## Checklist\n\n';
    content += this.data.documentation.checklist;
    content += '\n\n---\n\n';

    content += '## Architectural Patterns\n\n';

    Object.entries(this.data.documents).forEach(([patternName, patternContent]) => {
      content += `### ${patternName}\n\n`;
      content += patternContent;
      content += '\n\n---\n\n';
    });

    return content;
  }
}

/**
 * Framework architecture response DTO
 *
 * Returns framework overview and structural documentation.
 */
export class FrameworkArchitectureResponseDto extends BaseMcpResponseDto {
  constructor(private readonly data: IFrameworkArchitectureData) {
    super();
  }

  toMarkdown(): string {
    let content = `# ${this.data.frameworkName} Architecture Documentation\n\n`;

    content += '## Overview\n\n';
    content += this.data.documentation.overview;
    content += '\n\n---\n\n';

    content += '## When to Use\n\n';
    content += this.data.documentation.whenToUse;
    content += '\n\n---\n\n';

    content += '## Checklist\n\n';
    content += this.data.documentation.checklist;

    return content;
  }
}

interface IPaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Search results response DTO
 *
 * Renders snippet-based search results. Each result includes 1-3 keyword-in-context
 * excerpts instead of full document content. Use `read-doc` tool to get full content.
 */
export class SearchResultsResponseDto extends BaseMcpResponseDto {
  constructor(
    private readonly results: Array<{
      name: string;
      path: string;
      snippets: string[];
      description?: string;
      category?: string;
      tags?: string[];
      relevanceScore?: number;
    }>,
    private readonly pagination: IPaginationMeta,
  ) {
    super();
  }

  toMarkdown(): string {
    const { total, offset } = this.pagination;

    if (this.results.length === 0) {
      return '# Search Results\n\nNo documents found matching your query.';
    }

    const from = offset + 1;
    const to = offset + this.results.length;

    let content = `# Search Results\n\nShowing ${from}–${to} of ${total} documents (sorted by relevance):\n\n`;
    content += '---\n\n';

    this.results.forEach((doc, index) => {
      content += `## ${offset + index + 1}. ${doc.name}\n\n`;

      if (doc.description) {
        content += `*${doc.description}*\n\n`;
      }

      if (doc.category || doc.tags?.length) {
        if (doc.category) {
          content += `- Category: \`${doc.category}\`\n`;
        }
        if (doc.tags && doc.tags.length > 0) {
          content += `- Tags: ${doc.tags.map(t => `\`${t}\``).join(', ')}\n`;
        }
        content += '\n';
      }

      content += `**Path:** \`${doc.path}\`\n\n`;

      if (doc.snippets.length > 0) {
        content += '**Snippets:**\n\n';
        doc.snippets.forEach((snippet) => {
          content += `> ${snippet.replace(/\n/g, '\n> ')}\n\n`;
        });
      }

      content += `> Use \`read-doc\` with path \`${doc.path}\` to get the full document.\n\n`;
      content += '---\n\n';
    });

    if (to < total) {
      content += `> **More results available.** Use \`offset: ${to}\` to see the next page (${total - to} remaining).\n`;
    }

    return content;
  }
}

/**
 * Document response DTO
 *
 * Returns full document content for a single document loaded via `read-doc` tool.
 */
export class DocumentResponseDto extends BaseMcpResponseDto {
  constructor(
    private readonly name: string,
    private readonly path: string,
    private readonly content: string,
  ) {
    super();
  }

  toMarkdown(): string {
    let md = `# ${this.name}\n\n`;
    md += `**Path:** \`${this.path}\`\n\n---\n\n`;
    md += this.content;
    return md;
  }
}
