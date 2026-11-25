# immobilier

A new Flutter project.

## Supabase configuration

From this directory, copy `.env.example` to `.env` and set the Supabase project
URL, anon key, and image storage bucket. The `.env` file is ignored by Git and
must remain local. The app bundles these values, so use only the public
anon/publishable key; never put a `service_role` key in this file.

Run the app from this directory, where `pubspec.yaml` is located:

```powershell
Copy-Item .env.example .env
flutter pub get
flutter run -d <device-id>
```

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
