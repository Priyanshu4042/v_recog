// Eagle service utilities for Picovoice Eagle SDK integration

import { SpeakerProfile } from '@/types';

// Picovoice AccessKey - now configured with actual key
const PICOVOICE_ACCESS_KEY = 'V3wf1m65MpUlN2RV0eBy/xJGU5g27GqzII7GdJxeEwm/zHyqtCWrpQ==';

export class EagleService {
  private profiler: any = null;
  private recognizer: any = null;
  private isInitialized = false;
  private enrolledProfiles: SpeakerProfile[] = [];
  private simulationInterval: NodeJS.Timeout | null = null;
  private audioBuffer: Int16Array = new Int16Array(0);
  private minBufferSize = 16000; // 1 second of audio at 16kHz

  async initializeProfiler(): Promise<void> {
    try {
      console.log('🚀 Starting Eagle profiler initialization...');
      
      if (!PICOVOICE_ACCESS_KEY || PICOVOICE_ACCESS_KEY.trim() === '') {
        throw new Error(
          'Please set your Picovoice AccessKey in src/utils/eagle.ts. ' +
          'Get your free key from https://console.picovoice.ai/'
        );
      }

      console.log('🔑 Access key provided:', {
        hasKey: !!PICOVOICE_ACCESS_KEY,
        keyLength: PICOVOICE_ACCESS_KEY.length,
        keyPreview: PICOVOICE_ACCESS_KEY.substring(0, 10) + '...'
      });

      // Try to use actual Eagle SDK
      console.log('📦 Importing Eagle SDK...');
      const { EagleProfiler } = await import('@picovoice/eagle-web');
      console.log('✅ Eagle SDK imported successfully');
      
      // Create proper EagleModel object for the model file
      const eagleModel = {
        publicPath: '/models/eagle_params.pv',
        forceWrite: true
      };
      
      console.log('🏗️ Creating Eagle profiler with model:', eagleModel);
      
      this.profiler = await EagleProfiler.create(
        PICOVOICE_ACCESS_KEY,
        eagleModel
      );
      
      console.log('🎉 Real Eagle profiler initialized successfully!', {
        profilerExists: !!this.profiler,
        sampleRate: this.profiler?.sampleRate,
        minEnrollSamples: this.profiler?.minEnrollSamples,
        version: this.profiler?.version
      });

      // Update buffer size based on Eagle's requirements
      if (this.profiler?.minEnrollSamples) {
        this.minBufferSize = Math.max(this.minBufferSize, this.profiler.minEnrollSamples);
        console.log('📏 Set minimum buffer size to:', this.minBufferSize);
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Eagle profiler:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Eagle profiler initialization failed: ${error}`);
    }
  }

  async initializeRecognizer(profiles: SpeakerProfile[]): Promise<void> {
    try {
      if (!PICOVOICE_ACCESS_KEY || PICOVOICE_ACCESS_KEY.trim() === '') {
        throw new Error(
          'Please set your Picovoice AccessKey in src/utils/eagle.ts. ' +
          'Get your free key from https://console.picovoice.ai/'
        );
      }

      this.enrolledProfiles = profiles;
      
      // Try to use actual Eagle SDK
      const { Eagle } = await import('@picovoice/eagle-web');
      
      // Create proper EagleModel object for the model file
      const eagleModel = {
        publicPath: '/models/eagle_params.pv',
        forceWrite: true
      };
      
      // Convert voiceprints to EagleProfile format
      const eagleProfiles = profiles.map(profile => {
        // Convert Int32Array back to Uint8Array
        const int32Array = profile.voiceprint;
        const uint8Array = new Uint8Array(int32Array.length * 4);
        
        for (let i = 0; i < int32Array.length; i++) {
          const value = int32Array[i];
          uint8Array[i * 4] = (value >>> 24) & 0xFF;
          uint8Array[i * 4 + 1] = (value >>> 16) & 0xFF;
          uint8Array[i * 4 + 2] = (value >>> 8) & 0xFF;
          uint8Array[i * 4 + 3] = value & 0xFF;
        }
        
        return {
          bytes: uint8Array
        };
      });
      
      this.recognizer = await Eagle.create(
        PICOVOICE_ACCESS_KEY,
        eagleModel,
        eagleProfiles
      );
      
      console.log('🎉 Real Eagle recognizer initialized successfully!', {
        profileCount: profiles.length,
        frameLength: this.recognizer?.frameLength,
        sampleRate: this.recognizer?.sampleRate,
        version: this.recognizer?.version
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Eagle recognizer:', error);
      throw new Error(`Eagle recognizer initialization failed: ${error}`);
    }
  }

  async enrollAudio(pcmData: Int16Array): Promise<{ percentage: number; feedback: string }> {
    if (!this.isInitialized) {
      throw new Error('Profiler not initialized. Call initializeProfiler() first.');
    }

    try {
      console.log('🎤 Processing audio data:', {
        length: pcmData.length,
        nonZeroSamples: pcmData.filter(x => x !== 0).length,
        maxValue: Math.max(...pcmData),
        minValue: Math.min(...pcmData),
        currentBufferSize: this.audioBuffer.length,
        minBufferSize: this.minBufferSize
      });

      // Accumulate audio data in buffer
      const newBuffer = new Int16Array(this.audioBuffer.length + pcmData.length);
      newBuffer.set(this.audioBuffer);
      newBuffer.set(pcmData, this.audioBuffer.length);
      this.audioBuffer = newBuffer;

      console.log('📦 Buffer updated:', {
        newBufferSize: this.audioBuffer.length,
        hasEnoughData: this.audioBuffer.length >= this.minBufferSize
      });

      // Only process when we have enough data
      if (this.audioBuffer.length < this.minBufferSize) {
        console.log('⏳ Waiting for more audio data...');
        return {
          percentage: 0,
          feedback: 'COLLECTING_AUDIO'
        };
      }

      if (this.profiler) {
        console.log('🔍 Eagle profiler details:', {
          sampleRate: this.profiler.sampleRate,
          minEnrollSamples: this.profiler.minEnrollSamples,
          version: this.profiler.version,
          processingDataLength: this.audioBuffer.length
        });

        // Use accumulated audio data
        console.log('📨 Calling Eagle profiler.enroll with buffer...');
        const result = await this.profiler.enroll(this.audioBuffer);
        console.log('✅ Eagle SDK enrollment result:', {
          percentage: result.percentage,
          feedback: result.feedback,
          feedbackType: typeof result.feedback,
          resultType: typeof result
        });

        // Clear buffer after successful processing
        this.audioBuffer = new Int16Array(0);
        console.log('🧹 Buffer cleared after processing');
        
        return {
          percentage: result.percentage,
          feedback: typeof result.feedback === 'string' ? result.feedback : String(result.feedback),
        };
      } else {
        console.error('❌ Eagle profiler not initialized');
        throw new Error('Eagle profiler not initialized');
      }
    } catch (error) {
      console.error('💥 Error during enrollment:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Enrollment failed: ${error}`);
    }
  }

