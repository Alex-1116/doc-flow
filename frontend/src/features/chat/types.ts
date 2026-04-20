export type AgentStatus = 'analyzing' | 'retrieving' | 'generating' | 'done' | 'error';

export interface AgentStep {
  status: AgentStatus;
  message: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ content: string; metadata: Record<string, string> }>;
  status?: AgentStatus;
  loadingMessage?: string;
  steps?: AgentStep[];
}

export interface Document {
  id: string;
  name: string;
  chunks: number;
}
