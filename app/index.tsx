import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { InputField } from "../components/InputField";
import { LogoBrand } from "../components/LogoBrand";
import { useSnackbar } from "../components/SnackbarContext";

import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export default function Index() { 
  const { showSnackbar } = useSnackbar();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Handle user state changes
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Check if this user has a placeholder document that needs to be updated
          const userDocRef = firestore().collection('users').doc(user.uid);
          const userDoc = await userDocRef.get();

          // Also check if there's a placeholder document by email
          const emailQuery = await firestore()
            .collection('users')
            .where('email', '==', user.email)
            .where('isPlaceholder', '==', true)
            .get();

          if (!emailQuery.empty && !userDoc.exists()) {
            // Found a placeholder document with this email, update it with the real user ID
            const placeholderDoc = emailQuery.docs[0];
            const placeholderData = placeholderDoc.data();

            // Create the real user document
            await userDocRef.set({
              ...placeholderData,
              userId: user.uid,
              email: user.email || '',
              displayName: user.displayName || placeholderData.displayName || '',
              photoURL: user.photoURL || '',
              isPlaceholder: false,
              updatedAt: new Date(),
            });

            // Delete the placeholder document
            await placeholderDoc.ref.delete();
          } else if (userDoc.exists()) {
            // Update existing document with latest auth data
            const existingData = userDoc.data();
            if (existingData?.isPlaceholder) {
              await userDocRef.update({
                email: user.email || existingData.email,
                displayName: user.displayName || existingData.displayName || '',
                photoURL: user.photoURL || existingData.photoURL || '',
                isPlaceholder: false,
                updatedAt: new Date(),
              });
            }
          }
        } catch (error) {
          console.error('Error updating user document on login:', error);
        }

        // User is signed in, redirect to dashboard
        router.replace("/(protected)/home");
      }
      
      // Done initializing
      if (initializing) {
        setInitializing(false);
      }
    });
    
    // Unsubscribe on unmount
    return subscriber;
  }, [initializing]);

  const handleForgotPassword = async () => {
    if (!email) {
      showSnackbar("Please enter your email address above first.", "warning");
      return;
    }
    try {
      await auth().sendPasswordResetEmail(email);
      showSnackbar("Password reset email sent! Check your Inbox or Spam.", "success");
    } catch (error: any) {
      let errorMessage = "Failed to send reset email. Please try again.";
      if (error?.code === 'auth/invalid-email') {
        errorMessage = "Invalid email format.";
      } else if (error?.code === 'auth/user-not-found') {
        errorMessage = "No user found with this email.";
      }
      showSnackbar(errorMessage, "error");
    }
  };

  const signIn = async () => {
    if (!email || !password) {
      showSnackbar("Please enter both email and password", "warning");
      return;
    }
    
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      showSnackbar("Successfully signed in!", "success");
    } catch (error: any) {
      console.error("Sign in error:", error);
      let errorMessage = "Failed to sign in. Please try again.";
      
      // Check if error has a code property (React Native Firebase error format)
      if (error?.code) {
        // Handle specific Firebase errors
        console.error("Firebase error code:", error.code);
        console.error("Firebase error message:", error.message);
        
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          errorMessage = "Invalid email or password. Please check your credentials or sign up if you don't have an account.";
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = "Incorrect password.";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Invalid email format.";
        } else if (error.code === 'auth/too-many-requests') {
          errorMessage = "Too many failed attempts. Try again later.";
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      } 
      
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  const [isLogin, setIsLogin] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState("");

  const signUp = async () => {
    if (isLogin) {
      // Toggle to registration mode
      setIsLogin(false);
      return;
    }

    // Handle registration
    if (!email || !password) {
      showSnackbar("Please enter both email and password", "warning");
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Passwords don't match", "error");
      return;
    }

    if (password.length < 6) {
      showSnackbar("Password must be at least 6 characters", "warning");
      return;
    }
    
    setLoading(true);
    try {
      await auth().createUserWithEmailAndPassword(email, password);
      showSnackbar("Account created successfully!", "success");
      // No need to redirect - Firebase auth state change will trigger redirect
    } catch (error: any) {
      console.error("Sign up error:", error);
      let errorMessage = "Failed to sign up. Please try again.";
      
      if (error?.code) {
        console.error("Firebase error code:", error.code);
        
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = "Email is already in use. Try logging in instead.";
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Invalid email format.";
        } else if (error.code === 'auth/weak-password') {
          errorMessage = "Password is too weak. Choose a stronger password.";
        } else if (error.code === 'auth/network-request-failed') {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      }
      
      showSnackbar(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  }

  // Show a loading indicator while checking authentication state
  if (initializing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={[styles.container, { justifyContent: 'center' }]}> 
          <LogoBrand size="large" />
          <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.container}>
            <LogoBrand size="large" />
            <View style={styles.separator} />
            <Text style={styles.title}>{isLogin ? "Sign In" : "Sign Up"}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? "Sign in to continue" : "Sign up to get started"}
            </Text>
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />
            {!isLogin && (
              <InputField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                secureTextEntry
              />
            )}
            {isLogin && (
              <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={isLogin ? signIn : signUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? "Sign In" : "Sign Up"}</Text>
              )}
            </TouchableOpacity>
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsLogin(!isLogin)} activeOpacity={0.7}>
                <Text style={styles.signUpButtonText}>
                  {isLogin ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    paddingVertical: 24,
  },
  separator: {
    height: 0,
    marginVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
    color: "#1976d2",
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  // inputContainer and input styles are now handled by InputField
  inputContainer: {},
  input: {},
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: "#1976d2",
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.9,
  },
  button: {
    backgroundColor: "#1976d2",
    borderRadius: 9,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#1976d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  buttonDisabled: {
    backgroundColor: "#90caf9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  signUpContainer: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpText: {
    color: "#888",
    fontSize: 13,
    fontWeight: '400',
  },
  signUpButtonText: {
    color: "#1976d2",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 2,
    textDecorationLine: 'underline',
    letterSpacing: 0.1,
    opacity: 0.9,
  }
});
