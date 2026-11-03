
# C4 Model — Level 3: Component Diagram

**Project:** Immobilier Services  
**Container:** Flutter Mobile Application  
**Version:** 1.0  
**Date:** 03 November 2026

## 1. Flutter Application — Component Diagram

```mermaid
C4Component
    title Component Diagram - Flutter Mobile Application

    Person(user, "User", "A person using the real-estate mobile application")

    System_Ext(supabase, "Supabase Platform", "Shared backend services")

    Container_Boundary(flutter, "Flutter Mobile Application") {

        Component(auth, "Authentication Feature", "Flutter / Dart", "Login, registration, logout and session management")

        Component(properties, "Properties Feature", "Flutter / Dart", "Browse, create, update and permanently delete properties")

        Component(favorites, "Favorites Feature", "Flutter / Dart", "Add and remove favorite properties")

        Component(messaging, "Messaging Feature", "Flutter / Dart", "Conversations and real-time messaging")

        Component(profile, "Profile Feature", "Flutter / Dart", "View and manage user profile")

        Component(state, "State Management", "Application Layer", "Manage feature states and coordinate user actions")

        Component(repositories, "Repositories", "Data Layer", "Encapsulate data access and communicate with Supabase")

        Component(client, "Supabase Client", "Supabase Flutter SDK", "Provide access to Supabase services")
    }

    Rel(user, auth, "Authenticates")
    Rel(user, properties, "Browses and manages properties")
    Rel(user, favorites, "Manages favorites")
    Rel(user, messaging, "Exchanges messages")
    Rel(user, profile, "Manages profile")

    Rel(auth, state, "Authentication actions")
    Rel(properties, state, "Property actions")
    Rel(favorites, state, "Favorite actions")
    Rel(messaging, state, "Messaging actions")
    Rel(profile, state, "Profile actions")

    Rel(state, repositories, "Requests data operations")
    Rel(repositories, client, "Uses")
    
    Rel(client, supabase, "HTTPS / WebSocket", "Supabase SDK")

    UpdateRelStyle(user, auth, $offsetY="10")
```

## 2. Supabase Backend — External Services

The Flutter application communicates with the following Supabase services:

```mermaid
C4Container
    title Supabase Platform - Backend Services

    Person(user, "Authenticated User")

    System_Boundary(supabase, "Supabase Platform") {

        Container(auth, "Supabase Auth", "Authentication Service", "User authentication and session management")

        ContainerDb(database, "PostgreSQL", "Relational Database", "Profiles, properties, favorites, conversations and messages")

        Container(storage, "Supabase Storage", "Object Storage", "Property images and profile images")

        Container(realtime, "Supabase Realtime", "Realtime Service", "Real-time messaging and database change notifications")
    }

    Rel(user, auth, "Authenticates")
    Rel(auth, database, "Stores user identity references")
    Rel(user, database, "Accesses authorized data through RLS")
    Rel(user, storage, "Uploads and retrieves images")
    Rel(user, realtime, "Receives real-time updates")
```

## 3. Property Feature — Component Diagram

```mermaid
C4Component
    title Component Diagram - Properties Feature

    Container_Ext(supabase, "Supabase Platform", "Shared backend")

    Container_Boundary(properties, "Properties Feature") {

        Component(list, "Property List", "UI", "Displays available properties")

        Component(details, "Property Details", "UI", "Displays complete property information")

        Component(form, "Property Form", "UI", "Creates and updates properties")

        Component(typeSelector, "Property Type Selector", "UI", "Selects one of five predefined property types")

        Component(imageManager, "Property Image Manager", "Feature Component", "Manages a maximum of three images per property")

        Component(locationManager, "Property Location Manager", "Feature Component", "Manages mandatory latitude and longitude")

        Component(statusManager, "Property Status Manager", "Feature Component", "Manages property listing status")

        Component(controller, "Property Controller", "State Management", "Coordinates property operations and UI state")

        Component(repository, "Property Repository", "Data Layer", "Handles property CRUD operations")

    }

    Rel(list, controller, "Requests properties")
    Rel(details, controller, "Requests property details")
    Rel(form, typeSelector, "Uses")
    Rel(form, imageManager, "Uses")
    Rel(form, locationManager, "Uses")
    Rel(form, controller, "Submits property data")
    Rel(statusManager, controller, "Updates status")

    Rel(controller, repository, "Requests operations")
    Rel(repository, supabase, "Reads and writes property data, images and coordinates")

    Rel(supabase, repository, "Returns results")
```

## 4. Property Business Rules

| Rule | Decision |
|---|---|
| Property types | Fixed list of 5 types |
| Listing types | Sale / Rent |
| Maximum images | 3 per property |
| Geographic location | Mandatory |
| Coordinates | Latitude and longitude required together |
| Property deletion | Permanent Delete |
| Data access | Supabase Row Level Security |

## 5. Architecture Notes

- Both Flutter and React Native applications use the same Supabase backend.
- Each application implements its own UI and state management.
- The five application features are Authentication, Properties, Favorites, Messaging and Profile.
- Repositories isolate data access from UI components.
- Supabase provides authentication, PostgreSQL, storage and real-time capabilities.
- Row Level Security enforces database authorization.