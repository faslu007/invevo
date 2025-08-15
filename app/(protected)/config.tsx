import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LogoBrand } from "../../components/LogoBrand";
import { useSnackbar } from "../../components/SnackbarContext";

interface MerchantData {
    id: string;
    marchantName: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    logoUrl: string;
    upiIds: string[];
    gstin: string;
    contactNum: string;
    email: string;
    info: string;
}

interface UserData {
    userId: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: 'admin' | 'manager' | 'staff';
    status: 'active' | 'inactive';
    addedAt?: Date;
    isPlaceholder?: boolean;
}

export default function ConfigScreen() {
    const { showSnackbar } = useSnackbar();
    const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'basic' | 'contact' | 'config' | 'users'>('basic');
    const [errors, setErrors] = useState<{ name?: string; contactNum?: string; email?: string }>({});

    // User management states
    const [users, setUsers] = useState<UserData[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [addingUser, setAddingUser] = useState(false);

    // Form fields
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [upiIds, setUpiIds] = useState("");
    const [gstin, setGstin] = useState("");
    const [contactNum, setContactNum] = useState("");
    const [email, setEmail] = useState("");
    const [info, setInfo] = useState("");

    const fetchMerchantData = useCallback(async () => {
        try {
            const user = auth().currentUser;
            if (!user) return;

            // Get user's merchant IDs
            const userDoc = await firestore().collection('users').doc(user.uid).get();
            const userData = userDoc.exists() ? userDoc.data() : null;
            const merchantIds = userData?.marchants || [];

            if (merchantIds.length === 0) return;

            // Get the first merchant (assuming one merchant per user for now)
            const merchantDoc = await firestore().collection('marchents').doc(merchantIds[0]).get();
            if (merchantDoc.exists()) {
                const data = merchantDoc.data() as Omit<MerchantData, 'id'>;
                const merchant: MerchantData = {
                    id: merchantDoc.id,
                    ...data
                };

                setMerchantData(merchant);

                // Populate form fields
                setName(merchant.marchantName || "");
                setAddress(merchant.addressLine1 || "");
                setCity(merchant.city || "");
                setState(merchant.state || "");
                setZip(merchant.zipCode || "");
                setLogoUrl(merchant.logoUrl || "");
                setUpiIds(merchant.upiIds?.join(', ') || "");
                setGstin(merchant.gstin || "");
                setContactNum(merchant.contactNum || "");
                setEmail(merchant.email || "");
                setInfo(merchant.info || "");
            }
        } catch (error) {
            console.error('Error fetching merchant data:', error);
            showSnackbar('Failed to load merchant information. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showSnackbar]);

    useEffect(() => {
        fetchMerchantData();
    }, [fetchMerchantData]);

    const fetchUsers = useCallback(async () => {
        if (!merchantData) return;

        setLoadingUsers(true);
        try {
            // Query all users that have this merchant ID in their marchants array
            const usersSnapshot = await firestore()
                .collection('users')
                .where('marchants', 'array-contains', merchantData.id)
                .get();

            const usersList: UserData[] = [];
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();

                // Try to get user info from Firebase Auth
                let displayName = userData.displayName || '';
                let email = userData.email || '';
                let photoURL = userData.photoURL || '';

                // If we don't have the info in Firestore, try to get it from current user
                // Note: In a real app, you'd want to use Firebase Admin SDK on the backend
                // to get other users' auth data, but for now we'll use what's available
                if (!displayName && !email) {
                    const currentUser = auth().currentUser;
                    if (currentUser && currentUser.uid === userData.userId) {
                        displayName = currentUser.displayName || '';
                        email = currentUser.email || '';
                        photoURL = currentUser.photoURL || '';
                    }
                }

                usersList.push({
                    userId: userData.userId,
                    email: email,
                    displayName: displayName,
                    photoURL: photoURL,
                    role: userData.role || 'staff',
                    status: userData.status || 'active',
                    addedAt: userData.addedAt?.toDate(),
                    isPlaceholder: userData.isPlaceholder || false,
                });
            }

            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
            showSnackbar('Failed to load users. Please try again.', 'error');
        } finally {
            setLoadingUsers(false);
        }
    }, [merchantData, showSnackbar]);

    const addUser = async () => {
        if (!newUserEmail.trim() || !merchantData) return;

        setAddingUser(true);
        try {
            // First, check if user exists in the users collection
            const usersSnapshot = await firestore()
                .collection('users')
                .where('email', '==', newUserEmail.trim())
                .get();

            let existingUserData = null;
            let userId = null;

            if (!usersSnapshot.empty) {
            // User exists in our users collection
                const existingUserDoc = usersSnapshot.docs[0];
                existingUserData = existingUserDoc.data();
                userId = existingUserData.userId;

                // Check if user is already part of this merchant
                if (existingUserData.marchants?.includes(merchantData.id)) {
                    showSnackbar('User is already part of this merchant.', 'error');
                    return;
                }
            } else {
                // User doesn't exist in our collection yet, but they might be registered in Firebase Auth
                // We'll create a placeholder entry and let them complete their profile when they log in

                // For now, we'll create a basic user document with the email
                // The user will get proper data populated when they first log in

                // Generate a temporary document ID for this email-based user
                const tempUserRef = firestore().collection('users').doc();
                userId = tempUserRef.id;

                // Create basic user document
                await tempUserRef.set({
                    userId: userId,
                    email: newUserEmail.trim(),
                    displayName: newUserEmail.trim().split('@')[0], // Use email prefix as temporary display name
                    photoURL: '',
                    marchants: [merchantData.id],
                    role: 'staff', // Default role
                    status: 'active',
                    createdAt: new Date(),
                    addedAt: new Date(),
                    isPlaceholder: true, // Flag to indicate this is a placeholder until user logs in
                });

                setNewUserEmail("");
                fetchUsers(); // Refresh the users list
                showSnackbar('User added successfully! They can now access this merchant when they log in.', 'success');
                return;
            }

            // If user exists, add merchant to their marchants array
            const currentMarchants = existingUserData.marchants || [];
            await firestore()
                .collection('users')
                .doc(userId)
                .update({
                    marchants: [...currentMarchants, merchantData.id],
                    // Also save email if not already saved (for future reference)
                    email: existingUserData.email || newUserEmail.trim(),
                    addedAt: new Date(),
                });

            setNewUserEmail("");
            fetchUsers(); // Refresh the users list
            showSnackbar('User added successfully!', 'success');
        } catch (error) {
            console.error('Error adding user:', error);
            showSnackbar('Failed to add user. Please try again.', 'error');
        } finally {
            setAddingUser(false);
        }
    };

    const removeUser = async (userId: string) => {
        if (!merchantData) return;

        try {
            // Remove merchant from user's marchants array
            const userDoc = await firestore().collection('users').doc(userId).get();
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const updatedMarchants = (userData?.marchants || []).filter((id: string) => id !== merchantData.id);

                await firestore()
                    .collection('users')
                    .doc(userId)
                    .update({
                        marchants: updatedMarchants,
                    });

                fetchUsers(); // Refresh the users list
                showSnackbar('User removed successfully!', 'success');
            }
        } catch (error) {
            console.error('Error removing user:', error);
            showSnackbar('Failed to remove user. Please try again.', 'error');
        }
    };

    const updateUserRole = async (userId: string, newRole: 'admin' | 'manager' | 'staff') => {
        try {
            await firestore()
                .collection('users')
                .doc(userId)
                .update({
                    role: newRole,
                });

            fetchUsers(); // Refresh the users list
            showSnackbar('User role updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating user role:', error);
            showSnackbar('Failed to update user role. Please try again.', 'error');
        }
    };

    // Fetch users when merchant data is loaded
    useEffect(() => {
        if (merchantData && tab === 'users') {
            fetchUsers();
        }
    }, [merchantData, tab, fetchUsers]);

    const handleLogout = async () => {
        try {
            await auth().signOut();
            showSnackbar('Logged out successfully!', 'success');
            // Navigation will be handled automatically by the auth state change
            router.replace('/');
        } catch (error) {
            console.error('Error logging out:', error);
            showSnackbar('Failed to logout. Please try again.', 'error');
        }
    };

    const handleUpdate = async () => {
        // Validate mandatory fields
        const newErrors: { name?: string; contactNum?: string; email?: string } = {};
        if (!name.trim()) newErrors.name = 'Merchant name is required.';
        if (!contactNum.trim()) newErrors.contactNum = 'Contact number is required.';
        if (!email.trim()) newErrors.email = 'Email is required.';
        setErrors(newErrors);

        if (newErrors.name) setTab('basic');
        else if (newErrors.contactNum) setTab('contact');
        else if (newErrors.email) setTab('contact');
        if (Object.keys(newErrors).length > 0) return;

        if (!merchantData) return;

        setSaving(true);
        try {
            // Update merchant document
            await firestore().collection('marchents').doc(merchantData.id).update({
                marchantName: name,
                addressLine1: address,
                city,
                state,
                zipCode: zip,
                logoUrl,
                upiIds: upiIds.split(',').map(s => s.trim()).filter(Boolean),
                gstin,
                contactNum,
                email,
                info,
                updatedAt: new Date(),
            });

            // Update local state
            setMerchantData({
                ...merchantData,
                marchantName: name,
                addressLine1: address,
                city,
                state,
                zipCode: zip,
                logoUrl,
                upiIds: upiIds.split(',').map(s => s.trim()).filter(Boolean),
                gstin,
                contactNum,
                email,
                info,
            });

            showSnackbar('Merchant information updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating merchant:', error);
            showSnackbar('Failed to update merchant information. Please try again.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <LogoBrand size="large" />
                    <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
                    <Text style={{ color: '#6a7a90', marginTop: 12 }}>Loading merchant information...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!merchantData) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
                <View style={styles.container}>
                    <LogoBrand size="large" />

                    {/* Header with Logout - even when no merchant data */}
                    <View style={styles.headerContainer}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Account Settings</Text>
                            <Text style={styles.subtitle}>No merchant access found.</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={handleLogout}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: '#d32f2f' }]}>No Merchant Access</Text>
                            <Text style={{ color: '#6a7a90', fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
                                You don&apos;t have access to any merchants yet. Please contact your administrator to get access.
                            </Text>
                            <Text style={{ color: '#8a99b3', fontSize: 13, lineHeight: 20 }}>
                                If you believe this is an error, please try logging out and logging back in, or contact support.
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.container}>
                    <LogoBrand size="large" />
                    
                    {/* Header with Title and Logout */}
                    <View style={styles.headerContainer}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Merchant Settings</Text>
                            <Text style={styles.subtitle}>Update your business profile information.</Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.logoutButton} 
                            onPress={handleLogout}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabsOuterWrap}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.tabsContainer}>
                                <Pressable style={[styles.tab, tab === 'basic' && styles.tabActive]} onPress={() => setTab('basic')}>
                                    <Text style={[styles.tabText, tab === 'basic' && styles.tabTextActive]}>Basic</Text>
                                </Pressable>
                                <Pressable style={[styles.tab, tab === 'contact' && styles.tabActive]} onPress={() => setTab('contact')}>
                                    <Text style={[styles.tabText, tab === 'contact' && styles.tabTextActive]}>Contact</Text>
                                </Pressable>
                                <Pressable style={[styles.tab, tab === 'config' && styles.tabActive]} onPress={() => setTab('config')}>
                                    <Text style={[styles.tabText, tab === 'config' && styles.tabTextActive]}>Config</Text>
                                </Pressable>
                                <Pressable style={[styles.tab, tab === 'users' && styles.tabActive]} onPress={() => setTab('users')}>
                                    <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </View>

                    <View style={styles.card}>
                        {tab === 'basic' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Basic Information</Text>
                                <TextInput style={styles.input} placeholder="Merchant Name" placeholderTextColor="#8a99b3" value={name} onChangeText={setName} />
                                {errors.name ? <Text style={{ color: '#d32f2f', marginBottom: 8, marginLeft: 2, fontSize: 13 }}>{errors.name}</Text> : null}
                                <TextInput style={styles.input} placeholder="GSTIN (optional)" placeholderTextColor="#8a99b3" value={gstin} onChangeText={setGstin} />
                                <TextInput style={styles.input} placeholder="Info (optional)" placeholderTextColor="#8a99b3" value={info} onChangeText={setInfo} multiline numberOfLines={3} />
                            </View>
                        )}
                        {tab === 'contact' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Contact Information</Text>
                                <TextInput style={styles.input} placeholder="Contact Number" placeholderTextColor="#8a99b3" value={contactNum} onChangeText={setContactNum} keyboardType="phone-pad" />
                                {errors.contactNum ? <Text style={{ color: '#d32f2f', marginBottom: 8, marginLeft: 2, fontSize: 13 }}>{errors.contactNum}</Text> : null}
                                <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8a99b3" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                                {errors.email ? <Text style={{ color: '#d32f2f', marginBottom: 8, marginLeft: 2, fontSize: 13 }}>{errors.email}</Text> : null}
                                <TextInput style={styles.input} placeholder="Address Line 1" placeholderTextColor="#8a99b3" value={address} onChangeText={setAddress} />
                                <View style={styles.rowInputs}>
                                    <TextInput style={[styles.input, styles.inputRowCol]} placeholder="City" placeholderTextColor="#8a99b3" value={city} onChangeText={setCity} />
                                    <TextInput style={[styles.input, styles.inputRowCol]} placeholder="State" placeholderTextColor="#8a99b3" value={state} onChangeText={setState} />
                                    <TextInput style={[styles.input, styles.inputRowCol]} placeholder="Zip" placeholderTextColor="#8a99b3" value={zip} onChangeText={setZip} keyboardType="number-pad" />
                                </View>
                            </View>
                        )}
                        {tab === 'config' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Configuration</Text>
                                <TextInput style={styles.input} placeholder="Logo URL (optional)" placeholderTextColor="#8a99b3" value={logoUrl} onChangeText={setLogoUrl} />
                                <TextInput style={styles.input} placeholder="UPI IDs (comma separated)" placeholderTextColor="#8a99b3" value={upiIds} onChangeText={setUpiIds} />
                                <Text style={styles.helperText}>Add all UPI IDs your business accepts, separated by commas.</Text>
                            </View>
                        )}
                        {tab === 'users' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Team Management</Text>

                                {/* Add User Section */}
                                <View style={styles.addUserSection}>
                                    <Text style={styles.subSectionTitle}>Add Team Member</Text>
                                    <View style={styles.addUserRow}>
                                        <TextInput
                                            style={[styles.input, styles.addUserInput]}
                                            placeholder="Enter user email"
                                            placeholderTextColor="#8a99b3"
                                            value={newUserEmail}
                                            onChangeText={setNewUserEmail}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                        <TouchableOpacity
                                            style={[styles.addButton, addingUser && styles.addButtonDisabled]}
                                            onPress={addUser}
                                            disabled={addingUser || !newUserEmail.trim()}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.addButtonText}>
                                                {addingUser ? "Adding..." : "Add"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={styles.helperText}>Enter the email address of the user you want to add. They will be able to access this merchant when they log in.</Text>
                                </View>

                                {/* Users List */}
                                <View style={styles.usersListSection}>
                                    <Text style={styles.subSectionTitle}>Team Members ({users.length})</Text>
                                    {loadingUsers ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#1976d2" />
                                            <Text style={styles.loadingText}>Loading team members...</Text>
                                        </View>
                                    ) : (
                                        <>
                                            {users.length === 0 ? (
                                                <Text style={styles.emptyText}>No team members found.</Text>
                                            ) : (
                                                users.map((user) => {
                                                    const currentUser = auth().currentUser;
                                                    const isCurrentUser = currentUser?.uid === user.userId;

                                                    return (
                                                        <View key={user.userId} style={[styles.userCard, isCurrentUser && styles.currentUserCard]}>
                                                            <View style={styles.userInfo}>
                                                                <View style={styles.userNameRow}>
                                                                    <Text style={[styles.userEmail, isCurrentUser && styles.currentUserText]}>
                                                                        {user.displayName || user.email || user.userId}
                                                                    </Text>
                                                                    {isCurrentUser && (
                                                                        <Text style={styles.currentUserBadge}>You</Text>
                                                                    )}
                                                                </View>
                                                                {user.displayName && user.email && (
                                                                    <Text style={styles.userSecondaryInfo}>{user.email}</Text>
                                                                )}
                                                                <Text style={styles.userStatus}>
                                                                    {user.status === 'active' ? '🟢' : '🔴'} {user.role}
                                                                    {user.isPlaceholder && ' (Pending login)'}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.userActions}>
                                                                <View style={styles.roleSelector}>
                                                                    <TouchableOpacity
                                                                        style={[
                                                                            styles.roleButton,
                                                                            user.role === 'admin' && styles.roleButtonActive,
                                                                            isCurrentUser && styles.roleButtonDisabled
                                                                        ]}
                                                                        onPress={() => !isCurrentUser && updateUserRole(user.userId, 'admin')}
                                                                        disabled={isCurrentUser}
                                                                    >
                                                                        <Text style={[
                                                                            styles.roleButtonText,
                                                                            user.role === 'admin' && styles.roleButtonTextActive,
                                                                            isCurrentUser && styles.roleButtonTextDisabled
                                                                        ]}>Admin</Text>
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={[
                                                                            styles.roleButton,
                                                                            user.role === 'manager' && styles.roleButtonActive,
                                                                            isCurrentUser && styles.roleButtonDisabled
                                                                        ]}
                                                                        onPress={() => !isCurrentUser && updateUserRole(user.userId, 'manager')}
                                                                        disabled={isCurrentUser}
                                                                    >
                                                                        <Text style={[
                                                                            styles.roleButtonText,
                                                                            user.role === 'manager' && styles.roleButtonTextActive,
                                                                            isCurrentUser && styles.roleButtonTextDisabled
                                                                        ]}>Manager</Text>
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={[
                                                                            styles.roleButton,
                                                                            user.role === 'staff' && styles.roleButtonActive,
                                                                            isCurrentUser && styles.roleButtonDisabled
                                                                        ]}
                                                                        onPress={() => !isCurrentUser && updateUserRole(user.userId, 'staff')}
                                                                        disabled={isCurrentUser}
                                                                    >
                                                                        <Text style={[
                                                                            styles.roleButtonText,
                                                                            user.role === 'staff' && styles.roleButtonTextActive,
                                                                            isCurrentUser && styles.roleButtonTextDisabled
                                                                        ]}>Staff</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                                <TouchableOpacity
                                                                    style={[styles.removeButton, isCurrentUser && styles.removeButtonDisabled]}
                                                                    onPress={() => !isCurrentUser && removeUser(user.userId)}
                                                                    disabled={isCurrentUser}
                                                                >
                                                                    <Text style={[styles.removeButtonText, isCurrentUser && styles.removeButtonTextDisabled]}>
                                                                        {isCurrentUser ? "Cannot remove yourself" : "Remove"}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    );
                                                })
                                            )}
                                        </>
                                    )}
                                </View>
                            </View>
                        )}

                        {tab !== 'users' && (
                            <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={saving} activeOpacity={0.85}>
                                <Text style={styles.buttonText}>{saving ? "Updating..." : "Update Merchant"}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, paddingBottom: 32 },
    container: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 18 },
    
    // Header styles
    headerContainer: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    titleContainer: { flex: 1 },
    title: { fontSize: 24, fontWeight: '800', color: '#1976d2', marginTop: 10, marginBottom: 2, letterSpacing: 0.2 },
    subtitle: { color: '#6a7a90', fontSize: 15, fontWeight: '500', letterSpacing: 0.1 },
    logoutButton: { backgroundColor: '#f44336', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    logoutButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    tabsOuterWrap: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 18,
        marginTop: 2,
        zIndex: 2,
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#f3f6fd',
        borderRadius: 10,
        padding: 2,
        shadowColor: '#1976d2',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 0,
        marginTop: 0,
        paddingHorizontal: 8,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 7,
        alignItems: 'center',
        marginHorizontal: 2,
        backgroundColor: 'transparent',
        minWidth: 80,
    },
    tabActive: {
        backgroundColor: '#fff',
        shadowColor: '#1976d2',
        shadowOpacity: 0.10,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        color: '#6a7a90',
        fontWeight: '600',
        fontSize: 16,
        letterSpacing: 0.1,
    },
    tabTextActive: {
        color: '#1976d2',
        fontWeight: '800',
    },
    card: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 22, shadowColor: '#1976d2', shadowOpacity: 0.10, shadowRadius: 16, elevation: 6, marginBottom: 24 },
    section: { width: '100%', marginBottom: 18 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1976d2', marginBottom: 10, letterSpacing: 0.2 },
    input: { width: '100%', backgroundColor: '#f7fafd', borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 15, borderWidth: 1, borderColor: '#e3e6ea' },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    inputRowCol: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: 4,
        marginBottom: 0,
        maxWidth: '32%',
    },
    helperText: { color: '#8a99b3', fontSize: 12, marginTop: -6, marginBottom: 2, marginLeft: 2 },
    button: { backgroundColor: '#1976d2', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginTop: 10, shadowColor: '#1976d2', shadowOpacity: 0.13, shadowRadius: 8, elevation: 3 },
    buttonText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.2 },

    // User management styles
    addUserSection: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e3e6ea' },
    subSectionTitle: { fontSize: 14, fontWeight: '600', color: '#1976d2', marginBottom: 8, letterSpacing: 0.1 },
    addUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    addUserInput: { flex: 1, marginRight: 12, marginBottom: 0 },
    addButton: { backgroundColor: '#1976d2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    addButtonDisabled: { backgroundColor: '#b3b3b3' },
    addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    usersListSection: { marginTop: 12 },
    loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    loadingText: { color: '#6a7a90', marginLeft: 8, fontSize: 14 },
    emptyText: { color: '#8a99b3', textAlign: 'center', paddingVertical: 20, fontSize: 14, fontStyle: 'italic' },
    userCard: { backgroundColor: '#f9fbff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8f0fe' },
    currentUserCard: { backgroundColor: '#f0f9ff', borderWidth: 2, borderColor: '#1976d2' },
    userInfo: { marginBottom: 12 },
    userNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    userEmail: { fontSize: 15, fontWeight: '600', color: '#1976d2', marginBottom: 4 },
    currentUserText: { color: '#1565c0', fontWeight: '700' },
    currentUserBadge: { backgroundColor: '#1976d2', color: '#fff', fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, textAlign: 'center', marginLeft: 8 },
    userSecondaryInfo: { fontSize: 13, color: '#8a99b3', marginBottom: 4 },
    userStatus: { fontSize: 13, color: '#6a7a90' },
    userActions: { flexDirection: 'column', gap: 8 },
    roleSelector: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    roleButton: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e3e6ea' },
    roleButtonActive: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
    roleButtonDisabled: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
    roleButtonText: { fontSize: 12, fontWeight: '600', color: '#6a7a90' },
    roleButtonTextActive: { color: '#fff' },
    roleButtonTextDisabled: { color: '#bdbdbd' },
    removeButton: { backgroundColor: '#fff', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f44336' },
    removeButtonDisabled: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
    removeButtonText: { color: '#f44336', fontWeight: '600', fontSize: 13 },
    removeButtonTextDisabled: { color: '#bdbdbd' },
});
