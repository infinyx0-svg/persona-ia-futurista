import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../shared/theme';
import { ChatMessage } from '../shared/persona';

export function MessageBubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.role === 'user';
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, { color: mine ? theme.userText : theme.text }]}>{msg.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: theme.spacing.m, paddingVertical: 3, justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  mine: { backgroundColor: theme.userBubble, borderColor: 'transparent', borderBottomRightRadius: 6 },
  theirs: { backgroundColor: theme.surface, borderBottomLeftRadius: 6 },
  text: { fontSize: 16, lineHeight: 22 },
});
