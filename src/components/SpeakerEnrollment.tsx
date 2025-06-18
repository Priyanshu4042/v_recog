'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { speakerStorage } from '@/utils/storage';
import { eagleService } from '@/utils/eagle';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { SpeakerProfile, EnrollmentState } from '@/types';

interface SpeakerEnrollmentProps {
  onEnrollmentComplete?: (profile: SpeakerProfile) => void;
  onError?: (error: string) => void;
}

export const SpeakerEnrollment: React.FC<SpeakerEnrollmentProps> = ({
  onEnrollmentComplete,
  onError,
}) => {
  const [speakerName, setSpeakerName] = useState('');
  const [enrollmentState, setEnrollmentState] = useState<EnrollmentState>({
    isEnrolling: false,
    isRecording: false,
    progress: 0,
    error: null,
    success: false,
  });

  const handleAudioData = useCallback(async (audioData: Int16Array) => {
    if (!enrollmentState.isEnrolling) {
      console.log('🔇 Ignoring audio data - not enrolling');
      return;
    }
    
    console.log('🎵 Audio data received for enrollment:', {
      length: audioData.length,
      isEnrolling: enrollmentState.isEnrolling,
      hasNonZeroSamples: audioData.some(x => x !== 0),
      audioLevel: audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length,
      maxValue: Math.max(...audioData),
      minValue: Math.min(...audioData)
    });
    
    try {
      console.log('🚀 Calling eagleService.enrollAudio...');
      const result = await eagleService.enrollAudio(audioData);
      
      console.log('📊 Enrollment progress update received:', {
        percentage: result.percentage,
        feedback: result.feedback,
        previousProgress: enrollmentState.progress
      });
      
      setEnrollmentState(prev => ({
        ...prev,
        progress: result.percentage,
        error: null,
      }));

      if (result.percentage >= 100) {
        console.log('🎯 Enrollment complete! Exporting profile...');
        await completeEnrollment();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Enrollment failed';
      console.error('💥 Enrollment error:', {
        error: error,
        message: errorMessage,
        audioDataLength: audioData.length
      });
      setEnrollmentState(prev => ({
        ...prev,
        error: errorMessage,
        isEnrolling: false,
        isRecording: false,
      }));
      stopRecording();
      if (onError) onError(errorMessage);
    }
  }, [enrollmentState.isEnrolling, onError]);

  const {
    isRecording,
    audioLevel,
    duration,
    error: audioError,
    startRecording,
    stopRecording,
    requestPermission,
    cleanup: cleanupAudio,
  } = useAudioRecorder(handleAudioData);

  const completeEnrollment = useCallback(async () => {
    try {
      const voiceprint = await eagleService.exportProfile();
      
      const profile: SpeakerProfile = {
        id: `speaker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: speakerName,
        voiceprint: voiceprint,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      await speakerStorage.saveSpeakerProfile(profile);

      setEnrollmentState(prev => ({
        ...prev,
        success: true,
        isEnrolling: false,
        isRecording: false,
      }));

      stopRecording();

      if (onEnrollmentComplete) {
        onEnrollmentComplete(profile);
      }

      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      setEnrollmentState(prev => ({
        ...prev,
        error: errorMessage,
        isEnrolling: false,
        isRecording: false,
      }));
      stopRecording();
      if (onError) onError(errorMessage);
    }
  }, [speakerName, stopRecording, onEnrollmentComplete, onError]);

  const startEnrollment = useCallback(async () => {
    if (!speakerName.trim()) {
      setEnrollmentState(prev => ({
        ...prev,
        error: 'Please enter a speaker name',
      }));
      return;
    }

    try {
      const existingProfile = await speakerStorage.getSpeakerByName(speakerName.trim());
      if (existingProfile) {
        setEnrollmentState(prev => ({
          ...prev,
          error: 'A speaker with this name already exists',
        }));
        return;
      }

      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setEnrollmentState(prev => ({
          ...prev,
          error: 'Microphone permission is required for enrollment',
        }));
        return;
      }

      console.log('🎬 Starting enrollment process...');
      await eagleService.initializeProfiler();
      
      // Clear any previous audio buffer
      eagleService.clearAudioBuffer();
      
      setEnrollmentState(prev => ({
        ...prev,
        isEnrolling: true,
        isRecording: true,
        progress: 0,
        error: null,
        success: false,
      }));
      
      await startRecording();
      console.log('✅ Enrollment started successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start enrollment';
      console.error('❌ Failed to start enrollment:', error);
      setEnrollmentState(prev => ({
        ...prev,
        error: errorMessage,
        isEnrolling: false,
        isRecording: false,
      }));
      if (onError) onError(errorMessage);
    }
  }, [speakerName, requestPermission, startRecording, onError]);

  const stopEnrollment = useCallback(() => {
    setEnrollmentState(prev => ({
      ...prev,
      isEnrolling: false,
      isRecording: false,
    }));
    stopRecording();
    eagleService.resetProfiler();
  }, [stopRecording]);

  const resetForm = useCallback(() => {
    setSpeakerName('');
    setEnrollmentState({
      isEnrolling: false,
      isRecording: false,
      progress: 0,
      error: null,
      success: false,
    });
    eagleService.resetProfiler();
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
      eagleService.cleanup();
    };
  }, [cleanupAudio]);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Speaker Enrollment
      </h2>

      <div className="mb-6">
        <label htmlFor="speakerName" className="block text-sm font-medium text-gray-700 mb-2">
          Speaker Name
        </label>
        <input
          id="speakerName"
          type="text"
          value={speakerName}
          onChange={(e) => setSpeakerName(e.target.value)}
          placeholder="Enter your name"
          disabled={enrollmentState.isEnrolling}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {enrollmentState.isEnrolling && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Enrollment Progress</span>
            <span>{enrollmentState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${enrollmentState.progress}%` }}
            />
          </div>
        </div>
      )}

      {isRecording && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Audio Level</span>
            <span>{duration.toFixed(1)}s</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        {!enrollmentState.isEnrolling ? (
          <button
            onClick={startEnrollment}
            disabled={!speakerName.trim()}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Start Enrollment
          </button>
        ) : (
          <button
            onClick={stopEnrollment}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Stop Enrollment
          </button>
        )}
        
        <button
          onClick={resetForm}
          disabled={enrollmentState.isEnrolling}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
      </div>

      {enrollmentState.error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="text-sm">{enrollmentState.error}</p>
        </div>
      )}

      {audioError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="text-sm">{audioError}</p>
        </div>
      )}

      {enrollmentState.success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <p className="text-sm">✅ Speaker profile created successfully!</p>
        </div>
      )}

      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Enter your name and click "Start Enrollment"</li>
          <li>Speak clearly for about 10-15 seconds</li>
          <li>The progress bar will show enrollment completion</li>
          <li>Your voice profile will be saved automatically</li>
        </ul>
      </div>
    </div>
  );
}; 