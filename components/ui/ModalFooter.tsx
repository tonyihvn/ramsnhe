import React from 'react';
import Button from './Button';

interface ModalFooterProps {
  onCancel?: () => void;
  onSave?: () => void;
  cancelText?: string;
  saveText?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
  isDangerous?: boolean;
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onSave,
  cancelText = 'Cancel',
  saveText = 'Save',
  children,
  isLoading = false,
  isDangerous = false,
}) => {
  if (children) {
    return (
      <div className="flex justify-end gap-3">
        {children}
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-3">
      {onCancel && (
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelText}
        </Button>
      )}
      {onSave && (
        <Button
          variant={isDangerous ? 'danger' : 'primary'}
          onClick={onSave}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : saveText}
        </Button>
      )}
    </div>
  );
};

export default ModalFooter;
