import { create } from 'zustand';

interface DialogState {
  isOpen: boolean;
  url: string;
  openDialog: (url: string) => void;
  closeDialog: () => void;
}

export const useExternalLinkDialog = create<DialogState>((set) => ({
  isOpen: false,
  url: '',
  openDialog: (url) => set({ isOpen: true, url }),
  closeDialog: () => set({ isOpen: false, url: '' }),
}));

export const requestExternalLinkNavigate = (url: string): void => {
  const targetUrl = new URL(url, window.location.origin);
  const isExternalUrl = targetUrl.hostname !== window.location.hostname;
  
  if (isExternalUrl) {
    useExternalLinkDialog.getState().openDialog(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};