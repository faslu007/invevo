import { Stack } from "expo-router";
import { AlertProvider } from "../components/CustomAlert";
import { SnackbarProvider } from "../components/SnackbarContext";

export default function RootLayOut() { 
  return (
    <AlertProvider>
      <SnackbarProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="(protected)"
            options={{
              headerShown: false
            }}
          />
        </Stack>
      </SnackbarProvider>
    </AlertProvider>
  )
}