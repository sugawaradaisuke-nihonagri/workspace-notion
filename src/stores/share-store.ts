import { create } from "zustand";

interface ShareState {
  isOpen: boolean;
  pageId: string | null;
  workspaceId: string | null;
  open: (pageId: string, workspaceId: string) => void;
  close: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  isOpen: false,
  pageId: null,
  workspaceId: null,
  open: (pageId, workspaceId) => set({ isOpen: true, pageId, workspaceId }),
  close: () => set({ isOpen: false, pageId: null, workspaceId: null }),
}));
