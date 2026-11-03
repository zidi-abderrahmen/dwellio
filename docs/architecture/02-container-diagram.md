
# C4 Level 2 — Container Diagram

## 1. Purpose

This diagram describes the high-level technical
architecture of the Immobilier Services platform.

It shows the mobile applications, external backend
services, databases, and the relationships between them.

## 2. Containers

| Container | Technology | Responsibility |
|---|---|---|
| Flutter App | Flutter / Dart | Mobile application developed with Flutter. |
| React Native App | React Native / TypeScript | Mobile application developed with React Native. |
| Supabase Auth | Supabase Auth | User authentication and session management. |
| PostgreSQL Database | PostgreSQL | Stores application data. |
| Supabase Storage | Supabase Storage | Stores property images and files. |
| Supabase Realtime | Supabase Realtime | Provides real-time communication and updates. |

## 3. Container Diagram

```mermaid
C4Container
    title Container Diagram - Immobilier Services

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="2")

    Person(visitor, "Visitor", "Browses and searches for properties.")
    Person(user, "Registered User", "Searches, publishes properties, manages favorites, and communicates.")

    System_Boundary(immobilier, "Immobilier Services") {
        Container(flutter, "Flutter App", "Flutter / Dart", "Mobile application for discovering and publishing properties.")
        Container(reactnative, "React Native App", "React Native / TypeScript", "Alternative mobile application for the same platform.")
    }

    Boundary(supabase, "Supabase Platform", "External Backend as a Service") {
        Container_Ext(auth, "Supabase Auth", "Supabase Auth", "Handles authentication and user sessions.")
        ContainerDb_Ext(database, "PostgreSQL Database", "PostgreSQL", "Stores profiles, properties, favorites, conversations, and messages.")
        Container_Ext(storage, "Supabase Storage", "Object Storage", "Stores property images and files.")
        Container_Ext(realtime, "Supabase Realtime", "WebSocket", "Delivers real-time database changes and messaging updates.")
    }

    Rel_D(visitor, flutter, "Uses")
    Rel_D(visitor, reactnative, "Uses")

    Rel_D(user, flutter, "Uses")
    Rel_D(user, reactnative, "Uses")

    Rel_D(flutter, auth, "Authenticates users", "HTTPS / Supabase SDK")
    Rel_D(reactnative, auth, "Authenticates users", "HTTPS / Supabase SDK")

    Rel_D(flutter, database, "Reads and writes data", "HTTPS / Supabase APIs")
    Rel_D(reactnative, database, "Reads and writes data", "HTTPS / Supabase APIs")

    Rel_D(flutter, storage, "Uploads and downloads images", "HTTPS")
    Rel_D(reactnative, storage, "Uploads and downloads images", "HTTPS")

    Rel_D(flutter, realtime, "Subscribes to real-time updates", "WebSocket")
    Rel_D(reactnative, realtime, "Subscribes to real-time updates", "WebSocket")

    Rel_R(realtime, database, "Listens to database changes", "Postgres Changes")

    UpdateElementStyle(visitor, $bgColor="#6C8EBF", $fontColor="#ffffff", $borderColor="#4A6A94")
    UpdateElementStyle(user, $bgColor="#2E5E9E", $fontColor="#ffffff", $borderColor="#1F4373")

    UpdateElementStyle(flutter, $bgColor="#02569B", $fontColor="#ffffff", $borderColor="#013B6A")
    UpdateElementStyle(reactnative, $bgColor="#1B7FA8", $fontColor="#ffffff", $borderColor="#125A78")

    UpdateElementStyle(auth, $bgColor="#3ECF8E", $fontColor="#10231A", $borderColor="#2A9D6B")
    UpdateElementStyle(database, $bgColor="#2FB67C", $fontColor="#10231A", $borderColor="#1F8A5C")
    UpdateElementStyle(storage, $bgColor="#5ED9A3", $fontColor="#10231A", $borderColor="#2A9D6B")
    UpdateElementStyle(realtime, $bgColor="#8BE5BC", $fontColor="#10231A", $borderColor="#2A9D6B")

    UpdateRelStyle(visitor, flutter, $textColor="#4A6A94", $lineColor="#4A6A94", $offsetX="-40", $offsetY="-10")
    UpdateRelStyle(visitor, reactnative, $textColor="#4A6A94", $lineColor="#4A6A94", $offsetX="10", $offsetY="-10")
    UpdateRelStyle(user, flutter, $textColor="#1F4373", $lineColor="#1F4373", $offsetX="-10", $offsetY="10")
    UpdateRelStyle(user, reactnative, $textColor="#1F4373", $lineColor="#1F4373", $offsetX="40", $offsetY="10")

    UpdateRelStyle(flutter, auth, $textColor="#02569B", $lineColor="#02569B", $offsetX="-90", $offsetY="-10")
    UpdateRelStyle(flutter, database, $textColor="#02569B", $lineColor="#02569B", $offsetX="-60", $offsetY="-30")
    UpdateRelStyle(flutter, storage, $textColor="#02569B", $lineColor="#02569B", $offsetX="-30", $offsetY="-50")
    UpdateRelStyle(flutter, realtime, $textColor="#02569B", $lineColor="#02569B", $offsetX="-10", $offsetY="-70")

    UpdateRelStyle(reactnative, auth, $textColor="#1B7FA8", $lineColor="#1B7FA8", $offsetX="10", $offsetY="10")
    UpdateRelStyle(reactnative, database, $textColor="#1B7FA8", $lineColor="#1B7FA8", $offsetX="30", $offsetY="30")
    UpdateRelStyle(reactnative, storage, $textColor="#1B7FA8", $lineColor="#1B7FA8", $offsetX="50", $offsetY="50")
    UpdateRelStyle(reactnative, realtime, $textColor="#1B7FA8", $lineColor="#1B7FA8", $offsetX="70", $offsetY="70")

    UpdateRelStyle(realtime, database, $textColor="#2A9D6B", $lineColor="#2A9D6B", $offsetY="-15")
```

## 4. Important Architecture Decisions

- Both mobile applications use the same Supabase backend.
- There is no separate custom backend server in the current architecture.
- Both applications access application data through Supabase APIs.
- PostgreSQL is the central source of application data.
- Supabase Storage is responsible for storing property images.
- Supabase Realtime enables live messaging updates.
- Row Level Security (RLS) protects database access.
- Authentication is handled by Supabase Auth.

## 5. Security

The mobile applications use the Supabase client libraries
to communicate with the backend services.

Database access must be protected using Row Level Security
(RLS) policies.

The Supabase service_role key must never be exposed
inside mobile applications.

## 6. Scope

This diagram focuses on the main application containers
and external backend services.

Internal application components will be described
in the C4 Level 3 Component Diagram.