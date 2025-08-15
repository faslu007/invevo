import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSnackbar } from '../../components/SnackbarContext';

interface Product {
    id: string;
    productName: string;
    sku: string;
    category: string;
    brand: string;
    sellingPrice: number;
    cost: number;
    defaultDiscount: number;
    stockQuantity: number;
    minStock: number;
    measurementUnit: string;
    imageUrl?: string;
    expiryDate?: Date;
    additionalNotes?: string;
    vendorDetails?: string;
    active: boolean;
    merchantId: string;
    createdUserId: string;
    updatedUserId: string;
    createdAt: Date;
    updatedAt: Date;
}

interface ProductFormData {
    productName: string;
    category: string;
    brand: string;
    sellingPrice: string;
    cost: string;
    defaultDiscount: string;
    stockQuantity: string;
    minStock: string;
    measurementUnit: string;
    imageUrl: string;
    expiryDate: string;
    additionalNotes: string;
    vendorDetails: string;
    active: boolean;
}

const measurementUnits = [
    { label: 'Select Unit', value: '' },
    { label: 'Kilogram (kg)', value: 'kg' },
    { label: 'Gram (g)', value: 'g' },
    { label: 'Piece', value: 'piece' },
    { label: 'Bag', value: 'bag' },
    { label: 'Liters (L)', value: 'liters' },
    { label: 'Unit', value: 'unit' },
    { label: 'Box', value: 'box' },
    { label: 'Dozen', value: 'dozen' },
    { label: 'Packet', value: 'packet' },
];

// Separate ProductEditForm component to reduce main component complexity
function ProductEditFormUI({
    formData,
    errors,
    loading,
    handleUpdate,
    handleDelete,
    updateFormData,
    showDatePicker,
    setShowDatePicker,
    selectedDate,
    setSelectedDate,
    showUnitPicker,
    setShowUnitPicker,
    pickImage,
    takePicture,
    removeImage,
    uploading,
    imageUri,
    formatDateToIndian,
}: {
    formData: ProductFormData;
    errors: { [key: string]: string };
    loading: boolean;
    handleUpdate: () => Promise<void>;
    handleDelete: () => Promise<void>;
    updateFormData: (field: keyof ProductFormData, value: string | boolean) => void;
    showDatePicker: boolean;
    setShowDatePicker: (show: boolean) => void;
    selectedDate: Date | null;
    setSelectedDate: (date: Date | null) => void;
    showUnitPicker: boolean;
    setShowUnitPicker: (show: boolean) => void;
    pickImage: () => Promise<void>;
    takePicture: () => Promise<void>;
    removeImage: () => void;
    uploading: boolean;
    imageUri: string | null;
    formatDateToIndian: (date: Date) => string;
}) {
    // The UI rendering logic will be moved here later
    return null;
}

