import { Feather } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { LogoBrand } from '../../components/LogoBrand';
import { useSnackbar } from '../../components/SnackbarContext';

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

interface FilterState {
    searchQuery: string;
}

interface PaginationState {
    currentPage: number;
    pageSize: number;
    hasMoreData: boolean;
    isLoadingMore: boolean;
}

const LoadingMoreComponent = () => (
    <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#1976d2" />
        <Text style={styles.loadingMoreText}>Loading more customers...</Text>
    </View>
);

const EmptyComponent = ({ searchQuery }: { searchQuery: string }) => (
    <View style={styles.emptyContainer}>
        <Feather name="users" size={64} color="#ced4da" />
        <Text style={styles.emptyText}>
            {searchQuery
                ? 'No customers match your search'
                : 'No customers found.'}
        </Text>
        <Text style={styles.emptySubtext}>
            {`Tap the '+' button to add your first customer!`}
        </Text>
    </View>
);

export default function CustomersScreen() {
    const { showSnackbar } = useSnackbar();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
    const [paginatedCustomers, setPaginatedCustomers] = useState<Customer[]>([]);
    const [searchSuggestions, setSearchSuggestions] = useState<Customer[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [merchantId, setMerchantId] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
    });
    const [pagination, setPagination] = useState<PaginationState>({
        currentPage: 1,
        pageSize: 20,
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

    const fetchCustomers = useCallback(async (loadMore = false) => {
        if (!merchantId) return;

        if (!loadMore) {
            setLoading(true);
            setPagination(prev => ({ ...prev, currentPage: 1, hasMoreData: true }));
        } else {
            setPagination(prev => ({ ...prev, isLoadingMore: true }));
        }

        try {
            const customersSnapshot = await firestore()
                .collection('customers')
                .where('merchantId', '==', merchantId)
                .get();

            const customersList: Customer[] = customersSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as Customer;
            });

            customersList.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));

            if (!loadMore) {
                setCustomers(customersList);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            showSnackbar('Failed to load customers. Please try again.', 'error');
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
            const suggestions = customers.filter(customer =>
                customer.name.toLowerCase().includes(query.toLowerCase()) ||
                customer.phone.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 5);
            setSearchSuggestions(suggestions);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
            setSearchSuggestions([]);
        }
    }, [customers]);

    const navigateToEdit = useCallback((customerId: string) => {
        shouldPreserveScroll.current = true;
        router.push({ pathname: '/(protected)/edit-customer', params: { id: customerId } });
    }, []);

    const selectSuggestion = useCallback((customer: Customer) => {
        setShowSuggestions(false);
        setSearchSuggestions([]);
        navigateToEdit(customer.id);
    }, [navigateToEdit]);

    const applyFilters = useCallback(() => {
        let filtered = [...customers];

        if (filters.searchQuery.trim()) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(
                customer =>
                    customer.name.toLowerCase().includes(query) ||
                    customer.phone.toLowerCase().includes(query) ||
                    (customer.notes && customer.notes.toLowerCase().includes(query))
            );
        }

        setFilteredCustomers(filtered);

        // Reset pagination when filters change
        setPagination(prev => ({ ...prev, currentPage: 1, hasMoreData: true }));

        // Apply pagination to filtered results
        const startIndex = 0;
        const endIndex = pagination.pageSize;
        const paginatedData = filtered.slice(startIndex, endIndex);
        setPaginatedCustomers(paginatedData);

        // Update hasMoreData based on whether there are more items
        setPagination(prev => ({
            ...prev,
            hasMoreData: filtered.length > pagination.pageSize
        }));
    }, [customers, filters, pagination.pageSize]);

    useEffect(() => {
        fetchMerchantId();
    }, [fetchMerchantId]);

    useEffect(() => {
        if (merchantId) fetchCustomers(false);
    }, [merchantId, fetchCustomers]);

    const loadMoreCustomers = useCallback(() => {
        if (!pagination.hasMoreData || pagination.isLoadingMore) return;

        const nextPage = pagination.currentPage + 1;
        const startIndex = (nextPage - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;

        const newCustomers = filteredCustomers.slice(startIndex, endIndex);

        if (newCustomers.length === 0) {
            setPagination(prev => ({ ...prev, hasMoreData: false }));
            return;
        }

        setPaginatedCustomers(prev => [...prev, ...newCustomers]);
        setPagination(prev => ({
            ...prev,
            currentPage: nextPage,
            hasMoreData: endIndex < filteredCustomers.length
        }));
    }, [filteredCustomers, pagination]);

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
                fetchCustomers(false);
                // Preserve scroll position when returning from edit screen
                preserveScrollPosition();
            }
        }, [merchantId, fetchCustomers, preserveScrollPosition])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        scrollPosition.current = 0; // Reset scroll position on refresh
        if (merchantId) await fetchCustomers(false);
        setRefreshing(false);
    }, [merchantId, fetchCustomers]);

    useEffect(() => {
        applyFilters();
    }, [applyFilters]);

    const formatDate = (date?: Date) => date ? date.toLocaleDateString('en-IN') : 'N/A';

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <LogoBrand size="large" />
                    <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
                    <Text style={styles.loadingText}>Loading customers...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Your Customers</Text>
                <Text style={styles.subtitle}>Manage your customer relationships</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Feather name="search" size={20} color="#9e9e9e" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or phone..."
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
                        {searchSuggestions.map((customer) => (
                            <TouchableOpacity key={customer.id} style={styles.suggestionItem} onPress={() => selectSuggestion(customer)}>
                                <View style={styles.suggestionContent}>
                                    <Text style={styles.suggestionName}>{customer.name}</Text>
                                    <Text style={styles.suggestionDetails}>{customer.phone}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <FlatList
                ref={flatListRef}
                data={paginatedCustomers}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.customerCard}>
                        <View style={styles.customerHeader}>
                            <View style={styles.customerIcon}>
                                <Feather name="user" size={20} color="#1976d2" />
                            </View>
                            <View style={styles.customerTitleContainer}>
                                <Text style={styles.customerName} numberOfLines={2}>{item.name}</Text>
                                <Text style={styles.customerPhone}>{item.phone}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.editIcon}
                                onPress={() => navigateToEdit(item.id)}
                                activeOpacity={0.7}
                            >
                                <Feather name="edit" size={20} color="#6a7a90" />
                            </TouchableOpacity>
                        </View>

                        {item.notes && (
                            <View style={styles.customerDetails}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Notes</Text>
                                    <Text style={styles.detailValue} numberOfLines={3}>{item.notes}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.customerFooter}>
                            <Text style={styles.footerText}>
                                Created: {formatDate(item.createdAt)}
                            </Text>
                            {item.updatedAt && item.updatedAt.getTime() !== item.createdAt?.getTime() && (
                                <Text style={styles.footerText}>
                                    Updated: {formatDate(item.updatedAt)}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976d2']} tintColor="#1976d2" />}
                onEndReached={loadMoreCustomers}
                onEndReachedThreshold={0.3}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                ListFooterComponent={pagination.isLoadingMore ? LoadingMoreComponent : null}
                ListEmptyComponent={<EmptyComponent searchQuery={filters.searchQuery} />}
            />

            <TouchableOpacity
                style={styles.fabButton}
                onPress={() => router.push('/(protected)/create-customer')}
                activeOpacity={0.8}
            >
                <Feather name="plus" size={24} color="#fff" />
            </TouchableOpacity>
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
        fontFamily: 'System',
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
        top: 80,
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
    listContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    customerCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f1f3f5',
    },
    customerHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    customerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e3f2fd',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    customerTitleContainer: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 2,
    },
    customerPhone: {
        fontSize: 14,
        color: '#6c757d',
    },
    editIcon: {
        padding: 8,
        marginTop: -8,
        marginRight: -8,
    },
    customerDetails: {
        marginBottom: 12,
    },
    detailRow: {
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 12,
        color: '#6c757d',
        fontWeight: '500',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        color: '#495057',
        lineHeight: 20,
    },
    customerFooter: {
        borderTopWidth: 1,
        borderTopColor: '#f1f3f5',
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    footerText: {
        fontSize: 11,
        color: '#9ca3af',
    },
    loadingMore: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    loadingMoreText: {
        marginLeft: 8,
        color: '#6c757d',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
    },
    fabButton: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1976d2',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
});
