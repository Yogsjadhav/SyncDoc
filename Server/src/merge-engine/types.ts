import { v4 as uuidv4 } from 'uuid';

// ─── Marks ────────────────────────────────────────────────────────────────────
export type Mark = 'bold' | 'italic' | 'underline' | 'code' | 'strikethrough';

// ─── Inline nodes ─────────────────────────────────────────────────────────────
export interface ASTText {
  nodeId: string;
  type: 'text';
  text: string;
  marks: Mark[];
}

export interface ASTLink {
  nodeId: string;
  type: 'link';
  href: string;
  children: ASTText[];
}

export type ASTInline = ASTText | ASTLink;

// ─── Block nodes ──────────────────────────────────────────────────────────────
export interface ASTParagraph   { nodeId: string; type: 'paragraph';  children: ASTInline[] }
export interface ASTHeading     { nodeId: string; type: 'heading';    level: 1|2|3|4|5|6; children: ASTInline[] }
export interface ASTListItem    { nodeId: string; type: 'list-item';  children: ASTInline[] }
export interface ASTList        { nodeId: string; type: 'list';       ordered: boolean; children: ASTListItem[] }
export interface ASTCodeBlock   { nodeId: string; type: 'code-block'; language: string;  children: ASTText[] }
export interface ASTBlockquote  { nodeId: string; type: 'blockquote'; children: ASTBlock[] }

export type ASTBlock =
  | ASTParagraph | ASTHeading | ASTList | ASTListItem
  | ASTCodeBlock | ASTBlockquote;

// ─── Document root ────────────────────────────────────────────────────────────
export interface ASTDocument {
  nodeId: string;
  type: 'document';
  children: ASTBlock[];
}

export type ASTNode = ASTDocument | ASTBlock | ASTInline;

// ─── Operations ───────────────────────────────────────────────────────────────
export type ASTOperation =
  | { op: 'insert-node';  parentId: string; index: number; node: ASTBlock | ASTInline }
  | { op: 'delete-node';  nodeId: string }
  | { op: 'update-text';  nodeId: string; text: string }
  | { op: 'update-marks'; nodeId: string; marks: Mark[] }
  | { op: 'update-attrs'; nodeId: string; attrs: Record<string, unknown> }
  | { op: 'move-node';    nodeId: string; newParentId: string; newIndex: number }
  | { op: 'split-node';   nodeId: string; offset: number; newNodeId: string }
  | { op: 'merge-node';   nodeId: string; withNodeId: string };

// ─── Conflict info ────────────────────────────────────────────────────────────
export interface ConflictInfo {
  type: 'delete-vs-edit' | 'concurrent-text' | 'concurrent-marks';
  description: string;
  nodeId: string;
  resolution: 'resurrected' | 'merged' | 'last-write-wins';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function createEmptyDocument(): ASTDocument {
  return {
    nodeId: uuidv4(),
    type: 'document',
    children: [
      { nodeId: uuidv4(), type: 'paragraph',
        children: [{ nodeId: uuidv4(), type: 'text', text: '', marks: [] }] },
    ],
  };
}
