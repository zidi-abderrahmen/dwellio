
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';

import PropertyCard from '../components/PropertyCard';

interface Property {
  id: string;
  title: string;
  listing_type: 'sale' | 'rent';
  property_type:
    | 'apartment'
    | 'house'
    | 'villa'
    | 'land'
    | 'office'
    | 'shop';
  price: number;
  surface_m2: number;
  rooms: number;
  bathrooms: number;
  city: string;
  address: string;
}

const fakeProperties: Property[] = [
  {
    id: '1',
    title: 'Bright 3-room apartment',
    listing_type: 'sale',
    property_type: 'apartment',
    price: 250000,
    surface_m2: 120,
    rooms: 3,
    bathrooms: 2,
    city: 'Tunis',
    address: 'Les Berges du Lac, Tunis',
  },
  {
    id: '2',
    title: 'Modern family villa',
    listing_type: 'sale',
    property_type: 'villa',
    price: 650000,
    surface_m2: 250,
    rooms: 5,
    bathrooms: 3,
    city: 'La Marsa',
    address: 'La Marsa, Tunis',
  },
  {
    id: '3',
    title: 'Cozy apartment for rent',
    listing_type: 'rent',
    property_type: 'apartment',
    price: 1200,
    surface_m2: 85,
    rooms: 2,
    bathrooms: 1,
    city: 'Ariana',
    address: 'Ennasr 2, Ariana',
  },
  {
    id: '4',
    title: 'Spacious traditional house',
    listing_type: 'sale',
    property_type: 'house',
    price: 320000,
    surface_m2: 180,
    rooms: 4,
    bathrooms: 2,
    city: 'Bizerte',
    address: 'Centre Ville, Bizerte',
  },
];

export default function HomeScreen() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (id: string) => {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const renderProperty = ({ item }: { item: Property }) => {
    const formattedPrice = `${item.price.toLocaleString(
      'fr-TN',
    )} DT`;

    return (
      <View style={styles.cardContainer}>
        <PropertyCard
          price={formattedPrice}
          period={
            item.listing_type === 'rent'
              ? '/ mois'
              : ''
          }
          title={item.title}
          location={item.address}
          surface={item.surface_m2}
          rooms={item.rooms}
          propertyType={item.property_type}
          favorite={favorites.includes(item.id)}
          onFavoritePress={() =>
            toggleFavorite(item.id)
          }
          onPress={() =>
            console.log('Selected property:', item.id)
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>
            Find your next home
          </Text>

          <Text style={styles.title}>
            Immobilier
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {fakeProperties.length} biens
          </Text>
        </View>
      </View>

      {/* Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Nos propriétés
        </Text>

        <Text style={styles.sectionSubtitle}>
          Découvrez nos dernières annonces
        </Text>
      </View>

      {/* Properties List */}
      <FlatList
        data={fakeProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  subtitle: {
    fontSize: 14,
    color: '#70787D',
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00677F',
  },

  countBadge: {
    backgroundColor: '#EFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  countText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#40484C',
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#191C1D',
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 14,
    color: '#70787D',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  cardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
});
