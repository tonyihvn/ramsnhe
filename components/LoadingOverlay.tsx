import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  progress?: number; // 0-100
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  progress = 0,
  message = 'Loading data...' 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-9999 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-96 max-w-full mx-4">
        {/* Header */}
        <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">
          Initializing Application
        </h2>

        {/* Progress Bar Container */}
        <div className="mb-6">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-600 mt-3 font-medium">
            {progress}% Complete
          </p>
        </div>

        {/* Status Message */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            {message}
          </p>
          
          {/* Animated Loading Dots */}
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>

        {/* Tips Section (optional) */}
        <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-200">
          <p className="text-xs text-blue-700 text-center">
            ℹ️ Fetching your programs, activities, and facilities...
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
