# Backend Cheatsheet — Supabase

**Project:** Mobile Services Immobilier  
**Backend owner:** Zidi Abderrahmen  
**Mobile clients:** Flutter (Dart) — Housem Aboud · React Native / Expo (TypeScript) — Gharbi Ayoub  
**Purpose:** Shared reference for connecting both mobile applications to the same Supabase project.

---

## 1. Supabase project configuration

### 1.1 Project credentials

| Setting | Value |
| --- | --- |
| Project URL | `REMOVED_URL` |
| Anon / publishable key | `REMOVED_KEY` |
| `service_role` key | **Never use in either app. Never share or commit it.** |

The URL and anon/publishable key are intended to be used by the mobile clients. They are not a replacement for database security: **Row Level Security (RLS) must remain enabled** and the policies must control what each signed-in user can read or change.

### 1.2 Flutter configuration

Create `flutter_app/lib/core/supabase_config.dart`:

```dart
class SupabaseConfig {
  static const String url = 'REMOVED_URL';
  static const String anonKey = 'REMOVED_KEY';
}
```

Initialize Supabase once, before `runApp`, for example in `main.dart`:

```dart
import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/supabase_config.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  runApp(const MyApp());
}
```

Access the shared client from services with:

```dart
final supabase = Supabase.instance.client;
```

The Dart query and Storage examples below assume this `supabase` client is available inside the service. The TypeScript examples assume `supabase` is imported from `src/lib/supabase.ts` (adjust the relative import path for each service file).

### 1.3 React Native / Expo configuration

Add the public client values to the root `.env` file of `react_native_app/`:

```env
EXPO_PUBLIC_SUPABASE_URL=REMOVED_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=REMOVED_KEY
```

Expo variables prefixed with `EXPO_PUBLIC_` are bundled into the client application. Put **only** the project URL and anon/publishable key there — never a secret key.

Create `react_native_app/src/lib/supabase.ts`:

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or anon key in Expo environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

After changing Expo environment/configuration values, restart Metro with a clean cache:

```bash
npx expo start -c
```

### 1.4 Security rules

1. Never put the `service_role` key in Flutter, React Native, `.env`, source code, screenshots, GitHub, or this document.
2. Never disable RLS to make a query work. An empty result may mean the user's access is correctly restricted or a policy/query needs investigation.
3. Do not write directly to `auth.users`. Supabase Auth manages this table.
4. The authenticated user's ID is available from `supabase.auth.currentUser?.id` in Flutter or `supabase.auth.getUser()` / the current session in TypeScript. Use that ID for `user_id`, `owner_id`, `buyer_id`, and `sender_id` where appropriate.
5. Always check errors and display a useful message. Do not silently swallow Supabase errors.

---

## 2. Authentication

### 2.1 Flutter (Dart)

The package is `supabase_flutter`. The SDK manages the persisted session and token refresh.

Example `flutter_app/lib/services/auth_service.dart`:

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  AuthService(this._client);

  final SupabaseClient _client;

  Future<AuthResponse> signUp(
    String email,
    String password,
    String fullName,
  ) {
    return _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  Future<AuthResponse> signIn(String email, String password) {
    return _client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Stream<AuthState> get authChanges => _client.auth.onAuthStateChange;
}
```

Create the service with the shared client:

```dart
final authService = AuthService(Supabase.instance.client);
```

Listen for session changes and update the app's auth state / route accordingly:

```dart
final subscription = authService.authChanges.listen((authState) {
  final session = authState.session;
  // Update the app's auth state or let the router react to this session.
});

// Cancel the subscription when its owner is disposed.
await subscription.cancel();
```

### 2.2 React Native / Expo (TypeScript)

The Supabase client in `src/lib/supabase.ts` is configured with AsyncStorage, `persistSession: true`, and `autoRefreshToken: true`.

Example `react_native_app/src/services/authService.ts`:

```ts
import { supabase } from '../lib/supabase';

export const signUp = (email: string, password: string, fullName: string) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();
```

In `AuthContext`, read the current session once, then listen for future changes:

```ts
const { data: { session: initialSession }, error } =
  await supabase.auth.getSession();

if (error) throw error;
setSession(initialSession);

const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, session) => setSession(session),
);

