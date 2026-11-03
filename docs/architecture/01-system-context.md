
# C4 Level 1 — System Context Diagram

## 1. Purpose

This diagram provides a high-level overview of the
Immobilier Services platform, its users, and its
external dependencies.

It identifies who interacts with the system and
the main relationships between them.

## 2. System Description

Immobilier Services is a mobile real estate platform
that allows users to discover, publish, and manage
real estate listings.

Registered users can both search for properties
and publish their own properties using the same account.

## 3. Actors and External Systems

| Element | Type | Description |
|---|---|---|
| Visitor | Person | Browses and searches for properties without authentication. |
| Registered User | Person | Searches, manages favorites, communicates with other users, and publishes properties. |
| Supabase | External Software System | Provides authentication, database, file storage, and realtime services. |

## 4. System Context Diagram

```mermaid
C4Context
    title System Context - Immobilier Services

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")

    Person(visitor, "Visitor", "Browses and searches for properties without an account.")

    Person(user, "Registered User", "Searches for properties, manages favorites, communicates with users, and publishes properties.")

    System(platform, "Immobilier Services", "Mobile real estate platform for discovering and publishing property listings.")

    System_Ext(supabase, "Supabase", "Provides Authentication, PostgreSQL Database, Storage, and Realtime services.")

    Rel_D(visitor, platform, "Browses and searches properties")

    Rel_D(user, platform, "Searches, publishes properties, manages favorites, and communicates")

    Rel_R(platform, supabase, "Uses backend services", "HTTPS / Supabase APIs")

    UpdateElementStyle(visitor, $bgColor="#6C8EBF", $fontColor="#ffffff", $borderColor="#4A6A94")
    UpdateElementStyle(user, $bgColor="#2E5E9E", $fontColor="#ffffff", $borderColor="#1F4373")
    UpdateElementStyle(platform, $bgColor="#1168BD", $fontColor="#ffffff", $borderColor="#0B4884")
    UpdateElementStyle(supabase, $bgColor="#3ECF8E", $fontColor="#10231A", $borderColor="#2A9D6B")

    UpdateRelStyle(visitor, platform, $textColor="#4A6A94", $lineColor="#4A6A94", $offsetX="-60", $offsetY="-10")
    UpdateRelStyle(user, platform, $textColor="#1F4373", $lineColor="#1F4373", $offsetX="40", $offsetY="-10")
    UpdateRelStyle(platform, supabase, $textColor="#2A9D6B", $lineColor="#2A9D6B", $offsetY="-15")
```

## 5. Architecture Decisions

- A registered user can act as both a property
  seeker and a property owner using one account.
- Property Owner is not a separate account type
  or actor in this context diagram.
- Administrator functionality is outside the
  current project scope.
- Supabase is an external system, not part of
  the application's internal implementation.

## 6. Scope

This diagram represents the system at a high level.
Mobile applications, internal components, and
database structures will be detailed in subsequent
C4 diagrams.