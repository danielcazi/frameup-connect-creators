import React from 'react';

interface ApplicationModalProps {
  project: {
    id: string;
    title: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// Placeholder component - will be implemented in next prompt
const ApplicationModal: React.FC<ApplicationModalProps> = ({ project, onClose, onSuccess }) => {
  return null;
};

export default ApplicationModal;