export default function EditProductScreen() {
    const { showSnackbar } = useSnackbar();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<ProductFormData>({
        productName: '',
        category: '',
        brand: '',
        sellingPrice: '',
        cost: '',
        defaultDiscount: '0',
        stockQuantity: '',
        minStock: '5',
        measurementUnit: '',
        imageUrl: '',
        expiryDate: '',
        additionalNotes: '',
        vendorDetails: '',
        active: true,
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Image upload states
    const [uploading, setUploading] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);

    const fetchProduct = useCallback(async () => {
        try {
            const productDoc = await firestore().collection('products').doc(id).get();
            if (productDoc.exists()) {
                const productData = productDoc.data() as Omit<Product, 'id'>;
                const fullProduct: Product = { id: productDoc.id, ...productData };
                setProduct(fullProduct);

                // Populate form data
                setFormData({
                    productName: fullProduct.productName,
                    category: fullProduct.category,
                    brand: fullProduct.brand,
                    sellingPrice: fullProduct.sellingPrice.toString(),
                    cost: fullProduct.cost.toString(),
                    defaultDiscount: fullProduct.defaultDiscount.toString(),
                    stockQuantity: fullProduct.stockQuantity.toString(),
                    minStock: fullProduct.minStock ? fullProduct.minStock.toString() : '5',
                    measurementUnit: fullProduct.measurementUnit,
                    imageUrl: fullProduct.imageUrl || '',
                    expiryDate: fullProduct.expiryDate ? formatDateToIndian(fullProduct.expiryDate) : '',
                    additionalNotes: fullProduct.additionalNotes || '',
                    vendorDetails: fullProduct.vendorDetails || '',
                    active: fullProduct.active,
                });

                // Set the selected date for the date picker
                if (fullProduct.expiryDate) {
                    setSelectedDate(fullProduct.expiryDate);
                }
            } else {
                showSnackbar('Product not found', 'error');
                router.push('/(protected)/product');
            }
        } catch (error) {
            console.error('Error fetching product:', error);
            showSnackbar('Failed to load product', 'error');
            router.push('/(protected)/product');
        } finally {
            setInitialLoading(false);
        }
    }, [id, showSnackbar]);

    useEffect(() => {
        if (id) {
            fetchProduct();
        }
    }, [id, fetchProduct]);

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.productName.trim()) {
            newErrors.productName = 'Product name is required';
        }
        if (!formData.category.trim()) {
            newErrors.category = 'Category is required';
        }
        if (!formData.brand.trim()) {
            newErrors.brand = 'Brand is required';
        }
        if (!formData.sellingPrice.trim()) {
            newErrors.sellingPrice = 'Selling price is required';
        } else if (isNaN(Number(formData.sellingPrice)) || Number(formData.sellingPrice) <= 0) {
            newErrors.sellingPrice = 'Please enter a valid selling price';
        }
        if (!formData.cost.trim()) {
            newErrors.cost = 'Cost is required';
        } else if (isNaN(Number(formData.cost)) || Number(formData.cost) <= 0) {
            newErrors.cost = 'Please enter a valid cost';
        }
        if (!formData.stockQuantity.trim()) {
            newErrors.stockQuantity = 'Stock quantity is required';
        } else if (isNaN(Number(formData.stockQuantity)) || Number(formData.stockQuantity) < 0) {
            newErrors.stockQuantity = 'Please enter a valid stock quantity';
        }
        if (!formData.minStock.trim()) {
            newErrors.minStock = 'Minimum stock is required';
        } else if (isNaN(Number(formData.minStock)) || Number(formData.minStock) <= 0) {
            newErrors.minStock = 'Please enter a valid minimum stock greater than 0';
        }
        if (!formData.measurementUnit) {
            newErrors.measurementUnit = 'Measurement unit is required';
        }
        if (formData.defaultDiscount && (isNaN(Number(formData.defaultDiscount)) || Number(formData.defaultDiscount) < 0 || Number(formData.defaultDiscount) > 100)) {
            newErrors.defaultDiscount = 'Discount must be between 0 and 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Helper function to prepare product update data
    const prepareUpdateData = (userId: string) => {
        // Parse dates from Indian format (DD/MM/YYYY)
        const expiryDate = formData.expiryDate ? (() => {
            const isoDate = parseIndianDateToISO(formData.expiryDate);
            return isoDate ? new Date(isoDate) : null;
        })() : null;
        const now = new Date();

        return {
            productName: formData.productName.trim(),
            category: formData.category.trim(),
            brand: formData.brand.trim(),
            sellingPrice: Number(formData.sellingPrice),
            cost: Number(formData.cost),
            defaultDiscount: Number(formData.defaultDiscount) || 0,
            stockQuantity: Number(formData.stockQuantity),
            minStock: Number(formData.minStock),
            measurementUnit: formData.measurementUnit,
            imageUrl: formData.imageUrl.trim() || null,
            expiryDate: expiryDate,
            additionalNotes: formData.additionalNotes.trim() || null,
            vendorDetails: formData.vendorDetails.trim() || null,
            active: formData.active,
            updatedUserId: userId,
            updatedAt: now,
        };
    };

    const handleUpdate = async () => {
        if (!validateForm()) {
            showSnackbar('Please fix the errors in the form', 'error');
            return;
        }

        if (!product) {
            showSnackbar('Product data not available', 'error');
            return;
        }

        setLoading(true);
        try {
            const user = auth().currentUser;
            if (!user) {
                showSnackbar('User not authenticated', 'error');
                return;
            }

            // Prepare update data
            const updateData = prepareUpdateData(user.uid);

    // Update in Firestore
            await firestore().collection('products').doc(product.id).update(updateData);

            showSnackbar('Product updated successfully!', 'success');
            router.push('/(protected)/product');
        } catch (error) {
            console.error('Error updating product:', error);
            showSnackbar('Failed to update product. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to perform product deletion
    const deleteProduct = async (productId: string) => {
        setLoading(true);
        try {
            await firestore().collection('products').doc(productId).delete();
            showSnackbar('Product deleted successfully!', 'success');
            router.push('/(protected)/product');
        } catch (error) {
            console.error('Error deleting product:', error);
            showSnackbar('Failed to delete product. Please try again.', 'error');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!product) return;

        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteProduct(product.id).catch(() => {
                            // Errors are already handled in deleteProduct
                        });
                    }
                }
            ]
        );
    };

    // Date utility functions for Indian format (DD/MM/YYYY)
    const formatDateToIndian = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return `${day}/${month}/${year}`;
    };

    const parseIndianDateToISO = (dateString: string): string => {
        if (!dateString) return '';
        const [day, month, year] = dateString.split('/');
        if (day && month && year) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return '';
    };

    const updateFormData = (field: keyof ProductFormData, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Image Upload Functions
    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'Permission to access camera roll is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
                await uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const takePicture = async () => {
        try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'Permission to access camera is required!');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
                await uploadImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking picture:', error);
            Alert.alert('Error', 'Failed to take picture. Please try again.');
        }
    };

    const uploadImage = async (uri: string) => {
        try {
            setUploading(true);
            const user = auth().currentUser;
            if (!user) throw new Error('User not authenticated');

            const filename = `products/${user.uid}/${Date.now()}.jpg`;
            const reference = storage().ref(filename);

            await reference.putFile(uri);
            const downloadURL = await reference.getDownloadURL();

            updateFormData('imageUrl', downloadURL);
            setImageUri(null); // Clear local URI since we now have the uploaded URL
        } catch (error) {
            console.error('Error uploading image:', error);
            Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
            setImageUri(null);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        Alert.alert(
            'Remove Image',
            'Are you sure you want to remove this image?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        updateFormData('imageUrl', '');
                        setImageUri(null);
                    },
                },
            ]
        );
    };

    if (initialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1976d2" />
                    <Text style={styles.loadingText}>Loading product...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!product) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.errorText}>Product not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(protected)/product')}>
                            <Text style={styles.backButtonText}>← Back</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>Edit Product</Text>
                    <Text style={styles.subtitle}>Update product information</Text>
                    <View style={styles.skuContainer}>
                        <Text style={styles.skuLabel}>SKU: </Text>
                        <Text style={styles.skuText}>{product.sku}</Text>
                    </View>
                </View>

                <View style={styles.form}>
                    {/* Basic Information Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📦 Product Information</Text>
                    </View>

                    {/* Product Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Name *</Text>
                        <TextInput
                            style={[styles.input, errors.productName && styles.inputError]}
                            placeholder="Enter product name"
                            placeholderTextColor="#999"
                            value={formData.productName}
                            onChangeText={(value) => updateFormData('productName', value)}
                            autoCapitalize="words"
                        />
                        {errors.productName && <Text style={styles.errorText}>{errors.productName}</Text>}
                    </View>

                    {/* Category and Brand Row */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Category *</Text>
                            <TextInput
                                style={[styles.input, errors.category && styles.inputError]}
                                placeholder="e.g., Electronics"
                                placeholderTextColor="#999"
                                value={formData.category}
                                onChangeText={(value) => updateFormData('category', value)}
                                autoCapitalize="words"
                            />
                            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                        </View>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Brand *</Text>
                            <TextInput
                                style={[styles.input, errors.brand && styles.inputError]}
                                placeholder="e.g., Samsung"
                                placeholderTextColor="#999"
                                value={formData.brand}
                                onChangeText={(value) => updateFormData('brand', value)}
                                autoCapitalize="words"
                            />
                            {errors.brand && <Text style={styles.errorText}>{errors.brand}</Text>}
                        </View>
                    </View>

                    {/* Pricing Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>💰 Pricing Information</Text>
                    </View>

                    {/* Pricing Row */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Selling Price (₹) *</Text>
                            <TextInput
                                style={[styles.input, errors.sellingPrice && styles.inputError]}
                                placeholder="0.00"
                                placeholderTextColor="#999"
                                value={formData.sellingPrice}
                                onChangeText={(value) => updateFormData('sellingPrice', value)}
                                keyboardType="decimal-pad"
                            />
                            {errors.sellingPrice && <Text style={styles.errorText}>{errors.sellingPrice}</Text>}
                        </View>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Cost (₹) *</Text>
                            <TextInput
                                style={[styles.input, errors.cost && styles.inputError]}
                                placeholder="0.00"
                                placeholderTextColor="#999"
                                value={formData.cost}
                                onChangeText={(value) => updateFormData('cost', value)}
                                keyboardType="decimal-pad"
                            />
                            {errors.cost && <Text style={styles.errorText}>{errors.cost}</Text>}
                        </View>
                    </View>

                    {/* Inventory Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📊 Inventory Management</Text>
                    </View>

                    {/* Stock and Unit Row */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Stock Quantity *</Text>
                            <TextInput
                                style={[styles.input, errors.stockQuantity && styles.inputError]}
                                placeholder="0"
                                placeholderTextColor="#999"
                                value={formData.stockQuantity}
                                onChangeText={(value) => updateFormData('stockQuantity', value)}
                                keyboardType="numeric"
                            />
                            {errors.stockQuantity && <Text style={styles.errorText}>{errors.stockQuantity}</Text>}
                        </View>
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                            <Text style={styles.label}>Unit *</Text>
                            <TouchableOpacity
                                style={[styles.input, styles.selectInput, errors.measurementUnit && styles.inputError]}
                                onPress={() => setShowUnitPicker(true)}
                            >
                                <Text style={[styles.selectText, !formData.measurementUnit && styles.placeholderText]}>
                                    {formData.measurementUnit
                                        ? measurementUnits.find(unit => unit.value === formData.measurementUnit)?.label || 'Select Unit'
                                        : 'Select Unit'
                                    }
                                </Text>
                                <Text style={styles.selectArrow}>▼</Text>
                            </TouchableOpacity>
                            {errors.measurementUnit && <Text style={styles.errorText}>{errors.measurementUnit}</Text>}
                        </View>
                    </View>

                    {/* Minimum Stock */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Minimum Stock *</Text>
                        <TextInput
                            style={[styles.input, errors.minStock && styles.inputError]}
                            placeholder="5"
                            placeholderTextColor="#999"
                            value={formData.minStock}
                            onChangeText={(value) => updateFormData('minStock', value)}
                            keyboardType="numeric"
                        />
                        {errors.minStock && <Text style={styles.errorText}>{errors.minStock}</Text>}
                    </View>

                    {/* Additional Details Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📝 Additional Details</Text>
                    </View>

                    {/* Default Discount */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Default Discount (%)</Text>
                        <TextInput
                            style={[styles.input, errors.defaultDiscount && styles.inputError]}
                            placeholder="0"
                            placeholderTextColor="#999"
                            value={formData.defaultDiscount}
                            onChangeText={(value) => updateFormData('defaultDiscount', value)}
                            keyboardType="decimal-pad"
                        />
                        {errors.defaultDiscount && <Text style={styles.errorText}>{errors.defaultDiscount}</Text>}
                    </View>

                    {/* Product Image */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Image (Optional)</Text>
                        {imageUri || formData.imageUrl ? (
                            <View style={styles.imageContainer}>
                                <Image
                                    source={{ uri: imageUri || formData.imageUrl }}
                                    style={styles.productImage}
                                />
                                <View style={styles.imageOverlay}>
                                    <TouchableOpacity
                                        style={styles.imageActionButton}
                                        onPress={pickImage}
                                        disabled={uploading}
                                    >
                                        <Text style={styles.imageActionButtonText}>
                                            Change
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.imageActionButton, styles.removeButton]}
                                        onPress={removeImage}
                                        disabled={uploading}
                                    >
                                        <Text style={styles.imageActionButtonText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                                {uploading && (
                                    <View style={styles.uploadingOverlay}>
                                        <ActivityIndicator size="large" color="#fff" />
                                        <Text style={styles.uploadingText}>Uploading...</Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.imageInputContainer}>
                                <TouchableOpacity
                                    style={[styles.imagePicker, uploading && styles.disabled]}
                                    onPress={pickImage}
                                    disabled={uploading}
                                >
                                    <Text style={styles.imagePickerIcon}>🖼️</Text>
                                    <Text style={styles.imagePickerText}>Select from gallery</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.imagePicker, uploading && styles.disabled]}
                                    onPress={takePicture}
                                    disabled={uploading}
                                >
                                    <Text style={styles.imagePickerIcon}>📷</Text>
                                    <Text style={styles.imagePickerText}>Take a picture</Text>
                                </TouchableOpacity>
                                {uploading && (
                                    <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
                                )}
                            </View>
                        )}
                        <Text style={styles.helperText}>JPG, PNG • Max 5MB</Text>
                    </View>

                    {/* Expiry Date */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Expiry Date (Optional)</Text>
                        <TouchableOpacity
                            style={[styles.input, styles.selectInput]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={[styles.selectText, !formData.expiryDate && styles.placeholderText]}>
                                {formData.expiryDate || 'Select Date (DD/MM/YYYY)'}
                            </Text>
                            <Text style={styles.selectArrow}>📅</Text>
                        </TouchableOpacity>
                        <Text style={styles.helperText}>Date format: DD/MM/YYYY (Indian Standard)</Text>
                    </View>

                    {/* Vendor Details */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vendor Details (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Vendor name, contact info, etc."
                            placeholderTextColor="#999"
                            value={formData.vendorDetails}
                            onChangeText={(value) => updateFormData('vendorDetails', value)}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Additional Notes */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Additional Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Any additional information..."
                            placeholderTextColor="#999"
                            value={formData.additionalNotes}
                            onChangeText={(value) => updateFormData('additionalNotes', value)}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Active Status */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Status</Text>
                        <View style={styles.statusContainer}>
                            <TouchableOpacity
                                style={[styles.statusButton, formData.active && styles.statusButtonActive]}
                                onPress={() => updateFormData('active', true)}
                            >
                                <Text style={[styles.statusButtonText, formData.active && styles.statusButtonTextActive]}>
                                    Active
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.statusButton, !formData.active && styles.statusButtonActive]}
                                onPress={() => updateFormData('active', false)}
                            >
                                <Text style={[styles.statusButtonText, !formData.active && styles.statusButtonTextActive]}>
                                    Inactive
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.updateButton, loading && styles.buttonDisabled]}
                            onPress={handleUpdate}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update Product</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.deleteButton, loading && styles.buttonDisabled]}
                            onPress={handleDelete}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.deleteButtonText}>Delete Product</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Unit Picker Modal */}
            <Modal
                visible={showUnitPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUnitPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Unit</Text>
                            <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                                <Text style={styles.modalCloseButton}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={measurementUnits.filter(unit => unit.value !== '')}
                            keyExtractor={(item) => item.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.unitOption,
                                        formData.measurementUnit === item.value && styles.unitOptionSelected
                                    ]}
                                    onPress={() => {
                                        updateFormData('measurementUnit', item.value);
                                        setShowUnitPicker(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.unitOptionText,
                                        formData.measurementUnit === item.value && styles.unitOptionTextSelected
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Enhanced Date Picker Modal */}
            <Modal
                visible={showDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Expiry Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                <Text style={styles.modalCloseButton}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.datePickerContainer}>
                            <Text style={styles.datePickerLabel}>Select expiry date (DD/MM/YYYY):</Text>

                            {/* Enhanced Date Picker with dropdowns */}
                            <View style={styles.datePickerRow}>
                                {/* Day Picker */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerColumnLabel}>Day</Text>
                                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                            <TouchableOpacity
                                                key={day}
                                                style={[
                                                    styles.datePickerOption,
                                                    selectedDate?.getDate() === day && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = selectedDate ? new Date(selectedDate) : new Date();
                                                    newDate.setDate(day);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    selectedDate?.getDate() === day && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {day.toString().padStart(2, '0')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Month Picker */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerColumnLabel}>Month</Text>
                                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                                            <TouchableOpacity
                                                key={month}
                                                style={[
                                                    styles.datePickerOption,
                                                    selectedDate && selectedDate.getMonth() + 1 === month && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = selectedDate ? new Date(selectedDate) : new Date();
                                                    newDate.setMonth(month - 1);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    selectedDate && selectedDate.getMonth() + 1 === month && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {month.toString().padStart(2, '0')}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Year Picker */}
                                <View style={styles.datePickerColumn}>
                                    <Text style={styles.datePickerColumnLabel}>Year</Text>
                                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                                            <TouchableOpacity
                                                key={year}
                                                style={[
                                                    styles.datePickerOption,
                                                    selectedDate?.getFullYear() === year && styles.datePickerOptionSelected
                                                ]}
                                                onPress={() => {
                                                    const newDate = selectedDate ? new Date(selectedDate) : new Date();
                                                    newDate.setFullYear(year);
                                                    setSelectedDate(newDate);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.datePickerOptionText,
                                                    selectedDate?.getFullYear() === year && styles.datePickerOptionTextSelected
                                                ]}>
                                                    {year}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            {/* Selected Date Preview */}
                            <View style={styles.datePreview}>
                                <Text style={styles.datePreviewLabel}>Selected Date:</Text>
                                <Text style={styles.datePreviewText}>
                                    {selectedDate ? formatDateToIndian(selectedDate) : 'None'}
                                </Text>
                            </View>

                            <View style={styles.datePickerButtons}>
                                <TouchableOpacity
                                    style={styles.datePickerCancelButton}
                                    onPress={() => setShowDatePicker(false)}
                                >
                                    <Text style={styles.datePickerCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.datePickerConfirmButton}
                                    onPress={() => {
                                        if (selectedDate) {
                                            const formattedDate = formatDateToIndian(selectedDate);
                                            updateFormData('expiryDate', formattedDate);
                                        }
                                        setShowDatePicker(false);
                                    }}
                                >
                                    <Text style={styles.datePickerConfirmButtonText}>Confirm</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f8fa',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    header: {
        alignItems: 'center',
        padding: 24,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    headerTop: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    backButtonText: {
        color: '#1976d2',
        fontWeight: '600',
        fontSize: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#212529',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    subtitle: {
        color: '#6c757d',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    skuContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    skuLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1976d2',
    },
    skuText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1976d2',
        letterSpacing: 0.5,
    },
    form: {
        padding: 24,
        paddingTop: 0,
    },
    inputGroup: {
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1976d2',
        marginBottom: 8,
        letterSpacing: 0.1,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e3e6ea',
        shadowColor: '#1976d2',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    inputError: {
        borderColor: '#f44336',
    },
    textArea: {
        minHeight: 80,
    },
    selectInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectText: {
        fontSize: 16,
        color: '#333',
    },
    placeholderText: {
        color: '#999',
    },
    selectArrow: {
        fontSize: 12,
        color: '#666',
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    statusButton: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    statusButtonActive: {
        backgroundColor: '#1976d2',
        borderColor: '#1976d2',
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    statusButtonTextActive: {
        color: '#fff',
    },
    buttonContainer: {
        marginTop: 24,
        gap: 12,
    },
    updateButton: {
        backgroundColor: '#1976d2',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1976d2',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        borderWidth: 0,
    },
    deleteButton: {
        backgroundColor: '#f44336',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#f44336',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        borderWidth: 0,
    },
    buttonDisabled: {
        backgroundColor: '#b3b3b3',
        shadowOpacity: 0.1,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
    },
    sectionHeader: {
        marginTop: 20,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1976d2',
        letterSpacing: 0.3,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e3e6ea',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1976d2',
    },
    modalCloseButton: {
        fontSize: 20,
        color: '#666',
        fontWeight: 'bold',
    },
    unitOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    unitOptionSelected: {
        backgroundColor: '#e3f2fd',
    },
    unitOptionText: {
        fontSize: 16,
        color: '#333',
    },
    unitOptionTextSelected: {
        color: '#1976d2',
        fontWeight: '600',
    },
    helperText: {
        fontSize: 12,
        color: '#8a99b3',
        marginTop: 4,
        marginLeft: 4,
    },
    errorText: {
        fontSize: 12,
        color: '#f44336',
        marginTop: 4,
        marginLeft: 4,
    },
    // Enhanced Date Picker Styles
    datePickerContainer: {
        padding: 20,
    },
    datePickerLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1976d2',
        marginBottom: 20,
        textAlign: 'center',
    },
    datePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    datePickerColumn: {
        flex: 1,
        marginHorizontal: 5,
    },
    datePickerColumnLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    datePickerScroll: {
        maxHeight: 120,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e3e6ea',
    },
    datePickerOption: {
        padding: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    datePickerOptionSelected: {
        backgroundColor: '#1976d2',
    },
    datePickerOptionText: {
        fontSize: 16,
        color: '#333',
    },
    datePickerOptionTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    datePreview: {
        backgroundColor: '#f0f4f8',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    datePreviewLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    datePreviewText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1976d2',
    },
    datePickerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    datePickerCancelButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        marginRight: 10,
    },
    datePickerCancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    datePickerConfirmButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#1976d2',
        alignItems: 'center',
        marginLeft: 10,
    },
    datePickerConfirmButtonText: {
        color: '#fff',
        fontWeight: '600',
    },

    // Image Upload Styles
    imageContainer: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 8,
    },

    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },

    imageActionButton: {
        backgroundColor: '#1976d2',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginRight: 8,
    },

    removeButton: {
        backgroundColor: '#d32f2f',
    },

    imageActionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },

    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    uploadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },

    imagePicker: {
        width: '48%',
        height: 120,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'dashed',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },

    imagePickerIcon: {
        fontSize: 32,
        marginBottom: 8,
    },

    imagePickerText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
    },

    disabled: {
        opacity: 0.5,
    },

    imagePickerSubtext: {
        fontSize: 12,
        color: '#757575',
    },

    imageInputContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    imageHelperText: {
        fontSize: 12,
        color: '#757575',
        marginTop: 4,
    },
});
