import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle
} from 'react-native';

export type SnackbarType = 'success' | 'error' | 'info' | 'warning';

export interface SnackbarProps {
  message: string;
  type?: SnackbarType;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
  position?: 'top' | 'bottom';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  type = 'info',
  action,
  duration = 3000,
  onDismiss,
  visible,
  position = 'top',
  style,
  textStyle
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  
  // Colors based on type
  const bgColors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800'
  };

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  }, [fadeAnim, translateY, position, onDismiss]);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      handleDismiss();
    }
  }, [visible, duration, fadeAnim, translateY, handleDismiss]);

  if (!isVisible && !visible) {
    return null;
  }

  const { width } = Dimensions.get('window');

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: bgColors[type],
          [position]: position === 'top' ? 40 : 20, // Increased top margin for status bar
          width: width - 32,
          opacity: fadeAnim,
          transform: [{ translateY }]
        },
        style
      ]}
    >
      <Text style={[styles.message, textStyle]}>{message}</Text>
      
      {action && (
        <TouchableOpacity 
          onPress={() => {
            action.onPress();
            handleDismiss();
          }} 
          style={styles.actionButton}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    zIndex: 1000
  },
  message: {
    color: 'white',
    flex: 1,
    fontSize: 14
  },
  actionButton: {
    marginHorizontal: 8,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textTransform: 'uppercase'
  },
  closeButton: {
    marginLeft: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20
  }
});
