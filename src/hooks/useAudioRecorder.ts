// Custom hook for audio recording functionality

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  isInitialized: boolean;
  error: string | null;
  audioLevel: number;
  duration: number;
}

interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  requestPermission: () => Promise<boolean>;
  cleanup: () => void;
}

export const useAudioRecorder = (
  onAudioData?: (audioData: Int16Array) => void,
  sampleRate: number = 16000
): UseAudioRecorderReturn => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isInitialized: false,
    error: null,
    audioLevel: 0,
    duration: 0,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const onAudioDataRef = useRef(onAudioData);

  // Update refs when dependencies change
  useEffect(() => {
    onAudioDataRef.current = onAudioData;
  }, [onAudioData]);

  useEffect(() => {
    isRecordingRef.current = state.isRecording;
  }, [state.isRecording]);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      stream.getTracks().forEach(track => track.stop());
      setState(prev => ({ ...prev, error: null }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: `Microphone permission denied: ${errorMessage}` }));
      return false;
    }
  }, [sampleRate]);

  // Initialize audio context and processing
  const initializeAudio = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate });
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(512, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        // Use ref instead of state to avoid stale closure
        if (!isRecordingRef.current) return;

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Use ref to get current callback
        if (onAudioDataRef.current) {
          onAudioDataRef.current(int16Data);
        }
      };

      source.connect(analyser);
      source.connect(processor);
      processor.connect(audioContext.destination);

      setState(prev => ({ ...prev, isInitialized: true, error: null }));
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: `Audio initialization failed: ${errorMessage}` }));
      return false;
    }
  }, [sampleRate]);

  // Monitor audio level
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalizedLevel = average / 255;

      setState(prev => ({ ...prev, audioLevel: normalizedLevel }));

      // Use ref to avoid stale closure
      if (isRecordingRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, []);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      if (!state.isInitialized) {
        const initialized = await initializeAudio();
        if (!initialized) return;
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setState(prev => ({ ...prev, isRecording: true, error: null, duration: 0 }));
      startTimeRef.current = Date.now();
      
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 100);

      monitorAudioLevel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: `Recording failed: ${errorMessage}` }));
    }
  }, [state.isInitialized, initializeAudio, monitorAudioLevel]);

  // Stop recording
  const stopRecording = useCallback((): void => {
    setState(prev => ({ ...prev, isRecording: false, audioLevel: 0 }));

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback((): void => {
    stopRecording();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    analyserRef.current = null;
    
    setState({
      isRecording: false,
      isInitialized: false,
      error: null,
      audioLevel: 0,
      duration: 0,
    });
  }, [stopRecording]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    startRecording,
    stopRecording,
    requestPermission,
    cleanup,
  };
}; 