// In the effect cleanup:
subscription.unsubscribe();
```

### 2.3 Authentication behavior

| Action | Supabase operation | Expected result |
| --- | --- | --- |
| Register | `auth.signUp` | Auth user is created; the database trigger creates `profiles` with the same ID and `full_name` metadata. |
| Login | `auth.signInWithPassword` | A session is returned and persisted by the SDK. |
| Restore session | `auth.getSession` / SDK session restoration | The user stays signed in after closing and reopening the app. |
| Listen | `onAuthStateChange` | App responds to sign-in, sign-out, and session changes. |
| Logout | `auth.signOut` | Session is cleared and the app returns to Login. |

**Error handling:** the TypeScript SDK returns `{ data, error }`; it does not make every failed request throw automatically. Check `error` after each call. Flutter SDK calls may throw a Supabase/auth exception, so catch it at the service or UI boundary and show a readable message.

---

## 3. Database queries

All database operations use the shared Supabase client. Keep Supabase calls in services, not directly inside screen widgets/components.

### 3.1 Property search and filters

Search only active properties. Apply every supplied filter first, then sort newest first and limit the result to 30 rows.

**Flutter (Dart)**

```dart
Future<List<Map<String, dynamic>>> searchProperties({
  String? text,
  String? city,
  num? min,
  num? max,
  String? type,
  String? listing,
}) async {
  var query = supabase
      .from('properties')
      .select('''
        *,
        property_images(image_url, position),
        profiles(full_name, phone, avatar_url)
      ''')
      .eq('status', 'active');

  if (text != null && text.isNotEmpty) {
    query = query.or('title.ilike.%$text%,city.ilike.%$text%');
  }
  if (city != null && city.isNotEmpty) {
    query = query.ilike('city', '%$city%');
  }
  if (min != null) query = query.gte('price', min);
  if (max != null) query = query.lte('price', max);
  if (type != null && type.isNotEmpty) {
    query = query.eq('property_type', type);
  }
  if (listing != null && listing.isNotEmpty) {
    query = query.eq('listing_type', listing);
  }

  final rows = await query
      .order('created_at', ascending: false)
      .limit(30);

  return List<Map<String, dynamic>>.from(rows);
}
```

**React Native (TypeScript)**

```ts
export async function searchProperties(filters: {
  text?: string;
  city?: string;
  min?: number;
  max?: number;
  type?: string;
  listing?: 'sale' | 'rent';
}) {
  const { text, city, min, max, type, listing } = filters;

  let query = supabase
    .from('properties')
    .select(`
      *,
      property_images(image_url, position),
      profiles(full_name, phone, avatar_url)
    `)
    .eq('status', 'active');

  if (text) query = query.or(`title.ilike.%${text}%,city.ilike.%${text}%`);
  if (city) query = query.ilike('city', `%${city}%`);
  if (min != null) query = query.gte('price', min);
  if (max != null) query = query.lte('price', max);
  if (type) query = query.eq('property_type', type);
  if (listing) query = query.eq('listing_type', listing);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data ?? [];
}
```

> **Query rule:** apply filters first; call `order()` and `limit()` last. Use null checks for numeric filters so that a valid value of `0` is not accidentally skipped.

### 3.2 Favorites

The `favorites` table has a composite primary key `(user_id, property_id)`, so the same user cannot save the same property more than once.

**Add a favorite**

```dart
await supabase.from('favorites').insert({
  'user_id': userId,
  'property_id': propertyId,
});
```

```ts
const { error } = await supabase.from('favorites').insert({
  user_id: userId,
  property_id: propertyId,
});
if (error) throw error;
```

**Remove a favorite**

```dart
await supabase.from('favorites').delete().match({
  'user_id': userId,
  'property_id': propertyId,
});
```

```ts
const { error } = await supabase
  .from('favorites')
  .delete()
  .match({ user_id: userId, property_id: propertyId });
if (error) throw error;
```

**Load the user's favorite property IDs**

```dart
final rows = await supabase
    .from('favorites')
    .select('property_id')
    .eq('user_id', userId);

final favoriteIds = rows.map((row) => row['property_id'] as String).toSet();
```

```ts
const { data, error } = await supabase
  .from('favorites')
  .select('property_id')
  .eq('user_id', userId);

