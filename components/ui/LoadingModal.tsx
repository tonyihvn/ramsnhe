import React from 'react';

interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  progress?: number; // 0-100
}

const LoadingModal: React.FC<LoadingModalProps> = ({ 
  isOpen, 
  title = 'Loading', 
  message = 'Please wait while we load your form...', 
  progress 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"></div>

        {/* Modal content */}
        <div className="relative bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          {/* Spinner */}
          <div className="mb-6 flex justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin"></div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-4">
            {message}
          </p>

          {/* Progress bar */}
          {progress !== undefined && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
          )}

          {/* Progress text */}
          {progress !== undefined && (
            <p className="text-xs text-gray-500">
              {Math.round(progress)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
