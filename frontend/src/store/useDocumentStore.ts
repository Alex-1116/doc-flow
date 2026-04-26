import { create } from 'zustand';

export interface Document {
  id: string;
  name: string;
  chunks: number;
}

interface DocumentStore {
  // 文档状态
  documents: Document[];
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  clearDocuments: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  // 文档状态
  documents: [],
  setDocuments: (docs: Document[]) => set({ documents: docs }),
  addDocument: (doc: Document) => set((state) => ({ documents: [...state.documents, doc] })),
  removeDocument: (id: string) => set((state) => ({ documents: state.documents.filter(d => d.id !== id) })),
  clearDocuments: () => set({ documents: [] }),
}));
