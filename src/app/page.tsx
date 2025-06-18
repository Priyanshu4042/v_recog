'use client';

import React, { useState, useEffect } from 'react';
import { SpeakerEnrollment } from '@/components/SpeakerEnrollment';
import { SpeakerRecognition } from '@/components/SpeakerRecognition';
import { eagleService, EagleService } from '@/utils/eagle';
import { speakerStorage } from '@/utils/storage';

type TabType = 'enrollment' | 'recognition';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('enrollment');
  const [isSupported, setIsSupported] = useState(true);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    timestamp: Date;
  }>>([]);

  // Check browser support on mount
  useEffect(() => {
    const supported = EagleService.isSupported();
    setIsSupported(supported);
    
    if (!supported) {
      addNotification(
        'Your browser does not support all required features for voice identification. Please use a modern browser.',
        'error'
      );
    }
  }, []);

  // Load enrolled speakers count
  const loadEnrolledCount = async () => {
    try {
      const profiles = await speakerStorage.getAllSpeakerProfiles();
      setEnrolledCount(profiles.length);
    } catch (error) {
      console.error('Failed to load enrolled speakers count:', error);
    }
  };

  // Load count on mount and when tab changes
  useEffect(() => {
    loadEnrolledCount();
  }, [activeTab]);

  // Add notification
  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  // Handle enrollment completion
  const handleEnrollmentComplete = () => {
    addNotification('Speaker enrolled successfully!', 'success');
    loadEnrolledCount();
  };

  // Handle speaker identification
  const handleSpeakerIdentified = (speakerName: string, confidence: number) => {
    addNotification(
      `Identified: ${speakerName} (${(confidence * 100).toFixed(1)}% confidence)`,
      'info'
    );
  };

  // Handle errors
  const handleError = (error: string) => {
    addNotification(error, 'error');
  };

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Voice User Identification
              </h1>
              <p className="text-sm text-gray-600">
                Powered by Picovoice Eagle
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{enrolledCount}</span> enrolled speakers
              </div>
              
              {!isSupported && (
                <div className="flex items-center text-red-600">
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Not Supported</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300 ${
                notification.type === 'success'
                  ? 'bg-green-100 border border-green-400 text-green-700'
                  : notification.type === 'error'
                  ? 'bg-red-100 border border-red-400 text-red-700'
                  : 'bg-blue-100 border border-blue-400 text-blue-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm">{notification.message}</p>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('enrollment')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'enrollment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Speaker Enrollment
            </button>
            <button
              onClick={() => setActiveTab('recognition')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'recognition'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Speaker Recognition
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'enrollment' && (
            <SpeakerEnrollment
              onEnrollmentComplete={handleEnrollmentComplete}
              onError={handleError}
            />
          )}
          
          {activeTab === 'recognition' && (
            <SpeakerRecognition
              onSpeakerIdentified={handleSpeakerIdentified}
              onError={handleError}
            />
          )}
        </div>

        {/* Setup Instructions */}
        <div className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            🚀 Setup Instructions
          </h3>
          
          <div className="space-y-4 text-sm text-yellow-700">
            <div>
              <h4 className="font-semibold mb-2">✅ 1. Picovoice AccessKey:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li className="text-green-700 font-medium">✅ AccessKey is configured and ready to use</li>
                <li>The application will attempt to use real Eagle SDK</li>
                <li>Falls back to demo mode if model file is missing</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Download Eagle Model:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Download the Eagle model file from your Picovoice dashboard</li>
                <li>Place it in <code className="bg-yellow-100 px-1 rounded">public/models/eagle_params.pv</code></li>
                <li>See <code className="bg-yellow-100 px-1 rounded">public/models/README.md</code> for detailed instructions</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Browser Requirements:</h4>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Modern browser with microphone access support</li>
                <li>HTTPS connection (required for microphone access)</li>
                <li>IndexedDB support for storing voice profiles</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded">
            <p className="text-green-800 text-sm">
              <strong>✅ AccessKey Ready:</strong> Your application now uses a real Picovoice AccessKey with smart fallback. 
              Download the Eagle model file to enable full SDK functionality!
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>
              Built with Next.js, React, and Picovoice Eagle SDK
            </p>
            <p className="mt-1">
              For demo purposes - replace mock implementation with actual Eagle SDK integration
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
