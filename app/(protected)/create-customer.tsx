import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAlert } from '../../components/CustomAlert';
import { useSnackbar } from '../../components/SnackbarContext';

interface CustomerFormData {
    name: string;
    phone: string;
    notes: string;
}

export default function CreateCustomerScreen() {
    const { showSnackbar } = useSnackbar();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        phone: '',
        notes: '',
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Reset form when screen is focused to prevent state leakage from edit screen
    useFocusEffect(
        useCallback(() => {
            setFormData({
                name: '',
                phone: '',
                notes: '',
            });
            setErrors({});
        }, [])
    );

    const updateFormData = (field: keyof CustomerFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Customer name is required';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[+]?[\d\s\-()]{10,}$/.test(formData.phone.trim())) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Helper function to get merchant ID
    const getMerchantId = async (userId: string) => {
        const userDoc = await firestore().collection('users').doc(userId).get();
        const userData = userDoc.exists() ? userDoc.data() : null;
        const merchantIds = userData?.marchants || [];

        if (merchantIds.length === 0) {
            throw new Error('No merchant found');
        }

        return merchantIds[0];
    };

    // Helper function to prepare customer data
    const prepareCustomerData = (merchantId: string, userId: string) => {
        const now = new Date();

        return {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            notes: formData.notes.trim() || null,
            merchantId,
            createdUserId: userId,
            updatedUserId: userId,
            createdAt: now,
            updatedAt: now,
        };
    };

    const handleCreate = async () => {
        if (!validateForm()) {
            showSnackbar('Please fix the errors in the form', 'error');
            return;
        }

        setLoading(true);
        try {
            const user = auth().currentUser;
            if (!user) {
                showSnackbar('User not authenticated', 'error');
                return;
            }

            try {
                // Get merchant ID
                const merchantId = await getMerchantId(user.uid);

                // Prepare customer data
                const customerData = prepareCustomerData(merchantId, user.uid);

                // Save to Firestore
                await firestore().collection('customers').add(customerData);

                showSnackbar('Customer created successfully!', 'success');
                
                // Show options to user
                showAlert({
                    title: 'Customer Created',
                    message: 'What would you like to do next?',
                    type: 'success',
                    buttons: [
                        {
                            text: 'Add Another Customer',
                            onPress: () => {
                                // Reset form for new customer
                                setFormData({
                                    name: '',
                                    phone: '',
                                    notes: '',
                                });
                                setErrors({});
                                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                            },
                        },
                        {
                            text: 'Go to Customer List',
                            onPress: () => router.push('/(protected)/customers'),
                        },
                    ],
                });
            } catch (error) {
                if (error instanceof Error && error.message === 'No merchant found') {
                    showSnackbar('No merchant found. Please set up merchant first.', 'error');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error creating customer:', error);
            showSnackbar('Failed to create customer. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.push('/(protected)/customers')}
                        activeOpacity={0.7}
                    >
                        <Feather name="arrow-left" size={24} color="#1976d2" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.title}>Add New Customer</Text>
                        <Text style={styles.subtitle}>Build your customer relationships</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formContainer}>
                    {/* Customer Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Customer Name *</Text>
                        <TextInput
                            style={[styles.input, errors.name && styles.inputError]}
                            value={formData.name}
                            onChangeText={(value) => updateFormData('name', value)}
                            placeholder="Enter customer name"
                            placeholderTextColor="#9e9e9e"
                            autoCapitalize="words"
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Phone Number */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number *</Text>
                        <TextInput
                            style={[styles.input, errors.phone && styles.inputError]}
                            value={formData.phone}
                            onChangeText={(value) => updateFormData('phone', value)}
                            placeholder="Enter phone number"
                            placeholderTextColor="#9e9e9e"
                            keyboardType="phone-pad"
                            autoComplete="tel"
                        />
                        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                    </View>

                    {/* Notes */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput
                            style={[styles.textArea]}
                            value={formData.notes}
                            onChangeText={(value) => updateFormData('notes', value)}
                            placeholder="Add any notes about this customer..."
                            placeholderTextColor="#9e9e9e"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={[styles.createButton, loading && styles.createButtonDisabled]}
                    onPress={handleCreate}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.createButtonText}>Create Customer</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 16,
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
        marginRight: 12,
        marginLeft: -8,
    },
    headerTitleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#212529',
    },
    subtitle: {
        color: '#6c757d',
        fontSize: 13,
        marginTop: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    formContainer: {
        padding: 16,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151',
    },
    inputError: {
        borderColor: '#ef4444',
    },
    textArea: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151',
        minHeight: 100,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 4,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    createButton: {
        backgroundColor: '#1976d2',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    createButtonDisabled: {
        backgroundColor: '#9ca3af',
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
