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

/**
 * Search results response DTO
 */
export class SearchResultsResponseDto extends BaseMcpResponseDto {
  constructor(private readonly results: Array<{
    name: string;
    path: string;
    content: string;
    description?: string;
    category?: string;
    tags?: string[];
    relevanceScore?: number;
  }>) {
    super();
  }

  toMarkdown(): string {
    if (this.results.length === 0) {
      return '# Search Results\n\nNo documents found matching your query.';
    }

    let content = `# Search Results\n\nFound ${this.results.length} document(s):\n\n`;
    content += '---\n\n';

    this.results.forEach((doc, index) => {
      content += `## ${index + 1}. ${doc.name}\n\n`;
      
      if (doc.description) {
        content += `*${doc.description}*\n\n`;
      }

      if (doc.category || doc.tags?.length) {
        content += '**Metadata:**\n';
        if (doc.category) {
          content += `- Category: \`${doc.category}\`\n`;
        }
        if (doc.tags && doc.tags.length > 0) {
          content += `- Tags: ${doc.tags.map(t => `\`${t}\``).join(', ')}\n`;
        }
        if (doc.relevanceScore !== undefined) {
          content += `- Relevance Score: ${doc.relevanceScore}\n`;
        }
        content += '\n';
      }

      content += `**Path:** \`${doc.path}\`\n\n`;
      content += '**Content:**\n\n';
      content += doc.content;
      content += '\n\n---\n\n';
    });

    return content;
  }
}
