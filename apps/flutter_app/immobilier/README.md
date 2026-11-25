# Dwellio

The Flutter client for the Dwellio real-estate app.

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
