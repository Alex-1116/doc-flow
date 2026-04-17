export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ content: string; metadata: Record<string, string> }>;
}

export interface Document {
  id: string;
  name: string;
  chunks: number;
}
