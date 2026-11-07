import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, Empty, Label, Row, Screen, Sub, Title } from '../components/UI';
import { palette, radius, spacing } from '../theme';
import { AnimeAvatar } from '../components/AnimeAvatar';
import { AuroraBackground } from '../components/AuroraBackground';
import { SecondaryProposal } from '../engine/secondary';

export function SecundariosScreen() {
  const {
    data,
    proposeNewSecondary,
    acceptSecondary,
    removeSecondary,
    sendSecondaryMessage,
    messagesFor,
  } = useApp();
  const [proposal, setProposal] = useState<SecondaryProposal | null>(null);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [text, setText] = useState('');

  const primary = data.primary;
  if (!primary) return null;

  if (openChat) {
    const character = data.secondary.find((c) => c.id === openChat);
    if (!character) {
      setOpenChat(null);
      return null;
    }
    const msgs = messagesFor(character.id);
    return (
      <View style={styles.fill}>
        <AuroraBackground theme={data.settings.theme} perfMode={data.settings.perfMode} />
        <View style={styles.chatHeader}>
          <Pressable onPress={() => setOpenChat(null)}>
            <Text style={{ color: palette.textDim, fontSize: 14 }}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing(3) }}>
            <Text style={styles.chatName}>{character.name}</Text>
            <Text style={styles.faint}>{character.occupation}</Text>
          </View>
          <Badge text="memoria propia" color={palette.accent3} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <FlatList
            data={msgs}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: spacing(4) }}
            renderItem={({ item }) => (
              <View style={{ alignItems: item.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: spacing(2.5) }}>
                <View
                  style={[
                    styles.bubble,
                    item.from === 'user' ? styles.bubbleMine : styles.bubbleTheirs,
                  ]}
                >
                  <Text style={{ color: item.from === 'user' ? '#fff' : palette.text, fontSize: 14.5, lineHeight: 21 }}>
                    {item.text}
                  </Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Empty text="Todavía no hay mensajes con esta persona." />}
          />
          <View style={styles.inputBar}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Escríbele a ${character.name}…`}
              placeholderTextColor={palette.textFaint}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={async () => {
                const t = text.trim();
                if (!t) return;
                setText('');
                await sendSecondaryMessage(character.id, t);
              }}
              style={styles.sendBtn}
            >
              <Text style={{ color: '#05070F', fontWeight: '900', fontSize: 18 }}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <Screen>
      <View style={{ marginTop: spacing(8) }}>
        <Title size={26}>Personajes</Title>
        <Sub>
          Ella puede proponerte conocer a alguien. Tú apruebas antes de que exista. Cada personaje
          tiene su propia memoria: nadie sabe lo que no vivió.
        </Sub>

        <Card>
          <Label>{primary.name}</Label>
          <Row>
            <AnimeAvatar character={primary} emotion={data.emotion.key} size={56} />
            <View style={{ flex: 1, marginLeft: spacing(3) }}>
              <Text style={styles.name}>{primary.name}</Text>
              <Text style={styles.faint}>Compañera principal · memoria completa</Text>
            </View>
            <Badge text="principal" color={palette.accent} />
          </Row>
        </Card>

        <Label>Secundarios ({data.secondary.length})</Label>

        {data.secondary.length === 0 ? (
          <Empty text="Todavía no hay nadie más. Puedes pedirle a ella que te presente a alguien." />
        ) : (
          data.secondary.map((c) => (
            <Card key={c.id}>
              <Row>
                <AnimeAvatar character={c} emotion="tranquila" size={56} />
                <View style={{ flex: 1, marginLeft: spacing(3) }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.faint}>{c.occupation}</Text>
                </View>
              </Row>
              <Row style={{ marginTop: spacing(3) }}>
                <Button title="Abrir chat" small variant="soft" onPress={() => setOpenChat(c.id)} />
                <View style={{ width: spacing(2) }} />
                <Button
                  title="Quitar"
                  small
                  variant="ghost"
                  onPress={() =>
                    Alert.alert('Quitar personaje', `¿Eliminar a ${c.name} y su chat?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Quitar', style: 'destructive', onPress: () => removeSecondary(c.id) },
                    ])
                  }
                />
              </Row>
            </Card>
          ))
        )}

        <Button
          title="Pedirle que me presente a alguien"
          onPress={() => {
            const p = proposeNewSecondary();
            if (p) setProposal(p);
          }}
        />

        {proposal ? (
          <Card style={{ borderColor: palette.accent2, borderWidth: 1.5 }}>
            <Badge text="Propuesta de ella" color={palette.accent2} />
            <Text style={[styles.name, { marginTop: spacing(2) }]}>
              {proposal.name}, {proposal.age}
            </Text>
            <Text style={styles.body}>{proposal.role}</Text>
            <Text style={[styles.faint, { marginTop: spacing(2) }]}>
              «{proposal.reason}». Es {proposal.personality}.
            </Text>
            <Row style={{ marginTop: spacing(3) }}>
              <Button
                title="Sí, preséntamelo"
                small
                onPress={async () => {
                  await acceptSecondary(proposal);
                  setProposal(null);
                }}
              />
              <View style={{ width: spacing(2) }} />
              <Button title="Ahora no" small variant="ghost" onPress={() => setProposal(null)} />
            </Row>
          </Card>
        ) : null}

        <Card>
          <Label>Familia de {primary.name}</Label>
          {primary.family.map((f) => (
            <Row key={f.id} style={{ justifyContent: 'space-between', paddingVertical: spacing(1.5) }}>
              <Text style={styles.body}>{f.name}</Text>
              <Text style={styles.faint}>{f.canContact ? 'puede escribirte' : 'sin contacto'}</Text>
            </Row>
          ))}
          <Text style={[styles.faint, { marginTop: spacing(2) }]}>
            Puedes desactivar estos contactos en Ajustes.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: palette.bg },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingTop: Platform.OS === 'ios' ? spacing(14) : spacing(10),
    paddingBottom: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,160,255,0.16)',
    backgroundColor: 'rgba(6,9,20,0.86)',
  },
  chatName: { color: palette.text, fontSize: 16, fontWeight: '700' },
  name: { color: palette.text, fontSize: 15.5, fontWeight: '700' },
  body: { color: palette.textDim, fontSize: 14, lineHeight: 21 },
  faint: { color: palette.textFaint, fontSize: 12, lineHeight: 18 },
  bubble: { maxWidth: '82%', paddingHorizontal: spacing(3.5), paddingVertical: spacing(2.8), borderRadius: radius.lg },
  bubbleMine: { backgroundColor: palette.bubbleUser, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: 'rgba(20,29,51,0.94)', borderBottomLeftRadius: 6, borderWidth: 1, borderColor: 'rgba(120,160,255,0.20)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing(3),
    paddingBottom: Platform.OS === 'ios' ? spacing(8) : spacing(3),
    borderTopWidth: 1,
    borderTopColor: 'rgba(120,160,255,0.16)',
    backgroundColor: 'rgba(6,9,20,0.94)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(13,20,38,0.9)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    color: palette.text,
    fontSize: 14.5,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing(2),
  },
});
