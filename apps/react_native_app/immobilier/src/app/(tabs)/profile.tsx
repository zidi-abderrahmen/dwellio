import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  HelperText,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { AuthFailure, getCurrentUser, signOut, updatePassword } from '../../services/authService';
import { ProfileFailure, profileService } from '../../services/profileService';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type PickedImage = {
  uri: string;
};

type FormErrors = {
  fullName?: string;
  password?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [obscurePassword, setObscurePassword] = useState(true);

  const [email, setEmail] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');

  // Last saved values, shown in view mode and restored on cancel.
  const [savedFullName, setSavedFullName] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [savedBio, setSavedBio] = useState('');

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const showMessage = useCallback((message: string) => {
    setSnackbarMessage(message);
  }, []);

  // --------------------------------------------------
  // Data
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        // Email still comes from Supabase Auth.
        const user = await getCurrentUser();
        if (cancelled) return;
        setEmail(user?.email ?? null);

        // Profile information comes from public.profiles.
        const profile = await profileService.getMyProfile();
        if (cancelled) return;

        setSavedFullName(profile.fullName);
        setSavedPhone(profile.phone ?? '');
        setSavedBio(profile.bio ?? '');
        setAvatarUrl(profile.avatarUrl);

        setFullName(profile.fullName);
        setPhone(profile.phone ?? '');
        setBio(profile.bio ?? '');
        setPassword('');
      } catch (error) {
        if (cancelled) return;

        if (
          (error instanceof ProfileFailure || error instanceof AuthFailure) &&
          error instanceof Error
        ) {
          showMessage(error.message);
        } else {
          showMessage('Unable to load your profile. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [showMessage]);

  const resetFields = () => {
    setFullName(savedFullName);
    setPhone(savedPhone);
    setBio(savedBio);
    setPassword('');
    setFormErrors({});
  };

  // TODO(upload): upload the selected image to Supabase Storage and return its public URL.
  // Until the image uploader service exists, the current avatar URL is kept.
  const uploadAvatar = async (_image: PickedImage): Promise<string> => {
    return avatarUrl ?? '';
  };

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    Keyboard.dismiss();
    resetFields();
    setPickedImage(null);
    setObscurePassword(true);
    setIsEditing(false);
  };

  const pickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const optimizedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024, height: 1024 } }],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      setPickedImage({ uri: optimizedImage.uri });
    } catch {
      showMessage('Could not open your gallery.');
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (fullName.trim().length === 0) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    if (password.length > 0 && password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveProfile = async () => {
    if (!validateForm()) return;

    Keyboard.dismiss();
    setSaving(true);

    const newPassword = password;

    try {
      // Upload the new avatar first, if one was picked.
      let nextAvatarUrl = avatarUrl ?? '';
      const image = pickedImage;
      if (image !== null) {
        nextAvatarUrl = await uploadAvatar(image);
      }

      // Update profile information in public.profiles.
      await profileService.updateMyProfile({
        fullName,
        phone,
        avatarUrl: nextAvatarUrl,
        bio,
      });

      // Update the password in Supabase Auth only if provided.
      if (newPassword.length > 0) {
        await updatePassword(newPassword);
      }

      setSavedFullName(fullName);
      setSavedPhone(phone);
      setSavedBio(bio);
      setAvatarUrl(nextAvatarUrl.length === 0 ? null : nextAvatarUrl);
      setPickedImage(null);
      setPassword('');
      setObscurePassword(true);
      setFormErrors({});
      setIsEditing(false);

      showMessage(
        newPassword.length > 0
          ? 'Profile and password updated successfully.'
          : 'Profile updated successfully.',
      );
    } catch (error) {
      if (
        (error instanceof ProfileFailure || error instanceof AuthFailure) &&
        error instanceof Error
      ) {
        showMessage(error.message);
      } else {
        showMessage('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Navigate to Home before signing out, as in the Flutter screen.
      router.replace('/');
      await signOut();
    } catch (error) {
      if (error instanceof AuthFailure) {
        showMessage(error.message);
      }
    }
  };

  // --------------------------------------------------
  // Header (avatar, name, email)
  // --------------------------------------------------

  const imageSource = pickedImage
    ? { uri: pickedImage.uri }
    : avatarUrl && avatarUrl.length > 0
      ? { uri: avatarUrl }
      : null;

  const displayName = savedFullName.trim().length === 0
    ? 'Your profile'
    : savedFullName.trim();

  const renderAvatar = () => {
    const avatar = (
      <View
        style={[
          styles.avatarOuter,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View
          style={[
            styles.avatarInner,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={() => undefined}
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={48}
              color={theme.colors.outline}
            />
          )}
        </View>
      </View>
    );

    if (!isEditing) return avatar;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        disabled={saving}
        onPress={pickAvatar}
        style={styles.avatarPressable}
      >
        {avatar}
        <View
          style={[
            styles.cameraBadge,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.surface,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="camera-outline"
            size={18}
            color={theme.colors.onPrimary}
          />
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      {renderAvatar()}
      <Text
        variant="headlineSmall"
        numberOfLines={1}
        style={[styles.profileName, { color: theme.colors.onBackground }]}
      >
        {displayName}
      </Text>
      {email !== null ? (
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={[styles.profileEmail, { color: theme.colors.secondary }]}
        >
          {email}
        </Text>
      ) : null}
    </View>
  );

  // --------------------------------------------------
  // View mode
  // --------------------------------------------------

  const renderViewContent = () => (
    <View>
      <InfoRow icon="email-outline" label="Email" value={email ?? ''} />
      <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
      <InfoRow icon="account-outline" label="Full name" value={savedFullName} />
      <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
      <InfoRow icon="phone-outline" label="Phone" value={savedPhone} />
      <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
      <InfoRow icon="text-box-edit-outline" label="Bio" value={savedBio} />
      <Divider style={{ backgroundColor: theme.colors.outlineVariant }} />
      <Button
        accessibilityLabel="View my listings"
        icon="home-city-outline"
        mode="outlined"
        onPress={() => router.push('/my-listings')}
        style={styles.myListingsButton}
      >
        My Listings
      </Button>
    </View>
  );

  // --------------------------------------------------
  // Edit mode
  // --------------------------------------------------

  const renderEditContent = () => (
    <View>
      {/* Email: always read-only. */}
      <TextInput
        mode="outlined"
        label="Email"
        value={email ?? ''}
        editable={false}
        left={<TextInput.Icon icon="email-outline" />}
        right={<TextInput.Icon icon="lock-outline" />}
        style={styles.input}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.outline}
        disabled={false}
      />
      <HelperText type="info" visible style={styles.helperText}>
        Email cannot be changed.
      </HelperText>

      <TextInput
        mode="outlined"
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        editable={!saving}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        left={<TextInput.Icon icon="account-outline" />}
        error={Boolean(formErrors.fullName)}
        style={styles.input}
      />
      <HelperText type="error" visible={Boolean(formErrors.fullName)}>
        {formErrors.fullName}
      </HelperText>

      <TextInput
        mode="outlined"
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        editable={!saving}
        keyboardType="phone-pad"
        autoComplete="tel"
        returnKeyType="next"
        left={<TextInput.Icon icon="phone-outline" />}
        style={styles.input}
      />

      <TextInput
        mode="outlined"
        label="Bio"
        value={bio}
        onChangeText={setBio}
        editable={!saving}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        autoCapitalize="sentences"
        left={<TextInput.Icon icon="text-box-edit-outline" />}
        style={[styles.input, styles.bioInput]}
      />

      <TextInput
        mode="outlined"
        label="New password (optional)"
        value={password}
        onChangeText={setPassword}
        editable={!saving}
        secureTextEntry={obscurePassword}
        autoComplete="new-password"
        returnKeyType="done"
        left={<TextInput.Icon icon="lock-outline" />}
        right={
          <TextInput.Icon
            icon={obscurePassword ? 'eye-outline' : 'eye-off-outline'}
            onPress={() => setObscurePassword((current) => !current)}
          />
        }
        error={Boolean(formErrors.password)}
        style={styles.input}
      />
      <HelperText type="info" visible style={styles.helperText}>
        Leave blank to keep your current password.
      </HelperText>
      <HelperText type="error" visible={Boolean(formErrors.password)}>
        {formErrors.password}
      </HelperText>
    </View>
  );

  const renderEditActions = () => (
    <View style={styles.editActions}>
      <Button
        mode="outlined"
        onPress={cancelEditing}
        disabled={saving}
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
        textColor={theme.colors.secondary}
      >
        Cancel
      </Button>
      <Button
        mode="contained"
        onPress={saveProfile}
        loading={saving}
        disabled={saving}
        style={styles.actionButton}
        contentStyle={styles.actionButtonContent}
      >
        Save changes
      </Button>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.appBar}>
        <Text
          variant="titleLarge"
          style={{ color: theme.colors.onBackground }}
        >
          Profile
        </Text>

        {!isEditing ? (
          <View style={styles.appBarActions}>
            <IconButton
              icon="pencil-outline"
              accessibilityLabel="Edit profile"
              disabled={loading}
              onPress={startEditing}
              iconColor={theme.colors.onSurface}
            />
            <IconButton
              icon="logout"
              accessibilityLabel="Log out"
              disabled={loading}
              onPress={handleSignOut}
              iconColor={theme.colors.onSurface}
            />
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {renderHeader()}

            <Card
              mode="elevated"
              style={[
                styles.profileCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Card.Content>
                {isEditing ? renderEditContent() : renderViewContent()}
              </Card.Content>
            </Card>

            {isEditing ? renderEditActions() : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Snackbar
        visible={snackbarMessage !== null}
        onDismiss={() => setSnackbarMessage(null)}
        duration={4000}
      >
        {snackbarMessage ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

type InfoRowProps = {
  icon: MaterialIconName;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  const theme = useTheme();
  const hasValue = value.trim().length > 0;

  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={theme.colors.secondary}
        style={styles.infoIcon}
      />
      <View style={styles.infoTextContainer}>
        <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>
          {label}
        </Text>
        <Text
          variant="bodyLarge"
          style={{
            color: hasValue ? theme.colors.onSurface : theme.colors.outline,
          }}
        >
          {hasValue ? value.trim() : 'Not provided'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  appBar: {
    minHeight: 56,
    paddingLeft: 16,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  myListingsButton: {
    marginTop: 16,
  },
  profileName: {
    maxWidth: '100%',
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '500',
    textAlign: 'center',
  },
  profileEmail: {
    maxWidth: '100%',
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    textAlign: 'center',
  },
  avatarPressable: {
    width: 104,
    height: 104,
  },
  avatarOuter: {
    width: 104,
    height: 104,
    padding: 4,
    borderRadius: 52,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 48,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    minHeight: 72,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
    paddingTop: 2,
    gap: 2,
  },
  input: {
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  bioInput: {
    minHeight: 112,
  },
  helperText: {
    marginBottom: 4,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  actionButtonContent: {
    minHeight: 48,
  },
});
