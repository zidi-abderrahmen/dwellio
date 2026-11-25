import 'package:geolocator/geolocator.dart';

class LocationServiceFailure implements Exception {
  const LocationServiceFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Retrieves the device's current position without persisting it.
class LocationService {
  Future<Position> getCurrentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceFailure(
        'Location services are disabled. Please enable them and try again.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.unableToDetermine) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw const LocationServiceFailure('Location permission was denied.');
    }

    if (permission == LocationPermission.deniedForever) {
      throw const LocationServiceFailure(
        'Location permission is permanently denied. Enable it in the app settings.',
      );
    }

    return Geolocator.getCurrentPosition();
  }
}
