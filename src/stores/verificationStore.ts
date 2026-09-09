import { create } from 'zustand';
import { SearchMatchResult } from '../lib/db/sqlite-indexeddb-engine';

export interface OCRResultState {
  rawText: string;
  confidence: number;
  extractedEpic?: string;
  extractedName?: string;
  extractedRelative?: string;
  extractedAge?: number;
  extractedGender?: string;
  capturedImageUri?: string;
}

interface VerificationWizardState {
  currentStep: number;
  officerId: string;
  partNo: string;
  
  // Step 1: OCR Data
  ocrState: OCRResultState | null;
  
  // Step 2: Legacy Match Record
  selectedLegacyRecord: SearchMatchResult | null;
  manualSearchQuery: {
    name: string;
    epic: string;
    relative: string;
  };
  
  // Step 3: Checklist Data
  checklistValues: Record<string, any>;
  
  // Step 4: Final Encrypted Bundle
  generatedBundleId: string | null;
  isSealing: boolean;

  // Actions
  setStep: (step: number) => void;
  setOfficerId: (id: string) => void;
  setPartNo: (part: string) => void;
  setOCRState: (data: OCRResultState | null) => void;
  setSelectedLegacyRecord: (record: SearchMatchResult | null) => void;
  setManualSearchQuery: (query: Partial<{ name: string; epic: string; relative: string }>) => void;
  setChecklistValue: (key: string, value: any) => void;
  setChecklistValues: (values: Record<string, any>) => void;
  setGeneratedBundleId: (id: string | null) => void;
  setIsSealing: (sealing: boolean) => void;
  resetWizard: () => void;
}

const initialWizardValues = {
  currentStep: 1,
  officerId: 'BLO-DIST-142-088',
  partNo: '142-Rampur',
  ocrState: null,
  selectedLegacyRecord: null,
  manualSearchQuery: {
    name: '',
    epic: '',
    relative: '',
  },
  checklistValues: {
    electorPresent: true,
    photoMatchesPhysical: true,
    legacyLinkConfirmed: true,
    relationshipValidation: 'EXACT_MATCH',
    fieldVerdict: 'VERIFIED',
  },
  generatedBundleId: null,
  isSealing: false,
};

export const useVerificationStore = create<VerificationWizardState>((set) => ({
  ...initialWizardValues,
  setStep: (step) => set({ currentStep: step }),
  setOfficerId: (officerId) => set({ officerId }),
  setPartNo: (partNo) => set({ partNo }),
  setOCRState: (ocrState) => set({ ocrState }),
  setSelectedLegacyRecord: (selectedLegacyRecord) => set({ selectedLegacyRecord }),
  setManualSearchQuery: (query) =>
    set((state) => ({
      manualSearchQuery: { ...state.manualSearchQuery, ...query },
    })),
  setChecklistValue: (key, value) =>
    set((state) => ({
      checklistValues: { ...state.checklistValues, [key]: value },
    })),
  setChecklistValues: (checklistValues) => set({ checklistValues }),
  setGeneratedBundleId: (generatedBundleId) => set({ generatedBundleId }),
  setIsSealing: (isSealing) => set({ isSealing }),
  resetWizard: () => set(initialWizardValues),
}));
