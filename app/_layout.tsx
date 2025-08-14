import { Stack } from "expo-router";
import { SnackbarProvider } from "../components/SnackbarContext";

export default function RootLayOut() { 
  return (
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
  )
}