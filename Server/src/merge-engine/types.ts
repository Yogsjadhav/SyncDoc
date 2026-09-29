import { v4 as uuidv4 } from 'uuid';

// Text formatting styles that can be applied to text (like in a word processor)
export type Mark = 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough';

// Basic text node - contains the actual text content with optional formatting
export interface ASTText {
  nodeId: string;        // Unique ID to track this text node
  type: 'text';
  text: string;          // The actual text content
  marks: Mark[];         // Formatting applied (bold, italic, etc.)
}

// Hyperlink node - a clickable link containing text
export interface ASTLink {
  nodeId: string;
  type: 'link';
  href: string;          // The URL the link points to
  children: ASTText[];   // The text shown for the link
}

// Inline nodes = things that appear within a line of text
export type ASTInline = ASTText | ASTLink;

// Block nodes = structural elements that make up a document (paragraphs, headings, lists, etc.)
export interface ASTParagraph   { nodeId: string; type: 'paragraph';  children: ASTInline[] }
export interface ASTHeading     { nodeId: string; type: 'heading';    level: 1|2|3|4|5|6; children: ASTInline[] }
export interface ASTListItem    { nodeId: string; type: 'list-item';  children: ASTInline[] }
export interface ASTList        { nodeId: string; type: 'list';       ordered: boolean; children: ASTListItem[] }
export interface ASTCodeBlock   { nodeId: string; type: 'code-block'; language: string;  children: ASTText[] }
export interface ASTBlockquote  { nodeId: string; type: 'blockquote'; children: ASTBlock[] }

export type ASTBlock =
  | ASTParagraph | ASTHeading | ASTList | ASTListItem
  | ASTCodeBlock | ASTBlockquote;

// The root document structure - contains all the blocks (paragraphs, headings, etc.)
export interface ASTDocument {
  nodeId: string;
  type: 'document';
  children: ASTBlock[];    // All the content blocks in the document
}

// Any node in the document tree
export type ASTNode = ASTDocument | ASTBlock | ASTInline;

// Operations = all the types of changes a user can make to the document
// These are the building blocks for collaborative editing
export type ASTOperation =
  | { op: 'insert-node';  parentId: string; index: number; node: ASTBlock | ASTInline }  // Add a new node
  | { op: 'delete-node';  nodeId: string }                                                // Remove a node
  | { op: 'update-text';  nodeId: string; text: string }                                  // Change text content
  | { op: 'update-marks'; nodeId: string; marks: Mark[] }                                 // Change formatting
  | { op: 'update-attrs'; nodeId: string; attrs: Record<string, unknown> }                // Change attributes (like heading level)
  | { op: 'move-node';    nodeId: string; newParentId: string; newIndex: number }         // Move a node to a new position
  | { op: 'split-node';   nodeId: string; offset: number; newNodeId: string }             // Split a node into two (like pressing Enter)
  | { op: 'merge-node';   nodeId: string; withNodeId: string };                           // Merge two nodes together (like Backspace)

// Information about conflicts that occurred when merging changes from multiple users
export interface ConflictInfo {
  type: 'delete-vs-edit' | 'concurrent-text' | 'concurrent-marks';   // What kind of conflict
  description: string;                                                 // Human-readable explanation
  nodeId: string;                                                      // Which node had the conflict
  resolution: 'resurrected' | 'merged' | 'last-write-wins';          // How we resolved it
}

// Create a new empty document (used when creating a new document)
export function createEmptyDocument(): ASTDocument {
  return {
    nodeId: uuidv4(),
    type: 'document',
    children: [
      // Start with a single empty paragraph
      { nodeId: uuidv4(), type: 'paragraph',
        children: [{ nodeId: uuidv4(), type: 'text', text: '', marks: [] }] },
    ],
  };
}
