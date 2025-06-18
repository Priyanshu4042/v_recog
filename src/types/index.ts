// Types for the voice identification application

export interface SpeakerProfile {
  id: string;
  name: string;
  voiceprint: Int32Array;
  createdAt: Date;
  lastUpdated: Date;
}

export interface EnrollmentState {
  isEnrolling: boolean;
  isRecording: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export interface RecognitionState {
  isRecognizing: boolean;
  isListening: boolean;
  identifiedSpeaker: string | null;
  confidence: number;
  error: string | null;
}

export interface AudioProcessingState {
  isProcessing: boolean;
  audioLevel: number;
  sampleRate: number;
}

export interface EagleConfig {
  accessKey: string;
  modelPath: string;
  sampleRate: number;
}

// Picovoice Eagle types (extend as needed)
export interface EagleProfiler {
  enroll: (pcm: Int16Array) => Promise<{ percentage: number; feedback: string }>;
  export: () => Promise<Int32Array>;
  reset: () => void;
}

export interface EagleRecognizer {
  process: (pcm: Int16Array) => Promise<{ scores: number[] }>;
}

export interface VoiceProcessorConfig {
  engines: any[];
  sampleRate: number;
  frameLength: number;
} 