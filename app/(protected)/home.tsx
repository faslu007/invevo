import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
import { LogoBrand } from "../../components/LogoBrand";

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkMerchant = async () => {
      const user = auth().currentUser;
      if (!user) {
        router.replace("/");
        return;
      }
      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.exists() ? userDoc.data() : null;
      const merchants = userData?.marchants || [];
      if (merchants.length === 0) {
        router.replace("/(protected)/create-marchant");
        return;
      }
      setChecking(false);
    };
    checkMerchant();
  }, []);

  if (checking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <LogoBrand size="large" />
          <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <LogoBrand size="large" />
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1976d2', marginTop: 24 }}>Welcome to your Dashboard</Text>
        <Text style={{ color: '#888', marginTop: 8 }}>You have access to at least one merchant.</Text>
      </View>
    </SafeAreaView>
  );
}
