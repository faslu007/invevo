import { Feather } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
    title: string;
    message?: string;
    buttons?: AlertButton[];
    type?: 'info' | 'success' | 'warning' | 'error';
    dismissible?: boolean;
}

interface AlertContextType {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

interface AlertProviderProps {
    children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.8));

    const showAlert = useCallback((options: AlertOptions) => {
        // Function to close alert
        const closeAlert = () => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setVisible(false);
                setAlertOptions(null);
            });
        };

        // Set default button if none provided
        const defaultButtons: AlertButton[] = [
            {
                text: 'OK',
                onPress: closeAlert,
                style: 'default',
            },
        ];

        setAlertOptions({
            ...options,
            buttons: options.buttons || defaultButtons,
            dismissible: options.dismissible ?? true,
        });
        setVisible(true);

        // Animate in
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, scaleAnim]);

    const hideAlert = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            setAlertOptions(null);
        });
    }, [fadeAnim, scaleAnim]);

    const handleButtonPress = (button: AlertButton) => {
        if (button.onPress) {
            button.onPress();
        }
        hideAlert();
    };

    const getIconForType = (type?: string) => {
        switch (type) {
            case 'success':
                return { name: 'check-circle' as const, color: '#4ade80' };
            case 'warning':
                return { name: 'alert-triangle' as const, color: '#fbbf24' };
            case 'error':
                return { name: 'x-circle' as const, color: '#ef4444' };
            default:
                return { name: 'info' as const, color: '#3b82f6' };
        }
    };

    const getButtonStyle = (style?: string) => {
        switch (style) {
            case 'destructive':
                return styles.destructiveButton;
            case 'cancel':
                return styles.cancelButton;
            default:
                return styles.defaultButton;
        }
    };

    const getButtonTextStyle = (style?: string) => {
        switch (style) {
            case 'destructive':
                return styles.destructiveButtonText;
            case 'cancel':
                return styles.cancelButtonText;
            default:
                return styles.defaultButtonText;
        }
    };

    const contextValue: AlertContextType = useMemo(() => ({
        showAlert,
        hideAlert,
    }), [showAlert, hideAlert]);

    const icon = getIconForType(alertOptions?.type);

    return (
        <AlertContext.Provider value={contextValue}>
            {children}
            {visible && alertOptions && (
                <Modal
                    transparent
                    visible={visible}
                    animationType="none"
                    onRequestClose={() => {
                        if (alertOptions.dismissible) {
                            hideAlert();
                        }
                    }}
                >
                <SafeAreaView style={styles.overlay}>
                    <Animated.View 
                        style={[
                            styles.backdrop,
                            { opacity: fadeAnim }
                        ]}
                    >
                        <TouchableOpacity 
                            style={StyleSheet.absoluteFill}
                            onPress={() => {
                                if (alertOptions.dismissible) {
                                    hideAlert();
                                }
                            }}
                            activeOpacity={1}
                        />
                    </Animated.View>
                    
                    <View style={styles.container}>
                        <Animated.View
                            style={[
                                styles.alertBox,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ scale: scaleAnim }],
                                },
                            ]}
                        >
                            {/* Icon */}
                            <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
                                <Feather name={icon.name} size={32} color={icon.color} />
                            </View>

                            {/* Content */}
                            <View style={styles.content}>
                                <Text style={styles.title}>{alertOptions.title}</Text>
                                {alertOptions.message && (
                                    <Text style={styles.message}>{alertOptions.message}</Text>
                                )}
                            </View>

                            {/* Buttons */}
                            <View style={styles.buttonContainer}>
                                {alertOptions.buttons?.map((button, index) => (
                                <TouchableOpacity
                                    key={`alert-button-${button.text}-${index}`}
                                    style={[
                                        styles.button,
                                        getButtonStyle(button.style),
                                        alertOptions.buttons!.length === 1 && styles.singleButton,
                                        index === 0 && alertOptions.buttons!.length > 1 && styles.firstButton,
                                        index === alertOptions.buttons!.length - 1 && alertOptions.buttons!.length > 1 && styles.lastButton,
                                    ]}
                                    onPress={() => handleButtonPress(button)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                                        {button.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            </View>
                        </Animated.View>
                    </View>
                </SafeAreaView>
            </Modal>
            )}
        </AlertContext.Provider>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    alertBox: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        width: Math.min(width - 40, 340),
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 15,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    content: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 28,
    },
    message: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    singleButton: {
        flex: 1,
    },
    firstButton: {
        marginRight: 6,
    },
    lastButton: {
        marginLeft: 6,
    },
    defaultButton: {
        backgroundColor: '#1976d2',
    },
    cancelButton: {
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    destructiveButton: {
        backgroundColor: '#ef4444',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    defaultButtonText: {
        color: '#ffffff',
    },
    cancelButtonText: {
        color: '#6b7280',
    },
    destructiveButtonText: {
        color: '#ffffff',
    },
});