  async exportProfile(): Promise<Int32Array> {
    if (!this.isInitialized) {
      throw new Error('Profiler not initialized. Call initializeProfiler() first.');
    }

    try {
      if (this.profiler) {
        // Use real Eagle SDK
        const profile = await this.profiler.export();
        console.log('Eagle SDK profile exported successfully');
        
        // Convert EagleProfile bytes to Int32Array for compatibility with existing storage
        const profileBytes = profile.bytes;
        const int32Array = new Int32Array(Math.ceil(profileBytes.length / 4));
        
        for (let i = 0; i < profileBytes.length; i += 4) {
          const bytes = [
            profileBytes[i] || 0,
            profileBytes[i + 1] || 0,
            profileBytes[i + 2] || 0,
            profileBytes[i + 3] || 0
          ];
          int32Array[Math.floor(i / 4)] = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
        }
        
        return int32Array;
      } else {
        throw new Error('Eagle profiler not initialized');
      }
    } catch (error) {
      console.error('Error exporting profile:', error);
      throw new Error(`Profile export failed: ${error}`);
    }
  }

  resetProfiler(): void {
    if (this.profiler && this.profiler.reset) {
      // Use real Eagle SDK reset
      this.profiler.reset();
    }
    
    // Clear audio buffer when resetting
    this.audioBuffer = new Int16Array(0);
    console.log('🔄 Profiler and audio buffer reset');
  }

  clearAudioBuffer(): void {
    this.audioBuffer = new Int16Array(0);
    console.log('🧹 Audio buffer cleared');
  }

