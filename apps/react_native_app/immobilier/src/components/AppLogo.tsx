import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export function AppLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/logo.svg')}
        style={[styles.image, { width: size, height: size }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  image: {
    resizeMode: 'contain',
  },
});
