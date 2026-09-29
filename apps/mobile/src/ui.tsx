import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from './theme'

export function Screen({ children, top = false }: { children: ReactNode; top?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={top ? ['top', 'bottom'] : ['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>
}

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null
  return <Text style={styles.error}>{children}</Text>
}

export function Field({
  label,
  value,
  onChangeText,
  secure,
  placeholder,
  keyboard,
  multiline,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  secure?: boolean
  placeholder?: string
  keyboard?: 'default' | 'email-address' | 'numeric'
  multiline?: boolean
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  )
}

export function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  tone?: 'primary' | 'ghost' | 'danger'
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, tone === 'ghost' && styles.ghost, tone === 'danger' && styles.danger, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, tone !== 'primary' && styles.buttonTextLight]}>{label}</Text>
    </Pressable>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 14 },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.emerald,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ghost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: '#3f1212', borderWidth: 1, borderColor: colors.danger },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.emeraldText, fontWeight: '800', fontSize: 16 },
  buttonTextLight: { color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
})
