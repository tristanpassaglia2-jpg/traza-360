// packages/shared/index.js
// Tipos, constantes y enums compartidos entre frontend y backend

export const ALERT_TYPES = {
  PANIC: 'PANIC',
  INTRUDER: 'INTRUDER',
  SILENT: 'SILENT',
  FALL: 'FALL',
  CHILD_LOST: 'CHILD_LOST',
  WORK_EMERGENCY: 'WORK_EMERGENCY',
};

export const ALERT_STATUS = {
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
  ESCALATED: 'ESCALATED',
};

export const MODULE_TYPES = {
  VIOLENCIA: 'VIOLENCIA',
  MAYOR: 'MAYOR',
  NINO: 'NINO',
  HOGAR: 'HOGAR',
  TRABAJO: 'TRABAJO',
};

export const PLAN_IDS = {
  FREE: 'free',
  PREMIUM: 'premium_personal',
  FAMILY: 'premium_familiar',
};

export const PLAN_LIMITS = {
  [PLAN_IDS.FREE]: {
    maxContacts: 2,
    evidenceCloud: false,
    fullHistory: false,
    extendedTracking: false,
    camouflage: false,
    unlimitedReminders: false,
    familyPanel: false,
  },
  [PLAN_IDS.PREMIUM]: {
    maxContacts: Infinity,
    evidenceCloud: true,
    fullHistory: true,
    extendedTracking: true,
    camouflage: true,
    unlimitedReminders: true,
    familyPanel: false,
  },
  [PLAN_IDS.FAMILY]: {
    maxContacts: Infinity,
    evidenceCloud: true,
    fullHistory: true,
    extendedTracking: true,
    camouflage: true,
    unlimitedReminders: true,
    familyPanel: true,
  },
};

export const EVIDENCE_TYPES = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  PHOTO: 'PHOTO',
  NOTE: 'NOTE',
  DOCUMENT: 'DOCUMENT',
};

export const CONTACT_RELATIONS = {
  FAMILY: 'FAMILIAR',
  FRIEND: 'AMIGO',
  CAREGIVER: 'CUIDADOR',
  SUPERVISOR: 'SUPERVISOR',
  NEIGHBOR: 'VECINO',
  OTHER: 'OTRO',
};

export const REMINDER_STATUS = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  SNOOZED: 'SNOOZED',
  MISSED: 'MISSED',
};

export const MEDICATION_STATUS = {
  TAKEN: 'TAKEN',
  MISSED: 'MISSED',
  SNOOZED: 'SNOOZED',
};

export const TRACKING_STATUS = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  EMERGENCY: 'EMERGENCY',
};
