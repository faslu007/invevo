import { Feather } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LogoBrand } from '../../components/LogoBrand';
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

interface FilterState {
    searchQuery: string;
    activeFilter: 'all' | 'lowStock' | 'expiring' | 'expired' | 'inactive';
}

interface PaginationState {
    currentPage: number;
    pageSize: number;
    hasMoreData: boolean;
    isLoadingMore: boolean;
}

export default function ProductScreen() {
    const { showSnackbar } = useSnackbar();
    const [products, setProducts] = useState<Product[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for filtering
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);
    const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        activeFilter: 'all',
    });
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        pageSize: 20, // Load 20 items at a time
        hasMoreData: true,
        isLoadingMore: false,
    });

    // Refs for scroll position preservation
    const flatListRef = useRef<FlatList>(null);
    const scrollPosition = useRef(0);
    const shouldPreserveScroll = useRef(false);

    const fetchMerchantId = useCallback(async () => {
        try {
            const user = auth().currentUser;
            if (!user) return;

            const userDoc = await firestore().collection('users').doc(user.uid).get();
            const userData = userDoc.exists() ? userDoc.data() : null;
            const merchantIds = userData?.marchants || [];

            if (merchantIds.length > 0) {
                setMerchantId(merchantIds[0]);
            }
        } catch (error) {
            console.error('Error fetching merchant ID:', error);
            showSnackbar('Failed to load merchant information.', 'error');
        }
    }, [showSnackbar]);

    const fetchProducts = useCallback(async (loadMore = false) => {
        if (!merchantId) return;

        if (!loadMore) {
            setLoading(true);
            setPagination(prev => ({ ...prev, currentPage: 1, hasMoreData: true }));
        } else {
            setPagination(prev => ({ ...prev, isLoadingMore: true }));
        }

        try {
            const productsSnapshot = await firestore()
                .collection('products')
                .where('merchantId', '==', merchantId)
                .get();

            const productsList: Product[] = productsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    expiryDate: data.expiryDate?.toDate(),
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as Product;
            });

            productsList.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));

            if (!loadMore) {
                setProducts(productsList);
                setAllProducts(productsList);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            showSnackbar('Failed to load products. Please try again.', 'error');
        } finally {
            if (!loadMore) {
                setLoading(false);
            } else {
                setPagination(prev => ({ ...prev, isLoadingMore: false }));
            }
        }
    }, [merchantId, showSnackbar]);

    const handleSearchChange = useCallback((query: string) => {
        setFilters(prev => ({ ...prev, searchQuery: query }));
        if (query.trim().length > 0) {
            const suggestions = products.filter(product =>
                product.active && (
                    product.productName.toLowerCase().includes(query.toLowerCase()) ||
                    product.sku.toLowerCase().includes(query.toLowerCase()) ||
                    product.category.toLowerCase().includes(query.toLowerCase()) ||
                    product.brand.toLowerCase().includes(query.toLowerCase())
                )
            ).slice(0, 5);
            setSearchSuggestions(suggestions);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
            setSearchSuggestions([]);
        }
    }, [products]);

    const navigateToEdit = useCallback((productId: string) => {
        shouldPreserveScroll.current = true;
        router.push({ pathname: '/(protected)/edit-product', params: { id: productId } });
    }, []);

    const selectSuggestion = useCallback((product: Product) => {
        setShowSuggestions(false);
        setSearchSuggestions([]);
        navigateToEdit(product.id);
    }, [navigateToEdit]);

    const applyFilters = useCallback(() => {
        let filtered = [...products];

        if (filters.activeFilter !== 'inactive') {
            filtered = filtered.filter(product => product.active);
        }

        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(
                product =>
                    product.productName.toLowerCase().includes(query) ||
                    product.sku.toLowerCase().includes(query) ||
                    product.category.toLowerCase().includes(query) ||
                    product.brand.toLowerCase().includes(query)
            );
        }

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        switch (filters.activeFilter) {
            case 'lowStock':
                filtered = filtered.filter(product => product.stockQuantity <= (product.minStock || 5));
                break;
            case 'expiring':
                filtered = filtered.filter(
                    product =>
                        product.expiryDate &&
                        product.expiryDate > now &&
                        product.expiryDate <= thirtyDaysFromNow
                );
                break;
            case 'expired':
                filtered = filtered.filter(
                    product => product.expiryDate && product.expiryDate <= now
                );
                break;
            case 'inactive':
                filtered = filtered.filter(product => !product.active);
                break;
        }

        setFilteredProducts(filtered);

        // Reset pagination when filters change
        setPagination(prev => ({ ...prev, currentPage: 1, hasMoreData: true }));

        // Apply pagination to filtered results
        const startIndex = 0;
        const endIndex = pagination.pageSize;
        const paginatedData = filtered.slice(startIndex, endIndex);
        setPaginatedProducts(paginatedData);

        // Update hasMoreData based on whether there are more items
        setPagination(prev => ({
            ...prev,
            hasMoreData: filtered.length > pagination.pageSize
        }));
    }, [products, filters, pagination.pageSize]);

    useEffect(() => {
        fetchMerchantId();
    }, [fetchMerchantId]);

    useEffect(() => {
        if (merchantId) fetchProducts(false);
    }, [merchantId, fetchProducts]);

    const loadMoreProducts = useCallback(() => {
        if (!pagination.hasMoreData || pagination.isLoadingMore) return;

        const nextPage = pagination.currentPage + 1;
        const startIndex = (nextPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;

        const newProducts = filteredProducts.slice(startIndex, endIndex);

        if (newProducts.length === 0) {
            setPagination(prev => ({ ...prev, hasMoreData: false }));
            return;
        }

        setPaginatedProducts(prev => [...prev, ...newProducts]);
        setPagination(prev => ({
            ...prev,
            currentPage: nextPage,
            hasMoreData: endIndex < filteredProducts.length
        }));
    }, [filteredProducts, pagination]);

    const handleScroll = useCallback((event: any) => {
        scrollPosition.current = event.nativeEvent.contentOffset.y;
    }, []);

    const preserveScrollPosition = useCallback(() => {
        if (shouldPreserveScroll.current && flatListRef.current && scrollPosition.current > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToOffset({
                    offset: scrollPosition.current,
                    animated: false
                });
                shouldPreserveScroll.current = false;
            }, 100);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (merchantId) {
                fetchProducts(false);
                // Preserve scroll position when returning from edit screen
                preserveScrollPosition();
            }
        }, [merchantId, fetchProducts, preserveScrollPosition])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        scrollPosition.current = 0; // Reset scroll position on refresh
        if (merchantId) await fetchProducts(false);
        setRefreshing(false);
    }, [merchantId, fetchProducts]);

    // Save view mode to local storage when it changes
    useEffect(() => {
        try {
            // In a real app, you might want to persist this using AsyncStorage
            // For now, we'll just keep it in memory
            console.log('View mode changed to:', viewMode);
        } catch (error) {
            console.error('Error saving view mode preference:', error);
        }
    }, [viewMode]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const getStockStatus = (quantity: number, minStock: number = 5) => {
        if (quantity === 0) return { label: 'Out of Stock', color: '#d32f2f' };
        if (quantity <= minStock) return { label: 'Low Stock', color: '#f57c00' };
        return { label: 'In Stock', color: '#388e3c' };
    };

    const getExpiryStatus = (expiryDate?: Date) => {
        if (!expiryDate) return null;
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (expiryDate <= now) return { label: 'Expired', color: '#d32f2f' };
        if (expiryDate <= thirtyDaysFromNow) return { label: 'Expiring Soon', color: '#f57c00' };
        return { label: 'Fresh', color: '#388e3c' };
    };

    const formatPrice = (price: number) => `₹${price.toFixed(2)}`;
    const formatDate = (date?: Date) => date ? date.toLocaleDateString('en-IN') : 'N/A';

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isModalImageLoading, setIsModalImageLoading] = useState(false);

    const filterButtons = [
        { key: 'all', label: 'All', icon: '📦' },
        { key: 'lowStock', label: 'Low Stock', icon: '⚠️' },
        { key: 'expiring', label: 'Expiring', icon: '⏰' },
        { key: 'expired', label: 'Expired', icon: '❌' },
        { key: 'inactive', label: 'Inactive', icon: '💤' },
    ] as const;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <LogoBrand size="large" />
                    <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
                    <Text style={styles.loadingText}>Loading products...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Your Inventory</Text>
                <Text style={styles.subtitle}>A complete overview of your products</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Feather name="search" size={20} color="#9e9e9e" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, SKU, brand..."
                        value={filters.searchQuery}
                        onChangeText={handleSearchChange}
                        onFocus={() => { if (filters.searchQuery.trim().length > 0) setShowSuggestions(true); }}
                        autoCapitalize="none"
                        placeholderTextColor="#9e9e9e"
                    />
                    {filters.searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setFilters(prev => ({ ...prev, searchQuery: '' }));
                            setShowSuggestions(false);
                        }}>
                            <Feather name="x-circle" size={20} color="#9e9e9e" style={styles.clearSearchIcon} />
                        </TouchableOpacity>
                    )}
                </View>

                {showSuggestions && searchSuggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {searchSuggestions.map((product) => (
                            <TouchableOpacity key={product.id} style={styles.suggestionItem} onPress={() => selectSuggestion(product)}>
                                <View style={styles.suggestionContent}>
                                    <Text style={styles.suggestionName}>{product.productName}</Text>
                                    <Text style={styles.suggestionDetails}>{product.category} • {product.brand} • SKU: {product.sku}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.filtersSection}>
                <View style={styles.filtersSectionHeader}>
                    <Text style={styles.filtersSectionTitle}>Quick Filters</Text>
                    <View style={styles.viewToggleContainer}>
                        <TouchableOpacity
                            style={[styles.viewToggleButton, viewMode === 'card' && styles.viewToggleActive]}
                            onPress={() => setViewMode('card')}
                            activeOpacity={0.7}
                        >
                            <Feather name="grid" size={16} color={viewMode === 'card' ? '#fff' : '#495057'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.viewToggleButton, viewMode === 'table' && styles.viewToggleActive]}
                            onPress={() => setViewMode('table')}
                            activeOpacity={0.7}
                        >
                            <Feather name="list" size={16} color={viewMode === 'table' ? '#fff' : '#495057'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
                    {filterButtons.map(filter => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[styles.filterChip, filters.activeFilter === filter.key && styles.filterChipActive]}
                            onPress={() => setFilters(prev => ({ ...prev, activeFilter: filter.key }))}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.filterChipIcon}>{filter.icon}</Text>
                            <Text style={[styles.filterChipText, filters.activeFilter === filter.key && styles.filterChipTextActive]}>
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Card View */}
            {viewMode === 'card' && (
                <FlatList
                    ref={flatListRef}
                    data={paginatedProducts}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                        const stockStatus = getStockStatus(item.stockQuantity, item.minStock);
                        const expiryStatus = getExpiryStatus(item.expiryDate);

                        return (
                            <View style={styles.productCard}>
                                <View style={styles.productHeader}>
                                    {/* Small Product Image to the left */}
                                    <TouchableOpacity
                                        onPress={() => item.imageUrl ? setSelectedImage(item.imageUrl) : null}
                                        style={styles.thumbnailContainer}
                                    >
                                        <View style={styles.placeholderThumbnail}>
                                            <Feather name="image" size={16} color="#bbb" />
                                        </View>
                                        {item.imageUrl && (
                                            <Image
                                                source={{ uri: item.imageUrl }}
                                                style={styles.thumbnailImage}
                                                resizeMode="cover"
                                                fadeDuration={300}
                                            />
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.productTitleContainer}>
                                        <Text style={styles.productName} numberOfLines={2}>{item.productName}</Text>
                                        <Text style={styles.productSku}>SKU: {item.sku}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.editIcon}
                                        onPress={() => navigateToEdit(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Feather name="edit" size={20} color="#6a7a90" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.productDetails}>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Category</Text>
                                        <Text style={styles.detailValue}>{item.category}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Brand</Text>
                                        <Text style={styles.detailValue}>{item.brand}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Selling Price</Text>
                                        <Text style={styles.priceValue}>{formatPrice(item.sellingPrice)}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Stock</Text>
                                        <View style={styles.statusContainer}>
                                            <Text style={styles.detailValue}>{item.stockQuantity} {item.measurementUnit}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
                                                <Text style={styles.statusText}>{stockStatus.label}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    {item.expiryDate && (
                                        <View style={styles.detailRow}>
                                            <Text style={styles.detailLabel}>Expiry</Text>
                                            <View style={styles.statusContainer}>
                                                <Text style={styles.detailValue}>{formatDate(item.expiryDate)}</Text>
                                                {expiryStatus && (
                                                    <View style={[styles.statusBadge, { backgroundColor: expiryStatus.color }]}>
                                                        <Text style={styles.statusText}>{expiryStatus.label}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} tintColor="#1976d2" />}
                    onEndReached={loadMoreProducts}
                    onEndReachedThreshold={0.3}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    ListFooterComponent={() => {
                        if (pagination.isLoadingMore) {
                            return (
                                <View style={styles.loadingMore}>
                                    <ActivityIndicator size="small" color="#1976d2" />
                                    <Text style={styles.loadingMoreText}>Loading more products...</Text>
                                </View>
                            );
                        }
                        return null;
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="package" size={64} color="#ced4da" />
                            <Text style={styles.emptyText}>
                                {filters.searchQuery || filters.activeFilter !== 'all'
                                    ? 'No products match your filters'
                                    : 'Your inventory is empty.'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {`Tap the '+' button to add your first product!`}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Table View */}
            {viewMode === 'table' && (
                <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <View style={[styles.tableCell, styles.imageCell]}>
                            <Text style={styles.tableHeaderText}> 📷</Text>
                        </View>
                        <View style={[styles.tableCell, styles.nameCell]}>
                            <Text style={styles.tableHeaderText}>Product</Text>
                        </View>
                        <View style={[styles.tableCell, styles.priceCell]}>
                            <Text style={styles.tableHeaderText}>Price</Text>
                        </View>
                        <View style={[styles.tableCell, styles.stockCell]}>
                            <Text style={styles.tableHeaderText}>Stock</Text>
                        </View>
                        <View style={[styles.tableCell, styles.actionCell]}>
                            <Text style={styles.tableHeaderText}>✏️</Text>
                        </View>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={paginatedProducts}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.tableListContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} tintColor="#1976d2" />}
                        onEndReached={loadMoreProducts}
                        onEndReachedThreshold={0.3}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        renderItem={({ item }) => {
                            const stockStatus = getStockStatus(item.stockQuantity, item.minStock);

                            return (
                                <View style={styles.tableRow}>
                                    <TouchableOpacity
                                        style={[styles.tableCell, styles.imageCell]}
                                        onPress={() => item.imageUrl ? setSelectedImage(item.imageUrl) : null}
                                    >
                                        {item.imageUrl ? (
                                            <Image
                                                source={{ uri: item.imageUrl }}
                                                style={styles.tableImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={styles.tableImagePlaceholder}>
                                                    <Feather name="image" size={12} color="#bbb" />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={[styles.tableCell, styles.nameCell]}>
                                        <Text style={styles.tableProductName} numberOfLines={1}>{item.productName}</Text>
                                        <Text style={styles.tableSku}>SKU: {item.sku}</Text>
                                    </View>

                                    <View style={[styles.tableCell, styles.priceCell]}>
                                        <Text style={styles.tablePrice}>{formatPrice(item.sellingPrice)}</Text>
                                    </View>

                                    <View style={[styles.tableCell, styles.stockCell]}>
                                        <Text style={styles.tableStock}>{item.stockQuantity}</Text>
                                        <View style={[styles.tableStatusBadge, { backgroundColor: stockStatus.color }]}>
                                            <Text style={styles.tableStatusText}>{stockStatus.label}</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.tableCell, styles.actionCell]}>
                                        <TouchableOpacity
                                            style={styles.tableActionButton}
                                            onPress={() => navigateToEdit(item.id)}
                                        >
                                            <Feather name="edit" size={14} color="#1976d2" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                        ListFooterComponent={() => {
                            if (pagination.isLoadingMore) {
                                return (
                                    <View style={styles.loadingMore}>
                                        <ActivityIndicator size="small" color="#1976d2" />
                                        <Text style={styles.loadingMoreText}>Loading more products...</Text>
                                    </View>
                                );
                            }
                            return null;
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Feather name="package" size={64} color="#ced4da" />
                                <Text style={styles.emptyText}>
                                    {filters.searchQuery || filters.activeFilter !== 'all'
                                        ? 'No products match your filters'
                                        : 'Your inventory is empty.'}
                                </Text>
                                <Text style={styles.emptySubtext}>
                                    {`Tap the '+' button to add your first product!`}
                                </Text>
                            </View>
                        }
                    />
                </View>
            )}

            <TouchableOpacity
                style={styles.fabButton}
                onPress={() => router.push('/(protected)/create-product')}
                activeOpacity={0.8}
            >
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Image Modal */}
            <Modal
                visible={!!selectedImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedImage(null)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.closeModalButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <Feather name="x" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.modalImageContainer}>
                        {isModalImageLoading && (
                            <ActivityIndicator size="large" color="#fff" style={styles.modalLoader} />
                        )}
                        <Image
                            source={{ uri: selectedImage || '' }}
                            style={styles.modalImage}
                            resizeMode="contain"
                            onLoadStart={() => setIsModalImageLoading(true)}
                            onLoadEnd={() => setIsModalImageLoading(false)}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Lighter, cleaner background
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
        fontFamily: 'System', // Specify font for consistency
    },
    header: {
        padding: 16,
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f3f5',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 8,
        fontSize: 14,
        color: '#212529',
    },
    clearSearchIcon: {
        marginLeft: 8,
    },
    suggestionsContainer: {
        position: 'absolute',
        top: 80, // Position below search bar
        left: 24,
        right: 24,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10,
    },
    suggestionItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
    },
    suggestionContent: {},
    suggestionName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#343a40',
    },
    suggestionDetails: {
        fontSize: 13,
        color: '#6c757d',
        marginTop: 4,
    },
    filtersSection: {
        backgroundColor: '#ffffff',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        marginBottom: 8,
    },
    filtersSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 8,
    },
    filtersSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        letterSpacing: 0.2,
    },
    filtersContent: {
        paddingTop: 4,
        paddingBottom: 6,
        paddingHorizontal: 16,
        gap: 8,
    },
    viewToggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f3f5',
        borderRadius: 6,
        padding: 2,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    viewToggleButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        minWidth: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewToggleActive: {
        backgroundColor: '#1976d2',
        shadowColor: '#1565c0',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        elevation: 3,
    },
    filterChip: {
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 28,
    },
    filterChipActive: {
        backgroundColor: '#1976d2',
        borderColor: '#1976d2',
        elevation: 3,
        shadowColor: '#1976d2',
        shadowOpacity: 0.2,
    },
    filterChipIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    filterChipText: {
        color: '#495057',
        fontWeight: '500',
        fontSize: 12,
        letterSpacing: 0.1,
    },
    filterChipTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    listContainer: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 80,
    },
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#495057',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
    },
    productTitleContainer: {
        flex: 1,
        marginRight: 8,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212529',
        lineHeight: 20,
    },
    productSku: {
        fontSize: 11,
        color: '#6c757d',
        marginTop: 2,
    },
    editIcon: {
        padding: 4, // Tappable area
    },
    productDetails: {
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f3f5',
        paddingTop: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        color: '#6c757d',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 12,
        color: '#212529',
        fontWeight: '600',
    },
    priceValue: {
        fontSize: 13,
        color: '#1976d2',
        fontWeight: '700',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusBadge: {
        borderRadius: 8,
        paddingVertical: 2,
        paddingHorizontal: 6,
    },
    statusText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 24,
    },
    emptyText: {
        color: '#495057',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#6c757d',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },

    // Loading More Styles
    loadingMore: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    loadingMoreText: {
        color: '#6c757d',
        fontSize: 14,
        fontWeight: '500',
    },

    // Thumbnail Image Styles
    thumbnailContainer: {
        width: 40,
        height: 40,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
        marginRight: 10,
        backgroundColor: '#f5f5f5',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    placeholderThumbnail: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },

    // Modal Image Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImageContainer: {
        width: '90%',
        height: '70%',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    modalImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    modalLoader: {
        position: 'absolute',
        zIndex: 1,
    },
    closeModalButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },

    // Table View Styles
    tableContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        margin: 12,
        marginTop: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        paddingVertical: 8,
        minHeight: 32,
    },
    tableHeaderText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#343a40',
        letterSpacing: 0.1,
        textTransform: 'uppercase',
    },
    tableCell: {
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageCell: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameCell: {
        flex: 1.5,
        justifyContent: 'center',
    },
    priceCell: {
        flex: 0.8,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    stockCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCell: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f3f5',
        paddingVertical: 6,
        backgroundColor: '#ffffff',
        minHeight: 36,
        alignItems: 'center',
    },
    tableImage: {
        width: 28,
        height: 28,
        borderRadius: 3,
    },
    tableImagePlaceholder: {
        width: 28,
        height: 28,
        borderRadius: 3,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableProductName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#212529',
        marginBottom: 1,
    },
    tableSku: {
        fontSize: 9,
        color: '#6c757d',
    },
    tablePrice: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1976d2',
    },
    tableStock: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 1,
    },
    tableStatusBadge: {
        borderRadius: 3,
        paddingVertical: 1,
        paddingHorizontal: 4,
        marginTop: 2,
    },
    tableStatusText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '600',
    },
    tableActionButton: {
        padding: 6,
    },
    tableListContainer: {
        flexGrow: 1,
    },

    fabButton: {
        position: 'absolute',
        bottom: 24,
        right: 16,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1976d2',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1976d2',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});