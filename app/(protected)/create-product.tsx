import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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

// Separate ProductForm component to reduce main component complexity
function ProductFormUI({
    formData,
    errors,
    loading,
    handleCreate,
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
    handleCreate: () => Promise<void>;
    updateFormData: (field: keyof ProductFormData, value: string) => void;
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
    const scrollViewRef = useRef<ScrollView>(null);

    // The UI rendering logic will be moved here later
    return null;
}

export default function CreateProductScreen() {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
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
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Image upload states
    const [uploading, setUploading] = useState(false);
    const [imageUri, setImageUri] = useState<string | null>(null);

  // Reset form when screen is focused to prevent state leakage from edit screen
  useFocusEffect(
    useCallback(() => {
      setFormData({
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
      });
      setErrors({});
    }, [])
  );

  const generateSKU = (productName: string, category: string): string => {
    const cleanName = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanCategory = category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    
    const namePrefix = cleanName.substring(0, 3).padEnd(3, 'X');
    const categoryPrefix = cleanCategory.substring(0, 2).padEnd(2, 'X');
    
    return `${namePrefix}${categoryPrefix}${timestamp}`;
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

    // Image handling functions
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
            showSnackbar('Failed to pick image. Please try again.', 'error');
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
            showSnackbar('Failed to take picture. Please try again.', 'error');
        }
    };

    const uploadImage = async (uri: string) => {
        setUploading(true);
        try {
            const user = auth().currentUser;
            if (!user) {
                showSnackbar('User not authenticated', 'error');
                return;
            }

            // Create unique filename
            const timestamp = Date.now();
            const filename = `products/${user.uid}/${timestamp}.jpg`;

            // Upload to Firebase Storage
            const reference = storage().ref(filename);
            await reference.putFile(uri);

            // Get download URL
            const downloadURL = await reference.getDownloadURL();

            // Update form data with the image URL
            updateFormData('imageUrl', downloadURL);
            showSnackbar('Image uploaded successfully!', 'success');

        } catch (error) {
            console.error('Error uploading image:', error);
            showSnackbar('Failed to upload image. Please try again.', 'error');
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
                        setImageUri(null);
                        updateFormData('imageUrl', '');
                    },
                },
            ]
        );
    };

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
    } else if (isNaN(Number(formData.minStock)) || Number(formData.minStock) < 0) {
      newErrors.minStock = 'Please enter a valid minimum stock';
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

    // Helper function to prepare product data
    const prepareProductData = (merchantId: string, userId: string) => {
        const sku = generateSKU(formData.productName, formData.category);
      const now = new Date();

      // Parse dates from Indian format (DD/MM/YYYY)
      const expiryDate = formData.expiryDate ? (() => {
          const isoDate = parseIndianDateToISO(formData.expiryDate);
          return isoDate ? new Date(isoDate) : null;
      })() : null;

      return {
          productName: formData.productName.trim(),
          sku,
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
          active: true,
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

                // Prepare product data
                const productData = prepareProductData(merchantId, user.uid);

    // Save to Firestore
          await firestore().collection('products').add(productData);

          showSnackbar('Product created successfully!', 'success');
          router.push('/(protected)/product');
      } catch (error) {
            if (error instanceof Error && error.message === 'No merchant found') {
                showSnackbar('No merchant found. Please set up merchant first.', 'error');
            } else {
                throw error;
            }
        }
    } catch (error) {
      console.error('Error creating product:', error);
      showSnackbar('Failed to create product. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(protected)/product');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Create Product</Text>
          <Text style={styles.subtitle}>Add a new product to your inventory</Text>
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
              placeholderTextColor="#9e9e9e"
              value={formData.productName}
              onChangeText={(value) => updateFormData('productName', value)}
              autoCapitalize="words"
            />
            {errors.productName && (
              <Text style={styles.errorText}>✕ {errors.productName}</Text>
            )}
          </View>

          {/* Category and Brand Row */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Category *</Text>
              <TextInput
                style={[styles.input, errors.category && styles.inputError]}
                placeholder="e.g., Electronics"
                              placeholderTextColor="#9e9e9e"
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
                              placeholderTextColor="#9e9e9e"
                value={formData.brand}
                onChangeText={(value) => updateFormData('brand', value)}
                autoCapitalize="words"
              />
              {errors.brand && <Text style={styles.errorText}>{errors.brand}</Text>}
            </View>
          </View>

          {/* Pricing Row */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💰 Pricing Information</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Selling Price (₹) *</Text>
              <TextInput
                style={[styles.input, errors.sellingPrice && styles.inputError]}
                placeholder="0.00"
                              placeholderTextColor="#9e9e9e"
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
                              placeholderTextColor="#9e9e9e"
                value={formData.cost}
                onChangeText={(value) => updateFormData('cost', value)}
                keyboardType="decimal-pad"
              />
              {errors.cost && <Text style={styles.errorText}>{errors.cost}</Text>}
            </View>
          </View>

          {/* Stock and Unit Row */}
          <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>📊 Inventory Management</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Stock Quantity *</Text>
              <TextInput
                style={[styles.input, errors.stockQuantity && styles.inputError]}
                placeholder="0"
                              placeholderTextColor="#9e9e9e"
                value={formData.stockQuantity}
                onChangeText={(value) => updateFormData('stockQuantity', value)}
                keyboardType="numeric"
              />
              {errors.stockQuantity && <Text style={styles.errorText}>{errors.stockQuantity}</Text>}
                      </View>
                      <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Min Stock *</Text>
              <TextInput
                style={[styles.input, errors.minStock && styles.inputError]}
                placeholder="5"
                              placeholderTextColor="#9e9e9e"
                value={formData.minStock}
                onChangeText={(value) => updateFormData('minStock', value)}
                keyboardType="numeric"
              />
              {errors.minStock && <Text style={styles.errorText}>{errors.minStock}</Text>}
                      </View>
                  </View>

                  { }
          <View style={styles.inputGroup}>
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

                  {/* Default Discount */}
                  <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Discount (%)</Text>
            <TextInput
              style={[styles.input, errors.defaultDiscount && styles.inputError]}
              placeholder="0"
                          placeholderTextColor="#9e9e9e"
              value={formData.defaultDiscount}
              onChangeText={(value) => updateFormData('defaultDiscount', value)}
              keyboardType="decimal-pad"
            />
            {errors.defaultDiscount && <Text style={styles.errorText}>{errors.defaultDiscount}</Text>}
                  </View>

                  { }
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📝 Additional Details</Text>
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
                          placeholderTextColor="#9e9e9e"
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
                          placeholderTextColor="#9e9e9e"
                          value={formData.additionalNotes}
                          onChangeText={(value) => updateFormData('additionalNotes', value)}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                      />
                  </View>

                  {/* Create Button */}
                  <TouchableOpacity
                      style={[styles.createButton, loading && styles.buttonDisabled]}
                      onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          handleCreate();
                      }}
                      disabled={loading}
                      activeOpacity={0.9}
                  >
                      {loading ? (
                          <View style={styles.loadingRow}>
                              <ActivityIndicator size="small" color="#fff" />
                              <Text style={[styles.createButtonText, { marginLeft: 10 }]}>Creating...</Text>
                          </View>
                      ) : (
                          <Text style={styles.createButtonText}>✨ Create Product</Text>
                      )}
                  </TouchableOpacity>
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
        backgroundColor: '#f8f9fa',
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 32,
    },
    header: {
        backgroundColor: '#fff',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
    },
    backButtonText: {
        color: '#1976d2',
        fontWeight: '600',
        fontSize: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    subtitle: {
        color: '#6c757d',
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    form: {
        padding: 20,
        backgroundColor: '#fff',
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
        borderRadius: 14,
        padding: 18,
        fontSize: 16,
        borderWidth: 2,
        borderColor: '#e3e6ea',
        shadowColor: '#1976d2',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    inputError: {
        borderColor: '#f44336',
        borderWidth: 2,
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
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3e6ea',
    shadowColor: '#1976d2',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  picker: {
    height: 50,
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
  createButton: {
    backgroundColor: '#1976d2',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#1976d2',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderWidth: 0,
  },
  buttonDisabled: {
    backgroundColor: '#b3b3b3',
    shadowOpacity: 0.1,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
    sectionHeader: {
        marginTop: 20,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomColor: '#e9ecef',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1976d2',
        letterSpacing: 0.3,
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
      fontWeight: '500',
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
        lineHeight: 16,
    },
});
