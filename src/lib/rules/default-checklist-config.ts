export interface DynamicRuleField {
  key: string;
  label: string;
  type: 'boolean' | 'select' | 'text' | 'textarea' | 'radio';
  required?: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
  dependsOn?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'truthy' | 'falsy';
    value?: any;
  };
}

export interface DynamicRuleSection {
  sectionId: string;
  sectionTitle: string;
  description: string;
  fields: DynamicRuleField[];
}

export interface DynamicRuleSchema {
  schemaId: string;
  title: string;
  version: string;
  authority: string;
  sections: DynamicRuleSection[];
}

export const DEFAULT_DYNAMIC_RULE_SCHEMA: DynamicRuleSchema = {
  schemaId: 'SIR-SCHEMA-V2-2026',
  title: 'Statutory Field Verification Checklist (Form-6/7/8 Revision)',
  version: '2.4.1',
  authority: 'Election Commission Technical Cell / Field Division',
  sections: [
    {
      sectionId: 'sec_identity',
      sectionTitle: '1. Identity & Physical Presence Verification',
      description: 'Verify elector physical existence and primary photo identity proof',
      fields: [
        {
          key: 'electorPresent',
          label: 'Is the Elector physically present at the registered habitation?',
          type: 'boolean',
          required: true,
          helpText: 'Toggle if elector was personally interviewed by the BLO'
        },
        {
          key: 'absenceReason',
          label: 'Reason for Absence / Non-Availability',
          type: 'select',
          required: true,
          dependsOn: {
            field: 'electorPresent',
            operator: 'falsy'
          },
          options: [
            { label: 'Temporarily Migrated / Work', value: 'TEMPORARY_MIGRATION' },
            { label: 'Permanently Shifted to New Locality', value: 'PERMANENT_SHIFT' },
            { label: 'Deceased / Expired', value: 'DECEASED' },
            { label: 'Repeatedly Locked / Not Found', value: 'LOCKED_HOUSE' }
          ]
        },
        {
          key: 'idProofType',
          label: 'Primary ID Document Produced',
          type: 'select',
          required: true,
          dependsOn: {
            field: 'electorPresent',
            operator: 'truthy'
          },
          options: [
            { label: 'Legacy Voter ID (EPIC Card 2002-04)', value: 'EPIC_LEGACY' },
            { label: 'Aadhaar Card', value: 'AADHAAR' },
            { label: 'Ration Card / PDS Booklet', value: 'RATION_CARD' },
            { label: 'Kisan Passbook / Bank Passbook', value: 'BANK_PASSBOOK' },
            { label: 'Passport / Driving License', value: 'PASSPORT_DL' }
          ]
        },
        {
          key: 'photoMatchesPhysical',
          label: 'Does the document photo match the elector in person?',
          type: 'boolean',
          required: true,
          dependsOn: {
            field: 'electorPresent',
            operator: 'truthy'
          }
        },
        {
          key: 'photoDiscrepancyDetail',
          label: 'Visual Discrepancy Observation',
          type: 'text',
          required: true,
          dependsOn: {
            field: 'photoMatchesPhysical',
            operator: 'falsy'
          },
          helpText: 'Specify age progression, major visual difference, or suspect identity'
        }
      ]
    },
    {
      sectionId: 'sec_legacy_match',
      sectionTitle: '2. Legacy Roll (2002-04) Linkage Audit',
      description: 'Audit matching confidence against the offline local database snapshot',
      fields: [
        {
          key: 'legacyLinkConfirmed',
          label: 'Confirm linkage with selected 2002-04 Legacy Voter Record?',
          type: 'boolean',
          required: true,
          helpText: 'Ensures uninterrupted roll lineage across decadal revisions'
        },
        {
          key: 'relationshipValidation',
          label: 'Family Relative / Parentage Relationship Status',
          type: 'radio',
          required: true,
          options: [
            { label: 'Exact Match (Father/Husband verified in same part)', value: 'EXACT_MATCH' },
            { label: 'Minor Spelling Variation (Phonetic verified)', value: 'PHONETIC_MINOR' },
            { label: 'Relative Deceased / Remarried', value: 'STATUS_CHANGED' },
            { label: 'Parentage Disputed / Unmapped', value: 'DISPUTED' }
          ]
        },
        {
          key: 'disputeJustification',
          label: 'Officer Parentage Note',
          type: 'textarea',
          required: true,
          dependsOn: {
            field: 'relationshipValidation',
            operator: 'equals',
            value: 'DISPUTED'
          }
        }
      ]
    },
    {
      sectionId: 'sec_officer_recommendation',
      sectionTitle: '3. Statutory Verification Verdict',
      description: 'Final recommendation by the Booth Level Officer / Field Auditor',
      fields: [
        {
          key: 'fieldVerdict',
          label: 'Final Field Recommendation',
          type: 'select',
          required: true,
          options: [
            { label: 'ACCEPTED (Regular Entry Verified)', value: 'VERIFIED' },
            { label: 'FLAGGED WITH DISCREPANCY (Requires ERO Hearing)', value: 'DISCREPANCY' },
            { label: 'RECOMMENDED FOR DELETION (Shifted/Deceased/Fake)', value: 'REJECTED' }
          ]
        },
        {
          key: 'officerRemarks',
          label: 'Field Officer Formal Remarks',
          type: 'textarea',
          required: false,
          helpText: 'Official remarks permanently encrypted into the digital sync bundle'
        }
      ]
    }
  ]
};
