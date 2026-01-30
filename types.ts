export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export enum ModelTier {
  MINI = 'hynix-mini', // Smart and fast
  FLASH = 'hynix-flash', // Smarter and faster
  PRO = 'hynix-pro', // Smartest and fastest
  HYB = 'hynix-hyb', // 10x Smarter than Pro
  FUSE = 'hynix-fuse' // 25x Smarter than Hyb
}

export interface User {
  name: string;
  email: string;
  picture?: string;
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64
  name?: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  attachments?: Attachment[];
  isThinking?: boolean; // For UI state
  thinkingTime?: number; // Simulated thought time
  groundingMetadata?: GroundingMetadata;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  modelTier: ModelTier; // Kept for backward compatibility
  modelId: string; // New field for specific version (e.g., "Hynix 1.5 Hyb")
  createdAt: number;
  isPinned?: boolean; // New feature
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: 'Coding' | 'Writing' | 'Analysis' | 'Creative' | 'Business';
  content: string;
}

export interface SettingsState {
  temperature: number;
  systemInstruction: string;
  personaId: string;
}

declare global {
  interface Window {
    google: any;
  }
}