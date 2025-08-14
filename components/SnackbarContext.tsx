import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Snackbar, SnackbarType } from './Snackbar';

interface SnackbarContextProps {
  showSnackbar: (message: string, type?: SnackbarType, duration?: number, action?: { label: string; onPress: () => void }) => void;
  hideSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextProps>({
  showSnackbar: () => {},
  hideSnackbar: () => {}
});

export const useSnackbar = () => useContext(SnackbarContext);

interface SnackbarProviderProps {
  children: ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SnackbarType>('info');
  const [duration, setDuration] = useState(3000);
  const [action, setAction] = useState<{ label: string; onPress: () => void } | undefined>(undefined);

  const showSnackbar = (
    message: string,
    type: SnackbarType = 'info',
    duration: number = 3000,
    action?: { label: string; onPress: () => void }
  ) => {
    setMessage(message);
    setType(type);
    setDuration(duration);
    setAction(action);
    setVisible(true);
  };

  const hideSnackbar = () => {
    setVisible(false);
  };

  const contextValue = useMemo(() => ({
    showSnackbar,
    hideSnackbar
  }), []);
  
  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      <Snackbar
        visible={visible}
        message={message}
        type={type}
        duration={duration}
        action={action}
        onDismiss={hideSnackbar}
        position="top"
      />
    </SnackbarContext.Provider>
  );
};
