/**
 * Markdown Parser Utility
 *
 * Extracts structured content from markdown text for brand generation.
 * Parses headings, paragraphs, lists, and sections while preserving semantic structure.
 */

/**
 * Parse markdown into sections based on heading hierarchy
 * @param {string} markdown - Raw markdown content
 * @returns {Array<{heading: string, content: string, level: number}>}
 */
export function parseMarkdownSections(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return [];
  }

  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match heading patterns: # H1, ## H2, ### H3
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentSection.content.trim();
        sections.push(currentSection);
      }

      // Start new section
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();

      currentSection = {
        heading,
        content: '',
        level
      };
    } else if (currentSection) {
      // Accumulate content for current section
      currentSection.content += line + '\n';
    } else if (line.trim()) {
      // Content before first heading - treat as level 0 intro
      if (!currentSection) {
        currentSection = {
          heading: '',
          content: line + '\n',
          level: 0
        };
      }
    }
  }

  // Push final section
  if (currentSection) {
    currentSection.content = currentSection.content.trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract first paragraph from text content
 * @param {string} content - Text content (may contain markdown)
 * @returns {string} First paragraph or empty string
 */
export function extractFirstParagraph(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Clean markdown first for better paragraph detection
  // Filter out common nav/skip-link fragments before paragraph detection
  const filtered = content
    .split('\n')
    .filter((line) => !/^\[?(Zum Inhalt|Skip to|Jump to)/i.test(line.trim()))
    .join('\n');
  const cleaned = cleanMarkdown(filtered);

  // Split by double newlines (paragraph breaks)
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) {
    // Fallback: try single newline split and take first non-empty line
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines[0] || '';
  }

  return paragraphs[0];
}

/**
 * Clean markdown syntax while preserving text structure
 * Removes: #, *, _, `, [links], but keeps paragraphs and line breaks
 * @param {string} text - Markdown text
 * @returns {string} Cleaned text
 */
export function cleanMarkdown(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = text;

  // Remove headings markers (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers (**text**, *text*, __text__, _text_)
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, '$2');
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

  // Remove links but keep text: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove reference-style links: [text][ref] -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');

  // Remove link references: [ref]: url
  cleaned = cleaned.replace(/^\[[\w\s-]+\]:\s+.+$/gm, '');

  // Remove images: ![alt](url)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Remove blockquote markers (>)
  cleaned = cleaned.replace(/^>\s+/gm, '');

  // Remove horizontal rules (---, ***, ___)
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');

  // Remove list markers but keep the text
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');

  // Normalize whitespace: multiple spaces -> single space
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  // Normalize line breaks: 3+ newlines -> 2 newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  return cleaned.trim();
}

/**
 * Extract list items from markdown content
 * Converts bullet points or numbered lists into structured items
 * @param {string} content - Markdown content containing lists
 * @returns {Array<{title: string, description?: string}>}
 */
export function extractListItems(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const items = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match bullet lists: - item, * item, + item
    const bulletMatch = line.match(/^[\s]*[-*+]\s+(.+)$/);

    // Match numbered lists: 1. item, 2. item
    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);

    const match = bulletMatch || numberedMatch;

    if (match) {
      const text = match[1].trim();

      // Check if item has title: description format (bold title or colon separator)
      const boldSplit = text.match(/\*\*([^*]+)\*\*:?\s*(.+)?/);
      const colonSplit = text.split(':');

      if (boldSplit) {
        items.push({
          title: cleanMarkdown(boldSplit[1]),
          description: boldSplit[2] ? cleanMarkdown(boldSplit[2]) : undefined
        });
      } else if (colonSplit.length === 2 && colonSplit[0].length < 100) {
        // Only treat as title:description if first part is short enough
        items.push({
          title: cleanMarkdown(colonSplit[0]),
          description: cleanMarkdown(colonSplit[1])
        });
      } else {
        // Simple item without description
        items.push({
          title: cleanMarkdown(text)
        });
      }
    }
  }

  return items;
}
