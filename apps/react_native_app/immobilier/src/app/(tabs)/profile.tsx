import React, { useCallback, useEffect, useState, type ComponentProps } from 'react';
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
import { File } from 'expo-file-system';

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

import {
  AuthFailure,
  getCurrentUser,
  signOut,
  updatePassword,
} from '../../services/authService';

import { supabase } from '../../lib/supabase';
import {
  ProfileFailure,
  profileService,
} from '../../services/profileService';

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
  const colors = theme.colors;

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

  const [savedFullName, setSavedFullName] = useState('');
  const [savedPhone, setSavedPhone] = useState('');
  const [savedBio, setSavedBio] = useState('');

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const showMessage = useCallback((message: string) => {
    setSnackbarMessage(message);
  }, []);

  // -----------------------------------------------
  // Load profile
  // -----------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const user = await getCurrentUser();

        if (cancelled) return;

        setEmail(user?.email ?? null);

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

  // -----------------------------------------------
  // Form actions
  // -----------------------------------------------

  const resetFields = () => {
    setFullName(savedFullName);
    setPhone(savedPhone);
    setBio(savedBio);
    setPassword('');
    setFormErrors({});
  };

  const startEditing = () => {
    resetFields();
    setIsEditing(true);
  };

  const cancelEditing = () => {
    Keyboard.dismiss();
    resetFields();
    setPickedImage(null);
    setObscurePassword(true);
    setIsEditing(false);
  };

  // -----------------------------------------------
  // Avatar
  // -----------------------------------------------

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

  const uploadAvatar = async (image: PickedImage): Promise<string> => {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    throw new Error('You must be signed in to upload a photo.');
  }

  const userId = session.user.id;
  const fileName = `${Date.now()}.jpg`;
  const filePath = `${userId}/${fileName}`;

  // 1. Read the image bytes
  const bytes = await readImageBytes(image.uri);

  if (bytes.byteLength === 0) {
    throw new Error(
      'The selected image appears to be empty. Please try another photo.',
    );
  }

  // 2. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, bytes, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });

  if (uploadError) {
    console.error('[avatar upload]', uploadError);
    throw new Error(formatStorageUploadError(uploadError.message));
  }

  // 3. Clean up the previous avatar (best-effort, non-blocking)
  if (avatarUrl) {
    void deletePreviousAvatar(avatarUrl);
  }

  // 4. Return the new public URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  return data.publicUrl;
};

  // -----------------------------------------------
  // Validation
  // -----------------------------------------------

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

  // -----------------------------------------------
  // Save profile
  // -----------------------------------------------

  const saveProfile = async () => {
    if (!validateForm()) return;

    Keyboard.dismiss();
    setSaving(true);

    const newPassword = password;

    try {
      let nextAvatarUrl = avatarUrl ?? '';

      const image = pickedImage;

      if (image !== null) {
        nextAvatarUrl = await uploadAvatar(image);
      }

      await profileService.updateMyProfile({
        fullName,
        phone,
        avatarUrl: nextAvatarUrl,
        bio,
      });

      if (newPassword.length > 0) {
        await updatePassword(newPassword);
      }

      setSavedFullName(fullName);
      setSavedPhone(phone);
      setSavedBio(bio);

      setAvatarUrl(
        nextAvatarUrl.length === 0 ? null : nextAvatarUrl,
      );

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
      } else if (error instanceof Error) {
        showMessage(error.message);
      } else {
        showMessage('Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  // -----------------------------------------------
  // Sign out
  // -----------------------------------------------

  const handleSignOut = async () => {
    try {
      router.replace('/');
      await signOut();
    } catch (error) {
      if (error instanceof AuthFailure) {
        showMessage(error.message);
      }
    }
  };

  // -----------------------------------------------
  // Profile information
  // -----------------------------------------------

  const imageSource = pickedImage
    ? { uri: pickedImage.uri }
    : avatarUrl && avatarUrl.length > 0
      ? { uri: avatarUrl }
      : null;

  const displayName = savedFullName.trim().length === 0
    ? 'Your profile'
    : savedFullName.trim();

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');

  // -----------------------------------------------
  // Avatar component
  // -----------------------------------------------

  const renderAvatar = () => {
    const avatar = (
      <View
        style={[
          styles.avatarOuter,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        <View
          style={[
            styles.avatarInner,
            { backgroundColor: colors.secondaryContainer },
          ]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.avatarInitials, { color: colors.onSecondaryContainer }]}>
              {initials || 'U'}
            </Text>
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
              backgroundColor: colors.primary,
              borderColor: colors.surface,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="camera-outline"
            size={18}
            color={colors.onPrimary}
          />
        </View>
      </Pressable>
    );
  };

  // -----------------------------------------------
  // Profile header
  // -----------------------------------------------

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      {renderAvatar()}

      {isEditing && (
        <Text style={[styles.changePhotoText, { color: colors.primary }]}>
          Tap to change photo
        </Text>
      )}

      <Text
        variant="headlineSmall"
        numberOfLines={1}
        style={[styles.profileName, { color: colors.onBackground }]}
      >
        {displayName}
      </Text>

      {email !== null && (
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={[styles.profileEmail, { color: colors.onSurfaceVariant }]}
        >
          {email}
        </Text>
      )}

      <View
        style={[
          styles.memberBadge,
          { backgroundColor: colors.secondaryContainer },
        ]}
      >
        <MaterialCommunityIcons
          name="check-decagram-outline"
          size={15}
          color={colors.onSecondaryContainer}
        />

        <Text style={[styles.memberBadgeText, { color: colors.onSecondaryContainer }]}>
          Dwellio member
        </Text>
      </View>
    </View>
  );

  // -----------------------------------------------
  // Section title
  // -----------------------------------------------

  const SectionTitle = ({
    title,
    subtitle,
    icon,
  }: {
    title: string;
    subtitle: string;
    icon: MaterialIconName;
  }) => (
    <View style={styles.sectionTitleContainer}>
      <View
        style={[
          styles.sectionIcon,
          { backgroundColor: colors.secondaryContainer },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={colors.onSecondaryContainer}
        />
      </View>

      <View style={styles.sectionTitleText}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          {title}
        </Text>

        <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );

  // -----------------------------------------------
  // Information rows
  // -----------------------------------------------

  const renderViewContent = () => (
    <View>
      <SectionTitle
        title="Personal information"
        subtitle="Your account details"
        icon="account-circle-outline"
      />

      <View style={styles.infoList}>
        <InfoRow
          icon="email-outline"
          label="Email address"
          value={email ?? ''}
        />

        <Divider style={{ backgroundColor: colors.outlineVariant }} />

        <InfoRow
          icon="account-outline"
          label="Full name"
          value={savedFullName}
        />

        <Divider style={{ backgroundColor: colors.outlineVariant }} />

        <InfoRow
          icon="phone-outline"
          label="Phone number"
          value={savedPhone}
        />

        <Divider style={{ backgroundColor: colors.outlineVariant }} />

        <InfoRow
          icon="text-box-edit-outline"
          label="About me"
          value={savedBio}
        />
      </View>

      <Divider style={styles.sectionDivider} />

      <SectionTitle
        title="My properties"
        subtitle="Manage your published listings"
        icon="home-city-outline"
      />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/my-listings')}
        style={({ pressed }) => [
          styles.listingsCard,
          {
            backgroundColor: colors.secondaryContainer,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.listingsIcon,
            { backgroundColor: colors.surface },
          ]}
        >
          <MaterialCommunityIcons
            name="home-city"
            size={25}
            color={colors.primary}
          />
        </View>

        <View style={styles.listingsText}>
          <Text style={[styles.listingsTitle, { color: colors.onSecondaryContainer }]}>
            My Listings
          </Text>

          <Text style={[styles.listingsSubtitle, { color: colors.onSurfaceVariant }]}>
            View and manage your properties
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={25}
          color={colors.onSecondaryContainer}
        />
      </Pressable>
    </View>
  );

  // -----------------------------------------------
  // Edit form
  // -----------------------------------------------

  const renderEditContent = () => (
    <View>
      <SectionTitle
        title="Personal information"
        subtitle="Update your profile details"
        icon="account-edit-outline"
      />

      {/* Email */}
      <TextInput
        mode="outlined"
        label="Email address"
        value={email ?? ''}
        editable={false}
        left={<TextInput.Icon icon="email-outline" />}
        right={<TextInput.Icon icon="lock-outline" />}
        style={styles.input}
        outlineStyle={styles.inputOutline}
      />

      <HelperText type="info" visible style={styles.helperText}>
        Your email address cannot be changed.
      </HelperText>

      {/* Full name */}
      <TextInput
        mode="outlined"
        label="Full name"
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={value => {
          setFullName(value);
          if (formErrors.fullName) {
            setFormErrors(previous => ({
              ...previous,
              fullName: undefined,
            }));
          }
        }}
        editable={!saving}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
        left={<TextInput.Icon icon="account-outline" />}
        error={Boolean(formErrors.fullName)}
        style={styles.input}
        outlineStyle={styles.inputOutline}
      />

      <HelperText type="error" visible={Boolean(formErrors.fullName)}>
        {formErrors.fullName}
      </HelperText>

      {/* Phone */}
      <TextInput
        mode="outlined"
        label="Phone number"
        placeholder="Enter your phone number"
        value={phone}
        onChangeText={setPhone}
        editable={!saving}
        keyboardType="phone-pad"
        autoComplete="tel"
        returnKeyType="next"
        left={<TextInput.Icon icon="phone-outline" />}
        style={styles.input}
        outlineStyle={styles.inputOutline}
      />

      {/* Bio */}
      <TextInput
        mode="outlined"
        label="About me"
        placeholder="Tell us something about yourself..."
        value={bio}
        onChangeText={setBio}
        editable={!saving}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        autoCapitalize="sentences"
        style={[styles.input, styles.bioInput]}
        outlineStyle={styles.inputOutline}
      />

      <Text style={[styles.fieldHint, { color: colors.onSurfaceVariant }]}>
        A short description helps other users know you better.
      </Text>

      <Divider style={styles.sectionDivider} />

      {/* Security */}
      <SectionTitle
        title="Account security"
        subtitle="Change your password"
        icon="shield-lock-outline"
      />

      <TextInput
        mode="outlined"
        label="New password"
        placeholder="Enter a new password"
        value={password}
        onChangeText={value => {
          setPassword(value);

          if (formErrors.password) {
            setFormErrors(previous => ({
              ...previous,
              password: undefined,
            }));
          }
        }}
        editable={!saving}
        secureTextEntry={obscurePassword}
        autoComplete="new-password"
        autoCapitalize="none"
        returnKeyType="done"
        left={<TextInput.Icon icon="lock-outline" />}
        right={
          <TextInput.Icon
            icon={obscurePassword ? 'eye-outline' : 'eye-off-outline'}
            onPress={() => setObscurePassword(current => !current)}
            accessibilityLabel={obscurePassword ? 'Show password' : 'Hide password'}
          />
        }
        error={Boolean(formErrors.password)}
        style={styles.input}
        outlineStyle={styles.inputOutline}
      />

      <HelperText type="info" visible style={styles.helperText}>
        Leave blank to keep your current password.
      </HelperText>

      <HelperText type="error" visible={Boolean(formErrors.password)}>
        {formErrors.password}
      </HelperText>
    </View>
  );

  // -----------------------------------------------
  // Edit actions
  // -----------------------------------------------

  const renderEditActions = () => (
    <View style={styles.editActions}>
      <Button
        mode="outlined"
        onPress={cancelEditing}
        disabled={saving}
        style={styles.cancelButton}
        contentStyle={styles.actionButtonContent}
        textColor={colors.onSurface}
      >
        Cancel
      </Button>

      <Button
        mode="contained"
        onPress={saveProfile}
        loading={saving}
        disabled={saving}
        icon="check"
        style={styles.saveButton}
        contentStyle={styles.actionButtonContent}
      >
        Save changes
      </Button>
    </View>
  );

  // -----------------------------------------------
  // Main screen
  // -----------------------------------------------

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.screen,
        { backgroundColor: colors.background },
      ]}
    >
      {/* App bar */}
      <View style={styles.appBar}>
        <View>
          <Text style={[styles.appBarTitle, { color: colors.onBackground }]}>
            My Profile
          </Text>

          <Text style={[styles.appBarSubtitle, { color: colors.onSurfaceVariant }]}>
            Manage your account
          </Text>
        </View>

        {!isEditing && !loading && (
          <View style={styles.appBarActions}>
            <IconButton
              icon="pencil-outline"
              mode="contained-tonal"
              accessibilityLabel="Edit profile"
              onPress={startEditing}
              iconColor={colors.primary}
            />

            <IconButton
              icon="logout"
              mode="contained-tonal"
              accessibilityLabel="Log out"
              onPress={handleSignOut}
              iconColor={colors.error}
            />
          </View>
        )}

        {isEditing && (
          <IconButton
            icon="close"
            mode="contained-tonal"
            accessibilityLabel="Cancel editing"
            disabled={saving}
            onPress={cancelEditing}
          />
        )}
      </View>

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            Loading your profile...
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderHeader()}

            <Card
              mode="elevated"
              style={[
                styles.profileCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Card.Content style={styles.cardContent}>
                {isEditing
                  ? renderEditContent()
                  : renderViewContent()}
              </Card.Content>
            </Card>

            {isEditing && renderEditActions()}

            {!isEditing && (
              <Pressable
                accessibilityRole="button"
                onPress={handleSignOut}
                style={styles.logoutLink}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={19}
                  color={colors.error}
                />

                <Text style={[styles.logoutText, { color: colors.error }]}>
                  Sign out of your account
                </Text>
              </Pressable>
            )}

            <Text style={[styles.footerText, { color: colors.onSurfaceVariant }]}>
              FIND YOUR PLACE. MAKE IT HOME.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <Snackbar
        visible={snackbarMessage !== null}
        onDismiss={() => setSnackbarMessage(null)}
        duration={4000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarMessage(null),
        }}
      >
        {snackbarMessage ?? ''}
      </Snackbar>
    </SafeAreaView>
  );
}

// -----------------------------------------------
// Reusable information row
// -----------------------------------------------

type InfoRowProps = {
  icon: MaterialIconName;
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  const theme = useTheme();
  const colors = theme.colors;
  const hasValue = value.trim().length > 0;

  return (
    <View style={styles.infoRow}>
      <View
        style={[
          styles.infoIconContainer,
          { backgroundColor: colors.secondaryContainer },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={colors.onSecondaryContainer}
        />
      </View>

      <View style={styles.infoTextContainer}>
        <Text style={[styles.infoLabel, { color: colors.onSurfaceVariant }]}>
          {label}
        </Text>

        <Text
          style={[
            styles.infoValue,
            { color: hasValue ? colors.onSurface : colors.outline },
          ]}
        >
          {hasValue ? value.trim() : 'Not provided'}
        </Text>
      </View>
    </View>
  );
}

// -----------------------------------------------
// Storage helpers
// -----------------------------------------------

async function readImageBytes(uri: string): Promise<Uint8Array> {
  // Primary: new SDK 54 File API — returns Uint8Array directly.
  try {
    const file = new File(uri);
    return await file.bytes();
  } catch (fileError) {
    console.warn('[avatar] File.bytes() failed, falling back to fetch', fileError);
  }

  // Fallback: fetch(file://…) — works natively in modern Expo.
  try {
    const response = await fetch(uri);
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
  } catch (fetchError) {
    console.warn('[avatar] fetch(uri) failed too', fetchError);
  }

  throw new Error(
    'Could not read the selected image. Please pick a different photo.',
  );
}

function formatStorageUploadError(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  if (message.includes('row-level security') || message.includes('policy')) {
    return 'Upload was blocked by the storage bucket permissions. Please check the "avatars" bucket policies.';
  }
  if (message.includes('bucket') && message.includes('not found')) {
    return 'The "avatars" storage bucket could not be found. Please create it in your Supabase dashboard.';
  }
  if (message.includes('payload') || message.includes('too large')) {
    return 'The image is too large to upload. Please try a smaller photo.';
  }
  if (message.includes('mime') || message.includes('content type')) {
    return 'This image format is not supported. Please use a JPEG or PNG photo.';
  }

  return rawMessage;
}

async function deletePreviousAvatar(publicUrl: string) {
  const marker = '/storage/v1/object/public/avatars/';
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;

  const objectPath = decodeURIComponent(publicUrl.slice(index + marker.length));

  try {
    await supabase.storage.from('avatars').remove([objectPath]);
  } catch {
    // Non-critical — the new avatar is already uploaded
  }
}

// -----------------------------------------------
// Styles
// -----------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  appBar: {
    minHeight: 72,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  appBarTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  appBarSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  content: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },

  loadingText: {
    fontSize: 13,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 36,
  },

  profileHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },

  avatarPressable: {
    width: 116,
    height: 116,
  },

  avatarOuter: {
    width: 116,
    height: 116,
    padding: 5,
    borderRadius: 58,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },

  avatarInner: {
    flex: 1,
    borderRadius: 54,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarInitials: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 1,
  },

  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  changePhotoText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 9,
  },

  profileName: {
    maxWidth: '100%',
    marginTop: 15,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
  },

  profileEmail: {
    maxWidth: '100%',
    marginTop: 5,
    fontSize: 13,
    textAlign: 'center',
  },

  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 13,
  },

  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  profileCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
  },

  cardContent: {
    padding: 18,
  },

  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitleText: {
    flex: 1,
    gap: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  sectionSubtitle: {
    fontSize: 11,
  },

  infoList: {
    marginBottom: 6,
  },

  infoRow: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },

  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoTextContainer: {
    flex: 1,
    gap: 5,
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },

  sectionDivider: {
    marginVertical: 22,
  },

  listingsCard: {
    minHeight: 82,
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  listingsIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listingsText: {
    flex: 1,
    gap: 5,
  },

  listingsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  listingsSubtitle: {
    fontSize: 11,
  },

  input: {
    marginTop: 7,
    backgroundColor: 'transparent',
    fontSize: 14,
  },

  inputOutline: {
    borderRadius: 13,
  },

  bioInput: {
    minHeight: 115,
  },

  fieldHint: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 4,
  },

  helperText: {
    marginBottom: 7,
  },

  photoNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
  },

  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  cancelButton: {
    flex: 0.85,
    borderRadius: 13,
  },

  saveButton: {
    flex: 1.4,
    borderRadius: 13,
  },

  actionButtonContent: {
    minHeight: 49,
  },

  logoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 18,
    marginTop: 12,
  },

  logoutText: {
    fontSize: 13,
    fontWeight: '600',
  },

  footerText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '600',
    opacity: 0.65,
  },
});