if (error) throw error;
const favoriteIds = (data ?? []).map((row) => row.property_id);
```

**Load favorites with their properties and images**

```ts
const { data, error } = await supabase
  .from('favorites')
  .select(`
    property_id,
    properties(
      *,
      property_images(image_url, position)
    )
  `)
  .eq('user_id', userId);

if (error) throw error;
```

The logged-in user's ID should be used for `user_id`. RLS also checks that `user_id = auth.uid()`.

### 3.3 Get or create a chat

There must be at most one chat for each `(property_id, buyer_id)`. The database enforces this with `UNIQUE (property_id, buyer_id)`. The buyer is the currently signed-in user; `owner_id` comes from the selected property.

**TypeScript**

```ts
export async function getOrCreateChat(
  propertyId: string,
  buyerId: string,
  ownerId: string,
): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from('chats')
    .select('id')
    .eq('property_id', propertyId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('chats')
    .insert({
      property_id: propertyId,
      buyer_id: buyerId,
      owner_id: ownerId,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
```

**Dart** — same query pattern using `maybeSingle()`:

```dart
Future<String> getOrCreateChat({
  required String propertyId,
  required String buyerId,
  required String ownerId,
}) async {
  final existing = await supabase
      .from('chats')
      .select('id')
      .eq('property_id', propertyId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

  if (existing != null) return existing['id'] as String;

  final created = await supabase
      .from('chats')
      .insert({
        'property_id': propertyId,
        'buyer_id': buyerId,
        'owner_id': ownerId,
      })
      .select('id')
      .single();

  return created['id'] as String;
}
```

Do not show the **Contact owner** button on the owner's own listing. The database also has `CHECK (buyer_id <> owner_id)`. The unique constraint protects against duplicate chats; if two requests race to create the same chat, handle the unique-violation response by fetching the existing chat again.

### 3.4 Chats list and foreign-key hints

The `chats` table references `profiles` twice: once through `buyer_id`, and once through `owner_id`. When selecting both profile relationships, explicitly name each foreign key so PostgREST knows which relationship to follow.

```ts
const { data, error } = await supabase
  .from('chats')
  .select(`
    *,
    properties(title),
    buyer:profiles!chats_buyer_id_fkey(full_name, avatar_url),
    owner:profiles!chats_owner_id_fkey(full_name, avatar_url)
  `)
  .order('last_message_at', { ascending: false });

if (error) throw error;
```

For each row, display the participant who is **not** the current user:

```ts
const otherParticipant =
  chat.buyer_id === currentUserId ? chat.owner : chat.buyer;
```

Equivalent relationship names for other queries can be found in the database schema, but the two chat profile hints above are especially important because both foreign keys point to the same table.

### 3.5 Messages query and send

Load the chat history in chronological order:

```ts
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('chat_id', chatId)
  .order('created_at', { ascending: true });

if (error) throw error;
```

Send a message using the current user's ID:

```ts
const { error } = await supabase.from('messages').insert({
  chat_id: chatId,
  sender_id: currentUserId,
  content: messageText,
});

if (error) throw error;
```

The database trigger creates the recipient's `new_message` notification and updates `chats.last_message_at` after the insert.

---

## 4. Storage

### 4.1 Buckets and path conventions

The project has two Supabase Storage buckets. Both are configured for public read access.

| Bucket | Purpose | Path convention |
| --- | --- | --- |
| `property-images` | Property photos | `{user_id}/{property_id}/{unique-name}.jpg` |
| `avatars` | Profile avatar | `{user_id}/avatar.jpg` |

The Storage policies allow authenticated users to upload, update, and delete files only inside a folder whose first path segment is their own user ID. Public read is enabled for displaying image URLs.

The execution plan sets a maximum of **5 photos per listing** and uses image-picker quality around `0.6` for React Native uploads.

### 4.2 Flutter upload

Required packages/imports used by the example: `supabase_flutter`, `uuid`, and `dart:io`.

```dart
import 'dart:io';
import 'package:uuid/uuid.dart';

Future<void> uploadPropertyImage({
  required String userId,
  required String propertyId,
  required String localFilePath,
  required int position,
}) async {
  final path = '$userId/$propertyId/${const Uuid().v4()}.jpg';

  await supabase.storage.from('property-images').upload(
    path,
    File(localFilePath),
    fileOptions: const FileOptions(contentType: 'image/jpeg'),
  );

  final publicUrl = supabase.storage
      .from('property-images')
      .getPublicUrl(path);

  await supabase.from('property_images').insert({
    'property_id': propertyId,
    'image_url': publicUrl,
    'storage_path': path,
    'position': position,
  });
}
```

For an avatar, use the `avatars` bucket and the path `'$userId/avatar.jpg'`. Upload with upsert enabled so that a user's existing avatar can be replaced:

```dart
await supabase.storage.from('avatars').upload(
  '$userId/avatar.jpg',
  File(localFilePath),
  fileOptions: const FileOptions(
    contentType: 'image/jpeg',
    upsert: true,
  ),
);

final avatarUrl = supabase.storage
    .from('avatars')
    .getPublicUrl('$userId/avatar.jpg');
```

### 4.3 React Native / Expo upload

Use Expo ImagePicker with `base64: true` and `quality: 0.6`. The `base64-arraybuffer` package converts the selected asset's base64 content into the bytes expected by Storage.

```ts
import { decode } from 'base64-arraybuffer';

async function uploadPropertyImage(
  asset: { base64?: string | null },
  userId: string,
  propertyId: string,
  position: number,
) {
  if (!asset.base64) {
    throw new Error('The selected image has no base64 data.');
  }

  const path = `${userId}/${propertyId}/${Date.now()}-${position}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('property-images')
    .upload(path, decode(asset.base64), {
      contentType: 'image/jpeg',
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('property-images')
    .getPublicUrl(path);

  const { error: insertError } = await supabase
    .from('property_images')
    .insert({
      property_id: propertyId,
      image_url: data.publicUrl,
      storage_path: path,
      position,
    });

  if (insertError) throw insertError;
  return data.publicUrl;
}
```

For an avatar, use bucket `avatars`, path `${userId}/avatar.jpg`, and pass `{ contentType: 'image/jpeg', upsert: true }` to `.upload()`.

### 4.4 Important Storage notes

- Store both `image_url` and `storage_path` in `property_images`. The URL is used to display the image; the path identifies the actual object in Storage.
- `property_images` rows are deleted by the database cascade when a property is deleted. The Storage objects themselves are **not** removed by a PostgreSQL foreign-key cascade. Removing the files using their saved `storage_path` values is optional in the MVP (Could Have).
- If an upload fails, show an error and allow a retry. Do not silently mark the photo as uploaded.
- Test that a photo uploaded by one app can be displayed by the other app through its public URL.

---

## 5. Realtime

Realtime is used for chat messages and in-app notifications. The `messages` and `notifications` tables are added to the `supabase_realtime` publication by the project's SQL setup script. Realtime still respects RLS.

### 5.1 Flutter streams

**Messages**

```dart
Stream<List<Map<String, dynamic>>> watchMessages(String chatId) {
  return supabase
      .from('messages')
      .stream(primaryKey: ['id'])
      .eq('chat_id', chatId)
      .order('created_at');
}
```

**Send a message**

```dart
Future<void> sendMessage(String chatId, String text) async {
  await supabase.from('messages').insert({
    'chat_id': chatId,
    'sender_id': supabase.auth.currentUser!.id,
    'content': text,
  });
}
```

Use `StreamBuilder` with a `ListView` (the plan suggests `ListView(reverse: true)`) to display the stream in the chat UI.

**Notifications** — same stream pattern, filtered by the current user's ID:

```dart
Stream<List<Map<String, dynamic>>> watchNotifications(String userId) {
  return supabase
      .from('notifications')
      .stream(primaryKey: ['id'])
      .eq('user_id', userId)
      .order('created_at');
}
```

### 5.2 React Native channel subscription

Load the existing messages, then subscribe to new `INSERT` events for the current chat. Remove the channel when the screen is closed or the `chatId` changes.

```tsx
useEffect(() => {
  loadHistory(); // Select messages for this chat ordered by created_at.

  const channel = supabase
    .channel(`chat-${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const incoming = payload.new as Message;
        setMessages((previous) =>
          previous.some((message) => message.id === incoming.id)
            ? previous
            : [...previous, incoming],
        );
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [chatId]);
```

`Message` should match the columns in the `messages` table. `loadHistory()` should select `*` from `messages`, filter by `chat_id`, and order by `created_at` ascending.

### 5.3 React Native notifications subscription

Use the same channel pattern, but subscribe to `notifications` and filter by the current user's ID:

```tsx
useEffect(() => {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const incoming = payload.new as AppNotification;
        setNotifications((previous) => [incoming, ...previous]);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

### 5.4 Realtime rules

1. **Load history first, then subscribe** to new messages.
2. **Do not append the sent message manually** if the Realtime subscription already delivers it. The subscription is the source of truth; the React Native example also checks message IDs to avoid duplicates.
3. **Always unsubscribe** when leaving the chat screen or when the subscription's identifiers change.
4. Subscribe only while the chat or notification screen is open, as specified in the architecture plan.
5. If no events arrive, check that the table is in the `supabase_realtime` publication, the filter uses the correct column, and the current user is allowed to read the row under RLS.

**Remote push notifications are not part of the MVP.** The MVP uses in-app notifications with Realtime while the app is open. Remote push would require additional setup (for example, Expo push tokens or Firebase and an Edge Function) and is a Could Have item only.

---

## 6. Database reference

Supabase provides `auth.users`; the project owns the following **7 public tables**: `profiles`, `properties`, `property_images`, `favorites`, `chats`, `messages`, and `notifications`.

### 6.1 `auth.users` — Supabase-managed

Do not insert, update, or delete users directly in this table. Use Supabase Auth methods.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `email` | `text` | Unique |
| `raw_user_meta_data` | `jsonb` | Holds `full_name` provided during sign-up |
| `created_at` | `timestamptz` | Creation time |

### 6.2 `profiles`

One profile belongs to one Supabase Auth user. The `handle_new_user` trigger creates it.

| Column | Type | Key / rule |
| --- | --- | --- |
| `id` | `uuid` | PK; FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | `text` |  |
| `phone` | `text` |  |
| `avatar_url` | `text` |  |
| `bio` | `text` |  |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`; updated by trigger |

### 6.3 `properties`

| Column | Type | Key / rule |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `owner_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE; NOT NULL |
| `title` | `text` | NOT NULL; 3–120 characters |
| `description` | `text` |  |
| `listing_type` | `text` | NOT NULL; `sale` or `rent` |
| `property_type` | `text` | NOT NULL; `apartment`, `house`, `villa`, `land`, `office`, or `shop` |
| `price` | `numeric(12,2)` | NOT NULL; >= 0; TND |
| `surface_m2` | `integer` | > 0 when provided |
| `rooms` | `integer` | >= 0 when provided |
| `bathrooms` | `integer` | >= 0 when provided |
| `city` | `text` | NOT NULL; indexed |
| `address` | `text` |  |
| `latitude` | `double precision` | Geographic latitude |
| `longitude` | `double precision` | Geographic longitude |
| `status` | `text` | NOT NULL; default `active`; `active`, `sold`, `rented`, or `hidden` |
| `created_at` | `timestamptz` | Default `now()` |
| `updated_at` | `timestamptz` | Default `now()`; updated by trigger |

### 6.4 `property_images`

| Column | Type | Key / rule |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `property_id` | `uuid` | FK → `properties(id)` ON DELETE CASCADE; NOT NULL |
| `image_url` | `text` | NOT NULL; public URL |
| `storage_path` | `text` | NOT NULL; Storage object path |
| `position` | `integer` | NOT NULL; default `0`; carousel order |
| `created_at` | `timestamptz` |  |

### 6.5 `favorites`

| Column | Type | Key / rule |
| --- | --- | --- |
| `user_id` | `uuid` | Composite PK part 1; FK → `profiles(id)` ON DELETE CASCADE |
| `property_id` | `uuid` | Composite PK part 2; FK → `properties(id)` ON DELETE CASCADE |
| `created_at` | `timestamptz` |  |

The composite primary key is `(user_id, property_id)`. This is a many-to-many relationship between profiles and properties and prevents duplicate favorites.

### 6.6 `chats`

| Column | Type | Key / rule |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `property_id` | `uuid` | FK → `properties(id)` ON DELETE CASCADE |
| `buyer_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE |
| `owner_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE |
| `last_message_at` | `timestamptz` | Default `now()`; updated by message trigger |
| `created_at` | `timestamptz` |  |

Constraints:

- `UNIQUE (property_id, buyer_id)` — one chat per property and buyer.
- `CHECK (buyer_id <> owner_id)` — users cannot start a chat with themselves.

### 6.7 `messages`

| Column | Type | Key / rule |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `chat_id` | `uuid` | FK → `chats(id)` ON DELETE CASCADE |
| `sender_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE |
| `content` | `text` | NOT NULL; 1–2000 characters |
| `is_read` | `boolean` | NOT NULL; default `false` |
| `created_at` | `timestamptz` | Default `now()`; indexed with `chat_id` |

### 6.8 `notifications`

| Column | Type | Key / rule |
| --- | --- | --- |
| `id` | `uuid` | PK; default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE; recipient |
| `type` | `text` | `new_message`, `favorite_added`, or `system` |
| `title` | `text` | NOT NULL |
| `body` | `text` |  |
| `data` | `jsonb` | Default empty object; can contain `chat_id` or `property_id` |
| `is_read` | `boolean` | NOT NULL; default `false` |
| `created_at` | `timestamptz` | Default `now()` |

### 6.9 Foreign-key quick reference

| Source column | References | Purpose |
| --- | --- | --- |
| `profiles.id` | `auth.users.id` | Profile for an authenticated user |
| `properties.owner_id` | `profiles.id` | Owner of a property |
| `property_images.property_id` | `properties.id` | Images belonging to a property |
| `favorites.user_id` | `profiles.id` | User who saved the property |
| `favorites.property_id` | `properties.id` | Saved property |
| `chats.property_id` | `properties.id` | Property being discussed |
| `chats.buyer_id` | `profiles.id` | User who initiated the chat |
| `chats.owner_id` | `profiles.id` | Property owner in the chat |
| `messages.chat_id` | `chats.id` | Conversation containing the message |
| `messages.sender_id` | `profiles.id` | User who sent the message |
| `notifications.user_id` | `profiles.id` | Notification recipient |

**Important PostgREST relationship names for `chats`:**

- Buyer profile: `profiles!chats_buyer_id_fkey(...)`
- Owner profile: `profiles!chats_owner_id_fkey(...)`

---

## 7. RLS and backend behavior — quick reminders

RLS is enabled on all seven public tables. The important application-level consequences are:

| Table | Expected access pattern |
| --- | --- |
| `profiles` | Authenticated users can read profiles; users can update only their own profile. |
| `properties` | Authenticated users can read active properties (owners can also read their own); only the owner can insert/update/delete their listing. |
| `property_images` | Authenticated users can read images; only the owner of the related property can insert or delete image rows. |
| `favorites` | A user can manage only rows whose `user_id` equals their auth user ID. |
| `chats` | Only the buyer and owner can read a chat; a chat insert must use the current user as buyer and the property's actual owner as owner. |
| `messages` | Only chat participants can read and send messages; the sender must be the current user. |
| `notifications` | A user can read and update only their own notifications. Database triggers create notification rows. |

The database triggers also:

- create a `profiles` row after a new Auth user is created;
- create a `new_message` notification and update `chats.last_message_at` after a message insert;
- create a `favorite_added` notification after a favorite insert;
- update `updated_at` on `profiles` and `properties` updates.

If a query returns no rows unexpectedly, check the signed-in account, the query filters, the foreign-key relationship, and the relevant RLS policy. Do not solve the problem by exposing the `service_role` key or disabling RLS.

---

## 8. Packages used by the examples

Install only the packages required by the relevant app.

**Flutter (`flutter_app/`)**

| Package | Purpose |
| --- | --- |
| `supabase_flutter` | Auth, database, Storage, Realtime |
| `uuid` | Unique file names for uploads |

The wider mobile plan also uses `go_router`, `provider`, `image_picker`, `cached_network_image`, `flutter_map`, `latlong2`, `geolocator`, and `intl` for app features.

**React Native / Expo (`rn_app/`)**

| Package | Purpose |
| --- | --- |
| `@supabase/supabase-js` | Auth, database, Storage, Realtime |
| `@react-native-async-storage/async-storage` | Persist the auth session |
| `react-native-url-polyfill` | URL support required by `supabase-js` in React Native |
| `base64-arraybuffer` | Convert image base64 data for Storage upload |

The wider mobile plan also uses `expo`, `expo-router`, `expo-image-picker`, `expo-image`, `react-native-maps`, and `expo-location` for app features.

---