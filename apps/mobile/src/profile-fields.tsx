import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { POSITIONS } from './labels'
import { colors } from './theme'
import type { Position, ProfileInput } from './types'
import { Field } from './ui'

export function ProfileFields({
  value,
  onChange,
  nameLabel = 'Nombre en el turno',
}: {
  value: ProfileInput
  onChange: (next: ProfileInput) => void
  nameLabel?: string
}) {
  function setPosition(position: Position) {
    onChange({
      ...value,
      preferredPosition: position,
      isGoalkeeper: position === 'goalkeeper',
    })
  }

  return (
    <View style={styles.wrap}>
      <Field label={nameLabel} value={value.displayName} onChangeText={(displayName) => onChange({ ...value, displayName })} />
      <Text style={styles.label}>Posición</Text>
      <View style={styles.row}>
        {POSITIONS.map((position) => {
          const selected = value.preferredPosition === position.id
          return (
            <Pressable key={position.id} onPress={() => setPosition(position.id)} style={[styles.chip, selected && styles.chipOn]}>
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{position.short}</Text>
            </Pressable>
          )
        })}
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Arquero fijo</Text>
        <Switch
          value={value.isGoalkeeper}
          onValueChange={(isGoalkeeper) =>
            onChange({
              ...value,
              isGoalkeeper,
              preferredPosition: isGoalkeeper ? 'goalkeeper' : value.preferredPosition === 'goalkeeper' ? 'midfielder' : value.preferredPosition,
            })
          }
          trackColor={{ true: colors.emerald, false: colors.border }}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Crack</Text>
        <Switch
          value={value.isCrack}
          onValueChange={(isCrack) => onChange({ ...value, isCrack })}
          trackColor={{ true: colors.emerald, false: colors.border }}
        />
      </View>
    </View>
  )
}

export const emptyProfile: ProfileInput = {
  displayName: '',
  preferredPosition: 'midfielder',
  isGoalkeeper: false,
  isCrack: false,
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextOn: { color: colors.emeraldText },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: colors.text, fontSize: 16 },
})
