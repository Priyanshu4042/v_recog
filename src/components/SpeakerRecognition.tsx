'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { speakerStorage } from '@/utils/storage';
import { eagleService } from '@/utils/eagle';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { SpeakerProfile, RecognitionState } from '@/types';

interface SpeakerRecognitionProps {
  onSpeakerIdentified?: (speakerName: string, confidence: number) => void;
  onError?: (error: string) => void;
}

export const SpeakerRecognition: React.FC<SpeakerRecognitionProps> = ({
  onSpeakerIdentified,
  onError,
}) => {
  const [enrolledProfiles, setEnrolledProfiles] = useState<SpeakerProfile[]>([]);
  const [recognitionState, setRecognitionState] = useState<RecognitionState>({
    isRecognizing: false,
    isListening: false,
    identifiedSpeaker: null,
    confidence: 0,
    error: null,
  });

  const handleAudioData = useCallback(async (audioData: Int16Array) => {
    if (!recognitionState.isRecognizing) return;

    try {
      const result = await eagleService.recognizeAudio(audioData);
      const speakerName = eagleService.getSpeakerName(result.speakerIndex);
      
      console.log('Recognition result:', {
        speakerIndex: result.speakerIndex,
        speakerName: speakerName,
        confidence: result.confidence,
        isUnknown: speakerName === 'Unknown'
      });
      
      setRecognitionState(prev => ({
        ...prev,
        identifiedSpeaker: speakerName,
        confidence: result.confidence,
        error: null,
      }));

      if (onSpeakerIdentified && speakerName !== 'Unknown') {
        onSpeakerIdentified(speakerName, result.confidence);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recognition failed';
      console.error('Recognition error:', error);
      setRecognitionState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      if (onError) onError(errorMessage);
    }
  }, [recognitionState.isRecognizing, onSpeakerIdentified, onError]);

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

  // Load enrolled profiles
  const loadEnrolledProfiles = useCallback(async () => {
    try {
      const profiles = await speakerStorage.getAllSpeakerProfiles();
      setEnrolledProfiles(profiles);
      return profiles;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profiles';
      setRecognitionState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      if (onError) onError(errorMessage);
      return [];
    }
  }, [onError]);

  // Start recognition
  const startRecognition = useCallback(async () => {
    try {
      // Load enrolled profiles
      const profiles = await loadEnrolledProfiles();
      
      if (profiles.length === 0) {
        setRecognitionState(prev => ({
          ...prev,
          error: 'No enrolled speakers found. Please enroll at least one speaker first.',
        }));
        return;
      }

      // Request microphone permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setRecognitionState(prev => ({
          ...prev,
          error: 'Microphone permission is required for recognition',
        }));
        return;
      }

      // Initialize Eagle recognizer with enrolled profiles
      await eagleService.initializeRecognizer(profiles);

      // Start recognition
      setRecognitionState(prev => ({
        ...prev,
        isRecognizing: true,
        isListening: true,
        identifiedSpeaker: null,
        confidence: 0,
        error: null,
      }));

      // Start audio recording
      await startRecording();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recognition';
      setRecognitionState(prev => ({
        ...prev,
        error: errorMessage,
        isRecognizing: false,
        isListening: false,
      }));
      if (onError) onError(errorMessage);
    }
  }, [loadEnrolledProfiles, requestPermission, startRecording, onError]);

  // Stop recognition
  const stopRecognition = useCallback(() => {
    setRecognitionState(prev => ({
      ...prev,
      isRecognizing: false,
      isListening: false,
      identifiedSpeaker: null,
      confidence: 0,
    }));
    stopRecording();
  }, [stopRecording]);

  // Delete a speaker profile
  const deleteSpeaker = useCallback(async (speakerId: string) => {
    try {
      await speakerStorage.deleteSpeakerProfile(speakerId);
      await loadEnrolledProfiles();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete speaker';
      setRecognitionState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      if (onError) onError(errorMessage);
    }
  }, [loadEnrolledProfiles, onError]);

  // Load profiles on mount
  useEffect(() => {
    loadEnrolledProfiles();
  }, [loadEnrolledProfiles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      eagleService.cleanup();
    };
  }, [cleanupAudio]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Speaker Recognition
      </h2>

      {/* Enrolled Speakers List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Enrolled Speakers ({enrolledProfiles.length})
        </h3>
        
        {enrolledProfiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No speakers enrolled yet.</p>
            <p className="text-sm">Use the enrollment page to add speakers first.</p>
          </div>
        ) : (
          <div className="grid gap-2 max-h-32 overflow-y-auto">
            {enrolledProfiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <span className="font-medium text-gray-800">{profile.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {profile.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => deleteSpeaker(profile.id)}
                  disabled={recognitionState.isRecognizing}
                  className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recognition Status */}
      {recognitionState.isRecognizing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-blue-800">🎤 Listening...</span>
            <span className="text-sm text-blue-600">{duration.toFixed(1)}s</span>
          </div>
          
          {/* Audio Level */}
          <div className="mb-3">
            <div className="flex justify-between text-sm text-blue-600 mb-1">
              <span>Audio Level</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>

          {/* Current Identification */}
          <div className="text-center">
            {recognitionState.identifiedSpeaker ? (
              <div>
                <div className="text-lg font-bold text-gray-800">
                  {recognitionState.identifiedSpeaker}
                </div>
                <div className={`text-sm ${getConfidenceColor(recognitionState.confidence)}`}>
                  {getConfidenceText(recognitionState.confidence)} Confidence 
                  ({(recognitionState.confidence * 100).toFixed(1)}%)
                </div>
              </div>
            ) : (
              <div className="text-gray-500">Waiting for speech...</div>
            )}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 mb-6">
        {!recognitionState.isRecognizing ? (
          <button
            onClick={startRecognition}
            disabled={enrolledProfiles.length === 0}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Start Recognition
          </button>
        ) : (
          <button
            onClick={stopRecognition}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Stop Recognition
          </button>
        )}
        
        <button
          onClick={loadEnrolledProfiles}
          disabled={recognitionState.isRecognizing}
          className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Error Messages */}
      {recognitionState.error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="text-sm">{recognitionState.error}</p>
        </div>
      )}

      {audioError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <p className="text-sm">{audioError}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Make sure you have enrolled speakers first</li>
          <li>Click "Start Recognition" to begin listening</li>
          <li>Speak normally - the system will identify the speaker</li>
          <li>The confidence level shows how certain the identification is</li>
        </ul>
      </div>
    </div>
  );
}; 