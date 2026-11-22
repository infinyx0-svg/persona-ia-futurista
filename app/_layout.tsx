import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../shared/theme';
import '../lib/llm';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTitleStyle: { color: theme.text, fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Personalidad IA' }} />
        <Stack.Screen name="chat" options={{ title: 'Conversando' }} />
      </Stack>
    </>
  );
}
