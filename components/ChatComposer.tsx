import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../shared/theme';

export function ChatComposer({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState('');

  const submit = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="Escribe algo…"
        placeholderTextColor={theme.textMuted}
        multiline
        returnKeyType="send"
        onSubmitEditing={submit}
        blurOnSubmit={false}
      />
      <Pressable style={[styles.send, (!value.trim() || disabled) && styles.sendOff]} onPress={submit}>
        <Text style={styles.sendText}>{disabled ? '…' : 'Enviar'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: theme.spacing.s,
    paddingBottom: theme.spacing.m,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    color: theme.text,
    fontSize: 16,
  },
  send: {
    backgroundColor: theme.accent,
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: theme.userText, fontWeight: '600' },
});
