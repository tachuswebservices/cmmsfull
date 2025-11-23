import React from 'react';
import { Platform, View, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Reusable Screen wrapper to standardize safe area and keyboard handling across screens.
 *
 * Props:
 * - children: React.Node
 * - withScroll: boolean (renders children inside ScrollView with bottom padding)
 * - style: container style
 * - contentContainerStyle: passed to ScrollView content
 * - safeEdges: array of edges for SafeAreaView, default ['top', 'bottom']
 * - keyboardOffset: number (KeyboardAvoidingView offset)
 * - avoidKeyboard: boolean (wrap content in KeyboardAvoidingView), default true
 * - backgroundColor: string (optional background color)
 */
const Screen = ({
  children,
  withScroll = false,
  style,
  contentContainerStyle,
  safeEdges = ['top', 'bottom'],
  keyboardOffset = 0,
  avoidKeyboard = true,
  backgroundColor,
}) => {
  const insets = useSafeAreaInsets();

  const Wrapper = ({ children }) => {
    if (!avoidKeyboard) {
      return <View style={{ flex: 1 }}>{children}</View>;
    }
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
      >
        {children}
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView
      edges={safeEdges}
      style={[{ flex: 1, backgroundColor: backgroundColor }, style]}
    >
      <Wrapper>
        {withScroll ? (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[{ paddingBottom: insets.bottom + 16 }, contentContainerStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
      </Wrapper>
    </SafeAreaView>
  );
};

export default Screen;
