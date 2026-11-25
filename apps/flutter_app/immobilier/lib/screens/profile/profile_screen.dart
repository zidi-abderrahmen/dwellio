import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:immobilier/providers/profile_providers.dart';
import 'package:immobilier/services/profile_service.dart';

import '../../core/router.dart';
import '../../core/theme.dart';
import '../../providers/auth_providers.dart';
import '../../services/auth_service.dart';
import '../../widgets/auth_form_widgets.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _bioController = TextEditingController();
  final _passwordController = TextEditingController();
  final _picker = ImagePicker();

  bool _loading = true;
  bool _saving = false;
  bool _isEditing = false;
  bool _obscurePassword = true;

  String? _email;
  String? _avatarUrl;

  /// Image chosen from the phone gallery, not uploaded yet.
  XFile? _pickedImage;
  Uint8List? _pickedImageBytes;

  // Last saved values, shown in view mode and restored on cancel.
  String _savedFullName = '';
  String _savedPhone = '';
  String _savedBio = '';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _bioController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // -----------------------------------------------
  // Data
  // -----------------------------------------------

  Future<void> _loadProfile() async {
    // Email still comes from Supabase Auth.
    final authService = ref.read(authServiceProvider);
    _email = authService.currentUser?.email;

    try {
      // Profile information comes from public.profiles.
      final profile = await ref.read(profileServiceProvider).getMyProfile();

      if (!mounted) return;

      setState(() {
        _savedFullName = profile.fullName;
        _savedPhone = profile.phone ?? '';
        _savedBio = profile.bio ?? '';
        _avatarUrl = profile.avatarUrl;
        _resetControllers();
      });
    } on ProfileFailure catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _resetControllers() {
    _fullNameController.text = _savedFullName;
    _phoneController.text = _savedPhone;
    _bioController.text = _savedBio;
    _passwordController.clear();
  }

  // -----------------------------------------------
  // Actions
  // -----------------------------------------------

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  void _startEditing() {
    setState(() => _isEditing = true);
  }

  void _cancelEditing() {
    FocusScope.of(context).unfocus();
    setState(() {
      _resetControllers();
      _pickedImage = null;
      _pickedImageBytes = null;
      _obscurePassword = true;
      _isEditing = false;
    });
  }

  Future<void> _pickAvatar() async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (picked == null || !mounted) return;

      final bytes = await picked.readAsBytes();
      if (bytes.isEmpty) {
        _showMessage('The selected photo could not be read.');
        return;
      }

      setState(() {
        _pickedImage = picked;
        _pickedImageBytes = bytes;
      });
    } on PlatformException {
      _showMessage('Could not open your gallery.');
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;

    FocusScope.of(context).unfocus();
    setState(() => _saving = true);

    final newPassword = _passwordController.text;

    try {
      // Upload the new avatar first, if one was picked.
      var avatarUrl = _avatarUrl ?? '';
      final image = _pickedImage;
      if (image != null) {
        final imageBytes = _pickedImageBytes;
        if (imageBytes == null || imageBytes.isEmpty) {
          throw const ProfileFailure(
            'The selected photo could not be read. Please choose it again.',
          );
        }

        avatarUrl = await ref
            .read(profileServiceProvider)
            .uploadAvatar(fileName: image.name, bytes: imageBytes);
      }

      // Update profile information in public.profiles.
      final savedProfile = await ref
          .read(profileServiceProvider)
          .updateMyProfile(
            fullName: _fullNameController.text,
            phone: _phoneController.text,
            avatarUrl: avatarUrl,
            bio: _bioController.text,
          );

      // Update the password in Supabase Auth only if provided.
      if (newPassword.isNotEmpty) {
        await ref.read(authServiceProvider).updatePassword(newPassword);
      }

      if (!mounted) return;

      setState(() {
        _savedFullName = savedProfile.fullName;
        _savedPhone = savedProfile.phone ?? '';
        _savedBio = savedProfile.bio ?? '';
        _avatarUrl = savedProfile.avatarUrl;
        _pickedImage = null;
        _pickedImageBytes = null;
        _passwordController.clear();
        _obscurePassword = true;
        _isEditing = false;
      });

      _showMessage(
        newPassword.isNotEmpty
            ? 'Profile and password updated successfully.'
            : 'Profile updated successfully.',
      );
    } on ProfileFailure catch (e) {
      _showMessage(e.message);
    } on AuthFailure catch (e) {
      _showMessage(e.message);
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _signOut() async {
    final router = GoRouter.of(context);
    final messenger = ScaffoldMessenger.of(context);

    try {
      router.go(AppRoutes.home);
      await ref.read(authServiceProvider).signOut();
    } on AuthFailure catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  // -----------------------------------------------
  // Header (avatar, name, email)
  // -----------------------------------------------

  Widget _buildAvatar() {
    final avatarUrl = _avatarUrl;

    final pickedImageBytes = _pickedImageBytes;
    final ImageProvider<Object>? image = pickedImageBytes != null
        ? MemoryImage(pickedImageBytes)
        : (avatarUrl != null && avatarUrl.isNotEmpty
              ? NetworkImage(avatarUrl)
              : null);

    final avatar = Container(
      width: 104,
      height: 104,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        shape: BoxShape.circle,
        border: Border.all(width: 1, color: AppColors.outline),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(0, 0, 0, 0.08),
            offset: Offset(0, 2),
            blurRadius: 4,
          ),
        ],
      ),
      child: CircleAvatar(
        backgroundColor: AppColors.outlineVariant,
        backgroundImage: image,
        onBackgroundImageError: image == null ? null : (_, _) {},
        child: image == null
            ? const Icon(Icons.person, size: 48, color: AppColors.placeholder)
            : null,
      ),
    );

    if (!_isEditing) return avatar;

    return Semantics(
      button: true,
      label: 'Change profile photo',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _saving ? null : _pickAvatar,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: 104,
            height: 104,
            child: Stack(
              children: [
                avatar,
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: 36,
                    height: 36,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                      border: Border.all(width: 2, color: AppColors.surface),
                    ),
                    child: const Icon(
                      Icons.photo_camera_outlined,
                      size: 18,
                      color: AppColors.onPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final name = _savedFullName.trim().isEmpty
        ? 'Your profile'
        : _savedFullName.trim();

    return Column(
      children: [
        _buildAvatar(),
        const SizedBox(height: 16),
        Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 22,
            fontWeight: FontWeight.w500,
            height: 28 / 22,
            color: AppColors.onBackground,
          ),
        ),
        if (_email != null) ...[
          const SizedBox(height: 4),
          Text(
            _email!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: AppFontConfig.fontFamily,
              fontSize: 14,
              fontWeight: FontWeight.w400,
              height: 20 / 14,
              letterSpacing: 0.25,
              color: AppColors.secondary,
            ),
          ),
        ],
      ],
    );
  }

  // -----------------------------------------------
  // View mode
  // -----------------------------------------------

  Widget _buildViewContent() {
    const divider = Divider(
      height: 1,
      thickness: 1,
      color: AppColors.outlineVariant,
    );

    return Column(
      children: [
        _InfoRow(
          icon: Icons.email_outlined,
          label: 'Email',
          value: _email ?? '',
        ),
        divider,
        _InfoRow(
          icon: Icons.person_outline,
          label: 'Full name',
          value: _savedFullName,
        ),
        divider,
        _InfoRow(
          icon: Icons.phone_outlined,
          label: 'Phone',
          value: _savedPhone,
        ),
        divider,
        _InfoRow(icon: Icons.edit_note, label: 'Bio', value: _savedBio),
      ],
    );
  }

  Widget _buildMyListingsAction() {
    return Card(
      margin: EdgeInsets.zero,
      color: AppColors.surface,
      child: ListTile(
        leading: const Icon(Icons.home_work_outlined, color: AppColors.primary),
        title: const Text('My listings'),
        subtitle: const Text('View the properties you have published'),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push(AppRoutes.myListings),
      ),
    );
  }

  // -----------------------------------------------
  // Edit mode
  // -----------------------------------------------

  static const TextStyle _helperStyle = TextStyle(
    fontFamily: AppFontConfig.fontFamily,
    fontSize: 12,
    height: 16 / 12,
    letterSpacing: 0.4,
    color: AppColors.secondary,
  );

  Widget _buildEditContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Email: always read-only.
        TextFormField(
          initialValue: _email ?? '',
          readOnly: true,
          style: const TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 16,
            color: AppColors.secondary,
          ),
          decoration:
              authInputDecoration(
                label: 'Email',
                icon: Icons.email_outlined,
                suffixIcon: const Icon(Icons.lock_outline, size: 20),
              ).copyWith(
                fillColor: AppColors.surfaceVariant,
                helperText: 'Email cannot be changed.',
                helperStyle: _helperStyle,
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.outline),
                ),
              ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _fullNameController,
          enabled: !_saving,
          textCapitalization: TextCapitalization.words,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.name],
          decoration: authInputDecoration(
            label: 'Full name',
            icon: Icons.person_outline,
          ),
          validator: (value) => value == null || value.trim().isEmpty
              ? 'Please enter your full name.'
              : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phoneController,
          enabled: !_saving,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          autofillHints: const [AutofillHints.telephoneNumber],
          decoration: authInputDecoration(
            label: 'Phone',
            icon: Icons.phone_outlined,
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _bioController,
          enabled: !_saving,
          minLines: 3,
          maxLines: 5,
          textCapitalization: TextCapitalization.sentences,
          decoration: authInputDecoration(
            label: 'Bio',
            icon: Icons.edit_note,
          ).copyWith(alignLabelWithHint: true),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _passwordController,
          enabled: !_saving,
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.newPassword],
          decoration:
              authInputDecoration(
                label: 'New password (optional)',
                icon: Icons.lock_outline,
                suffixIcon: IconButton(
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                  icon: Icon(
                    _obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ).copyWith(
                helperText: 'Leave blank to keep your current password.',
                helperStyle: _helperStyle,
                helperMaxLines: 2,
              ),
          validator: (value) {
            if (value != null && value.isNotEmpty && value.length < 6) {
              return 'Password must be at least 6 characters.';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildEditActions() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _saving ? null : _cancelEditing,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.secondary,
              minimumSize: const Size.fromHeight(48),
              side: const BorderSide(color: AppColors.outline),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              textStyle: const TextStyle(
                fontFamily: AppFontConfig.fontFamily,
                fontSize: 16,
                fontWeight: FontWeight.w500,
                height: 24 / 16,
                letterSpacing: 0.15,
              ),
            ),
            child: const Text('Cancel'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: AuthSubmitButton(
            label: 'Save changes',
            loading: _saving,
            onPressed: _saveProfile,
          ),
        ),
      ],
    );
  }

  // -----------------------------------------------
  // Screen
  // -----------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        title: const Text(
          'Profile',
          style: TextStyle(
            fontFamily: AppFontConfig.fontFamily,
            fontSize: 22,
            fontWeight: FontWeight.w500,
            height: 28 / 22,
            color: AppColors.onBackground,
          ),
        ),
        actions: _isEditing
            ? null
            : [
                IconButton(
                  tooltip: 'Edit profile',
                  onPressed: _loading ? null : _startEditing,
                  icon: const Icon(Icons.edit_outlined),
                ),
                IconButton(
                  tooltip: 'Log out',
                  onPressed: _loading ? null : _signOut,
                  icon: const Icon(Icons.logout),
                ),
              ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              )
            : Form(
                key: _formKey,
                child: ListView(
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 24),
                    AuthCard(
                      child: _isEditing
                          ? _buildEditContent()
                          : _buildViewContent(),
                    ),
                    if (!_isEditing) ...[
                      const SizedBox(height: 16),
                      _buildMyListingsAction(),
                    ],
                    if (_isEditing) ...[
                      const SizedBox(height: 24),
                      _buildEditActions(),
                    ],
                  ],
                ),
              ),
      ),
    );
  }
}

// --------------------------------------------------
// Read-only info row (view mode)
// --------------------------------------------------

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final hasValue = value.trim().isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 24, color: AppColors.secondary),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontFamily: AppFontConfig.fontFamily,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    height: 16 / 12,
                    letterSpacing: 0.4,
                    color: AppColors.secondary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  hasValue ? value.trim() : 'Not provided',
                  style: TextStyle(
                    fontFamily: AppFontConfig.fontFamily,
                    fontSize: 16,
                    fontWeight: FontWeight.w400,
                    height: 24 / 16,
                    letterSpacing: 0.15,
                    color: hasValue
                        ? AppColors.onSurface
                        : AppColors.placeholder,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
