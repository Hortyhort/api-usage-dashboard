import type { ReactNode } from 'react';
import { useToast } from './ToastProvider';

const CopyableValue = ({
  display,
  value,
  label,
  className,
}: {
  display: ReactNode;
  value: string;
  label: string;
  className?: string;
}) => {
  const { addToast } = useToast();

  const handleCopy = async () => {
    if (!navigator?.clipboard) {
      addToast({
        title: 'Clipboard unavailable',
        description: 'Use HTTPS or localhost to enable clipboard access.',
        variant: 'warning',
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      addToast({
        title: 'Copied',
        description: `${label} copied to clipboard.`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Copy failed',
        description: 'Clipboard permissions were denied.',
        variant: 'error',
      });
    }
  };

  return (
    <button type="button" onClick={handleCopy} className={`text-left hover:text-white transition-colors ${className ?? ''}`} aria-label={`Copy ${label}`}>
      {display}
    </button>
  );
};

export default CopyableValue;