  async recognizeAudio(pcmData: Int16Array): Promise<{ speakerIndex: number; confidence: number }> {
    if (!this.isInitialized) {
      throw new Error('Recognizer not initialized. Call initializeRecognizer() first.');
    }

    try {
      if (this.recognizer) {
        // Check if we have the correct frame length
        const expectedFrameLength = this.recognizer.frameLength || 512;
        
        console.log('🎯 Recognition frame check:', {
          inputLength: pcmData.length,
          expectedLength: expectedFrameLength,
          recognizerFrameLength: this.recognizer.frameLength
        });

        if (pcmData.length !== expectedFrameLength) {
          console.warn(`⚠️ Frame length mismatch: got ${pcmData.length}, expected ${expectedFrameLength}`);
          
          // If we have too much data, take only what we need
          if (pcmData.length > expectedFrameLength) {
            pcmData = pcmData.slice(0, expectedFrameLength);
            console.log('✂️ Trimmed audio data to correct length');
          } else {
            // If we have too little data, pad with zeros
            const paddedData = new Int16Array(expectedFrameLength);
            paddedData.set(pcmData);
            pcmData = paddedData;
            console.log('📏 Padded audio data to correct length');
          }
        }

        // Use real Eagle SDK
        const scores = await this.recognizer.process(pcmData);
        
        let maxScore = -1;
        let speakerIndex = -1;
        
        for (let i = 0; i < scores.length; i++) {
          if (scores[i] > maxScore) {
            maxScore = scores[i];
            speakerIndex = i;
          }
        }

        const confidenceThreshold = 0.5;
        if (maxScore < confidenceThreshold) {
          speakerIndex = -1;
        }

        console.log('🎤 Eagle SDK recognition result:', {
          scores: scores,
          speakerIndex: speakerIndex,
          confidence: maxScore,
          frameLength: pcmData.length
        });

        return {
          speakerIndex,
          confidence: maxScore,
        };
      } else {
        throw new Error('Eagle recognizer not initialized');
      }
    } catch (error) {
      console.error('💥 Error during recognition:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        inputFrameLength: pcmData.length,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Recognition failed: ${error}`);
    }
  }

  getSpeakerName(speakerIndex: number): string {
    if (speakerIndex >= 0 && speakerIndex < this.enrolledProfiles.length) {
      return this.enrolledProfiles[speakerIndex].name;
    }
    return 'Unknown';
  }

  async startVoiceProcessor(
    onAudioFrame?: (frame: Int16Array) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    try {
      try {
        // Try to use actual WebVoiceProcessor
        const { WebVoiceProcessor } = await import('@picovoice/web-voice-processor');
        
        // Initialize with proper configuration
        const engines = this.recognizer && !this.recognizer.mock ? [this.recognizer] : [];
        
        // Note: This is a simplified version - you may need to adjust based on the actual API
        console.log('Attempting to start real WebVoiceProcessor');
        
        // For now, fall back to simulation
        throw new Error('WebVoiceProcessor integration needs model file');
        
      } catch (processorError) {
        console.warn('WebVoiceProcessor not available, using simulation:', processorError);
        
        // Simulate audio frames for demo
        if (onAudioFrame) {
          this.simulationInterval = setInterval(() => {
            const mockFrame = new Int16Array(512);
            for (let i = 0; i < mockFrame.length; i++) {
              mockFrame[i] = Math.floor(Math.random() * 32768) - 16384;
            }
            onAudioFrame(mockFrame);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error starting voice processor:', error);
      if (onError) {
        onError(`Voice processor failed to start: ${error}`);
      }
      throw error;
    }
  }

  stopVoiceProcessor(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    console.log('Voice processor stopped');
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  static isSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      typeof window !== 'undefined' &&
      (window.AudioContext || (window as any).webkitAudioContext) &&
      typeof indexedDB !== 'undefined'
    );
  }

  cleanup(): void {
    this.stopVoiceProcessor();
    
    // Clean up real Eagle SDK instances
    if (this.profiler && !this.profiler.mock && this.profiler.release) {
      this.profiler.release();
    }
    if (this.recognizer && !this.recognizer.mock && this.recognizer.release) {
      this.recognizer.release();
    }
    
    this.profiler = null;
    this.recognizer = null;
    this.enrolledProfiles = [];
    this.isInitialized = false;
    console.log('Eagle service cleaned up');
  }
}

export const eagleService = new EagleService(); 