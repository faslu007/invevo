import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LogoBrand } from "../../components/LogoBrand";


export default function CreateMarchant() {
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
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'basic' | 'contact' | 'config'>('basic');
    const [errors, setErrors] = useState<{ name?: string; contactNum?: string; email?: string }>({});

    const handleCreate = async () => {
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
        setLoading(true);
        try {
            const user = auth().currentUser;
            if (!user) return;
            // Create marchant doc
            const marchantRef = await firestore().collection('marchents').add({
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
                createdBy: user.uid,
                createdAt: new Date(),
            });
            // Add user doc or update
            await firestore().collection('users').doc(user.uid).set({
                userId: user.uid,
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                marchants: [marchantRef.id],
                role: 'admin',
                status: 'active',
                createdAt: new Date(),
            }, { merge: true });
            router.replace("/(protected)/home");
        } catch (e) {
            // handle error
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f8fa' }}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                <View style={styles.container}>
                    <LogoBrand size="large" />
                    <Text style={styles.title}>Create Merchant</Text>
                    <Text style={styles.subtitle}>Set up your business profile to get started.</Text>

                    <View style={styles.tabsOuterWrap}>
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
                        </View>
                    </View>

                    <View style={styles.card}>
                        {tab === 'basic' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Basic</Text>
                                <TextInput style={styles.input} placeholder="Merchant Name" value={name} onChangeText={setName} />
                                {errors.name ? <Text style={{ color: '#d32f2f', marginBottom: 8, marginLeft: 2, fontSize: 13 }}>{errors.name}</Text> : null}
                                <TextInput style={styles.input} placeholder="GSTIN (optional)" value={gstin} onChangeText={setGstin} />
                                <TextInput style={styles.input} placeholder="Info (optional)" value={info} onChangeText={setInfo} />
                            </View>
                        )}
                        {tab === 'contact' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Contact</Text>
                                <TextInput style={styles.input} placeholder="Contact Number" value={contactNum} onChangeText={setContactNum} keyboardType="phone-pad" />
                                {errors.contactNum ? <Text style={{ color: '#d32f2f', marginBottom: 8, marginLeft: 2, fontSize: 13 }}>{errors.contactNum}</Text> : null}
                                <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                                {errors.email ? <Text style={{ color: '#d32f2f', marginBottom: 8, marginLeft: 2, fontSize: 13 }}>{errors.email}</Text> : null}
                                <TextInput style={styles.input} placeholder="Address Line 1" value={address} onChangeText={setAddress} />
                                <View style={styles.rowInputs}>
                                    <TextInput style={[styles.input, styles.inputRowCol]} placeholder="City" value={city} onChangeText={setCity} />
                                    <TextInput style={[styles.input, styles.inputRowCol]} placeholder="State" value={state} onChangeText={setState} />
                                    <TextInput style={[styles.input, styles.inputRowCol]} placeholder="Zip" value={zip} onChangeText={setZip} keyboardType="number-pad" />
                                </View>
                            </View>
                        )}
                        {tab === 'config' && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Config</Text>
                                <TextInput style={styles.input} placeholder="Logo URL (optional)" value={logoUrl} onChangeText={setLogoUrl} />
                                <TextInput style={styles.input} placeholder="UPI IDs (comma separated)" value={upiIds} onChangeText={setUpiIds} />
                                <Text style={styles.helperText}>Add all UPI IDs your business accepts, separated by commas.</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
                            <Text style={styles.buttonText}>{loading ? "Creating..." : "Create Merchant"}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, paddingBottom: 32 },
    container: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 18 },
    title: { fontSize: 24, fontWeight: '800', color: '#1976d2', marginTop: 10, marginBottom: 2, letterSpacing: 0.2 },
    subtitle: { color: '#6a7a90', fontSize: 15, marginBottom: 24, fontWeight: '500', textAlign: 'center', letterSpacing: 0.1 },
    tabsOuterWrap: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 18,
        marginTop: 2,
        zIndex: 2,
    },
    tabsContainer: {
        flexDirection: 'row',
        width: '96%',
        backgroundColor: '#f3f6fd',
        borderRadius: 10,
        padding: 2,
        justifyContent: 'space-between',
        shadowColor: '#1976d2',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 0,
        marginTop: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 7,
        alignItems: 'center',
        marginHorizontal: 1,
        backgroundColor: 'transparent',
        minWidth: 0,
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
});
