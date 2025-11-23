import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChecklistItem = ({ item, index, theme, disabled = false }) => {
  const [checked, setChecked] = useState(item.completed || false);

  const toggleCheck = () => {
    if (!disabled) {
      setChecked(!checked);
      if (item.onToggle) {
        item.onToggle(!checked);
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleCheck}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={[
            styles.checkbox,
            {
              borderColor: checked ? theme.primary : theme.border,
              backgroundColor: checked ? theme.primary : 'transparent',
            },
          ]}
          onPress={toggleCheck}
          disabled={disabled}
        >
          {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
        </TouchableOpacity>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.itemText,
              {
                color: theme.text,
                textDecorationLine: checked ? 'line-through' : 'none',
                opacity: checked ? 0.7 : 1,
              },
            ]}
          >
            {index + 1}. {item.text}
          </Text>
          {item.description && (
            <Text
              style={[
                styles.descriptionText,
                {
                  color: theme.textSecondary,
                  textDecorationLine: checked ? 'line-through' : 'none',
                  opacity: checked ? 0.7 : 1,
                },
              ]}
            >
              {item.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ChecklistItem;