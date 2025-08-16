import { Feather } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAlert } from '../../components/CustomAlert';
import { useSnackbar } from '../../components/SnackbarContext';

interface CustomerFormData {
    name: string;
    phone: string;
    notes: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    notes?: string;
    merchantId: string;
    createdUserId: string;
    updatedUserId: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function EditCustomerScreen() {
    const { showSnackbar } = useSnackbar();
    const { showAlert } = useAlert();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [formData, setFormData] = useState<CustomerFormData>({
        name: '',
        phone: '',
        notes: '',
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const fetchCustomer = useCallback(async () => {
        try {
            setInitialLoading(true);
            const customerDoc = await firestore().collection('customers').doc(id).get();
            
            if (!customerDoc.exists) {
                showSnackbar('Customer not found', 'error');
                router.back();
                return;
            }

            const customerData = customerDoc.data() as any;
            const customerWithId: Customer = {
                id: customerDoc.id,
                name: customerData.name,
                phone: customerData.phone,
                notes: customerData.notes,
                merchantId: customerData.merchantId,
                createdUserId: customerData.createdUserId,
                updatedUserId: customerData.updatedUserId,
                createdAt: customerData.createdAt?.toDate ? customerData.createdAt.toDate() : new Date(customerData.createdAt),
                updatedAt: customerData.updatedAt?.toDate ? customerData.updatedAt.toDate() : new Date(customerData.updatedAt),
            };

            setCustomer(customerWithId);
            setFormData({
                name: customerWithId.name,
                phone: customerWithId.phone,
                notes: customerWithId.notes || '',
            });
        } catch (error) {
            console.error('Error fetching customer:', error);
            showSnackbar('Failed to load customer details', 'error');
            router.back();
        } finally {
            setInitialLoading(false);
        }
    }, [id, showSnackbar]);

    useEffect(() => {
        if (id) {
            fetchCustomer();
        }
    }, [id, fetchCustomer]);

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

    const handleUpdate = async () => {
        if (!validateForm()) {
            showSnackbar('Please fix the errors in the form', 'error');
            return;
        }

        if (!customer) {
            showSnackbar('Customer data not available', 'error');
            return;
        }

        setLoading(true);
        try {
            const user = auth().currentUser;
            if (!user) {
                showSnackbar('User not authenticated', 'error');
                return;
            }

            const now = new Date();
            const updatedData = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                notes: formData.notes.trim() || null,
                updatedUserId: user.uid,
                updatedAt: now,
            };

            await firestore().collection('customers').doc(customer.id).update(updatedData);

            showSnackbar('Customer updated successfully!', 'success');
            
            // Show options to user
            showAlert({
                title: 'Customer Updated',
                message: 'What would you like to do next?',
                type: 'success',
                buttons: [
                    {
                        text: 'Add Another Customer',
                        onPress: () => router.push('/(protected)/create-customer' as any),
                    },
                    {
                        text: 'Go to Customer List',
                        onPress: () => router.push('/(protected)/customers'),
                    },
                ],
            });
        } catch (error) {
            console.error('Error updating customer:', error);
            showSnackbar('Failed to update customer. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        showAlert({
            title: 'Delete Customer',
            message: 'Are you sure you want to delete this customer? This action cannot be undone.',
            type: 'error',
            buttons: [
                { 
                    text: 'Cancel', 
                    style: 'cancel' 
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await firestore().collection('customers').doc(id).delete();
                            showSnackbar('Customer deleted successfully', 'success');
                            router.push('/(protected)/customers');
                        } catch (error) {
                            console.error('Error deleting customer:', error);
                            showSnackbar('Failed to delete customer', 'error');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ],
        });
    };

    if (initialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1976d2" />
                    <Text style={styles.loadingText}>Loading customer details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!customer) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Customer not found</Text>
                </View>
            </SafeAreaView>
        );
    }

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
                        <Text style={styles.title}>Edit Customer</Text>
                        <Text style={styles.subtitle}>Update customer information</Text>
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

                    {/* Customer Info */}
                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>Customer Information</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Created:</Text>
                            <Text style={styles.infoValue}>
                                {customer.createdAt?.toLocaleDateString('en-IN')} at {customer.createdAt?.toLocaleTimeString('en-IN')}
                            </Text>
                        </View>
                        {customer.updatedAt && customer.updatedAt.getTime() !== customer.createdAt?.getTime() && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Last Updated:</Text>
                                <Text style={styles.infoValue}>
                                    {customer.updatedAt?.toLocaleDateString('en-IN')} at {customer.updatedAt?.toLocaleTimeString('en-IN')}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomContainer}>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.deleteButton, loading && styles.buttonDisabled]}
                        onPress={handleDelete}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.updateButton, loading && styles.buttonDisabled]}
                        onPress={handleUpdate}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.updateButtonText}>Update Customer</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    loadingText: {
        color: '#6c757d',
        marginTop: 12,
        fontSize: 16,
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
        paddingBottom: 120,
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
    infoSection: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#6c757d',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
        textAlign: 'right',
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
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteButton: {
        backgroundColor: '#ef4444',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        flex: 1,
    },
    updateButton: {
        backgroundColor: '#1976d2',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        flex: 2,
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    updateButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
