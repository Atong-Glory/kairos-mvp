import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleValue?: number;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressable({ 
  style, 
  children, 
  scaleValue = 0.95,
  onPressIn,
  onPressOut,
  ...rest 
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withSpring(scaleValue, { damping: 10, stiffness: 400 });
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 10, stiffness: 400 });
    if (onPressOut) onPressOut(e);
  };

  return (
    <AnimatedPressableComponent
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      {children}
    </AnimatedPressableComponent>
  );
}
