import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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

      // Get merchant ID
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.exists() ? userDoc.data() : null;
      const merchantIds = userData?.marchants || [];

      if (merchantIds.length === 0) {
        showSnackbar('No merchant found. Please set up merchant first.', 'error');
        return;
      }

      const merchantId = merchantIds[0];
      const sku = generateSKU(formData.productName, formData.category);

      // Parse dates from Indian format (DD/MM/YYYY)
      const expiryDate = formData.expiryDate ? (() => {
        const isoDate = parseIndianDateToISO(formData.expiryDate);
        return isoDate ? new Date(isoDate) : null;
      })() : null;
      const now = new Date();

      const productData = {
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
        createdUserId: user.uid,
        updatedUserId: user.uid,
        createdAt: now,
        updatedAt: now,
      };

      await firestore().collection('products').add(productData);

      showSnackbar('Product created successfully!', 'success');
      router.push('/(protected)/product');
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
                value={formData.minStock}
                onChangeText={(value) => updateFormData('minStock', value)}
                keyboardType="numeric"
              />
              {errors.minStock && <Text style={styles.errorText}>{errors.minStock}</Text>}
            </View>
          </View>

          {/* Measurement Unit */}
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
              value={formData.defaultDiscount}
              onChangeText={(value) => updateFormData('defaultDiscount', value)}
              keyboardType="decimal-pad"
            />
            {errors.defaultDiscount && <Text style={styles.errorText}>{errors.defaultDiscount}</Text>}
          </View>

          {/* Additional Details Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📝 Additional Details</Text>
          </View>

          {/* Image URL */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Image URL (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChangeText={(value) => updateFormData('imageUrl', value)}
              keyboardType="url"
              autoCapitalize="none"
            />
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

      {/* Date Picker Modal */}
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
              <Text style={styles.datePickerLabel}>Choose a date in Indian format (DD/MM/YYYY):</Text>
              <View style={styles.simpleDatePicker}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="DD"
                  maxLength={2}
                  keyboardType="numeric"
                  onChangeText={(value) => {
                    if (parseInt(value) <= 31) {
                      setSelectedDate(prev => {
                        const date = prev || new Date();
                        date.setDate(parseInt(value) || 1);
                        return new Date(date);
                      });
                    }
                  }}
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="MM"
                  maxLength={2}
                  keyboardType="numeric"
                  onChangeText={(value) => {
                    if (parseInt(value) <= 12) {
                      setSelectedDate(prev => {
                        const date = prev || new Date();
                        date.setMonth((parseInt(value) || 1) - 1);
                        return new Date(date);
                      });
                    }
                  }}
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  style={[styles.dateInput, styles.yearInput]}
                  placeholder="YYYY"
                  maxLength={4}
                  keyboardType="numeric"
                  onChangeText={(value) => {
                    if (value.length === 4) {
                      setSelectedDate(prev => {
                        const date = prev || new Date();
                        date.setFullYear(parseInt(value));
                        return new Date(date);
                      });
                    }
                  }}
                />
              </View>
              <TouchableOpacity
                style={styles.dateConfirmButton}
                onPress={() => {
                  if (selectedDate) {
                    const formattedDate = formatDateToIndian(selectedDate);
                    updateFormData('expiryDate', formattedDate);
                  }
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.dateConfirmButtonText}>Confirm Date</Text>
              </TouchableOpacity>
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
  datePickerContainer: {
    padding: 20,
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  simpleDatePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: '#fff',
    width: 50,
  },
  yearInput: {
    width: 70,
  },
  dateSeparator: {
    fontSize: 18,
    color: '#333',
    marginHorizontal: 10,
  },
  dateConfirmButton: {
    backgroundColor: '#1976d2',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  dateConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});
