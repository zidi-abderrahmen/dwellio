
# 04 — Architecture Decisions Diagram

**Project:** Immobilier Services  
**Document:** Architecture Decisions  
**Version:** 1.0  
**Date:** 03 November 2026

---

## 1. Overall Architecture Decisions

```mermaid
flowchart TB
    USER["Users"]

    subgraph CLIENTS["Mobile Applications"]
        FLUTTER["Flutter Application<br/>Dart"]
        RN["React Native Application<br/>TypeScript"]
    end

    subgraph BACKEND["Shared Backend — Supabase"]
        AUTH["Supabase Auth"]
        DB[("PostgreSQL Database")]
        STORAGE["Supabase Storage"]
        REALTIME["Supabase Realtime"]
        RLS["Row Level Security"]
    end

    USER --> FLUTTER
    USER --> RN

    FLUTTER --> AUTH
    FLUTTER --> DB
    FLUTTER --> STORAGE
    FLUTTER --> REALTIME

    RN --> AUTH
    RN --> DB
    RN --> STORAGE
    RN --> REALTIME

    AUTH --> RLS
    DB --- RLS
    STORAGE --- RLS
    REALTIME --- RLS
```

## 2. Application Architecture Decisions

```mermaid
flowchart TB
    subgraph APP["Mobile Application Architecture"]
        direction TB

        UI["Presentation Layer"]

        subgraph FEATURES["Five Fixed Features"]
            AUTH["Authentication"]
            PROP["Properties"]
            FAV["Favorites"]
            MSG["Messaging"]
            PROF["Profile"]
        end

        STATE["State Management"]
        REPO["Repositories"]
        CLIENT["Supabase Client"]
    end

    UI --> FEATURES
    FEATURES --> STATE
    STATE --> REPO
    REPO --> CLIENT

    CLIENT --> SUPABASE["Shared Supabase Backend"]
```

## 3. Property Management Decisions

```mermaid
flowchart TD
    PROPERTY["Property"]

    PROPERTY --> TYPES["Property Type"]
    PROPERTY --> LISTING["Listing Type"]
    PROPERTY --> IMAGES["Property Images"]
    PROPERTY --> LOCATION["Geographic Location"]
    PROPERTY --> STATUS["Property Status"]
    PROPERTY --> DELETE["Deletion Policy"]

    TYPES --> T1["Apartment"]
    TYPES --> T2["House"]
    TYPES --> T3["Villa"]
    TYPES --> T4["Land"]
    TYPES --> T5["Commercial"]

    LISTING --> L1["Sale"]
    LISTING --> L2["Rent"]

    IMAGES --> I1["Maximum 3 Images"]

    LOCATION --> LAT["Latitude — Required"]
    LOCATION --> LNG["Longitude — Required"]

    STATUS --> S1["Available"]
    STATUS --> S2["Reserved"]
    STATUS --> S3["Sold"]
    STATUS --> S4["Rented"]

    DELETE --> D1["Permanent Delete"]
```

## 4. Security and Data Protection Decisions

```mermaid
flowchart TB
    USER["Authenticated User"]

    AUTH["Supabase Authentication"]
    TOKEN["Authenticated Session"]
    RLS["Row Level Security"]

    subgraph DATA["Protected Resources"]
        PROPERTIES[("Properties")]
        FAVORITES[("Favorites")]
        MESSAGES[("Conversations & Messages")]
        PROFILES[("Profiles")]
        STORAGE["Supabase Storage"]
    end

    USER --> AUTH
    AUTH --> TOKEN
    TOKEN --> RLS

    RLS --> PROPERTIES
    RLS --> FAVORITES
    RLS --> MESSAGES
    RLS --> PROFILES
    RLS --> STORAGE
```

## 5. Architecture Decision Map

```mermaid
mindmap
  root((Immobilier Services))
    Mobile Applications
      Flutter
      React Native
    Architecture
      Feature-Based
      Five Fixed Features
      Repositories
      State Management
    Backend
      Supabase
      PostgreSQL
      Authentication
      Storage
      Realtime
    Security
      Row Level Security
      User Ownership
      Authorized Access
    Properties
      Five Fixed Types
      Sale and Rent
      Maximum Three Images
      Mandatory Coordinates
      Permanent Deletion
```

## 6. Decision Status

```mermaid
flowchart LR
    A["Architecture Decisions"] --> B["Accepted Decisions"]

    B --> C["Backend & Database"]
    B --> D["Mobile Architecture"]
    B --> E["Security"]
    B --> F["Property Rules"]

    C --> C1["Supabase / PostgreSQL"]
    D --> D1["Flutter / React Native"]
    D --> D2["Five Fixed Features"]
    E --> E1["Authentication / RLS"]
    F --> F1["3 Images Maximum"]
    F --> F2["Mandatory Coordinates"]
    F --> F3["Permanent Delete"]
    F --> F4["Fixed Property Types"]
```

---

## 7. Architecture Principles

All architecture decisions follow these principles:

- Simplicity
- Consistency
- Security
- Maintainability
- Scalability
- Scope Control

**Decision Status:** All decisions represented in this document are accepted by the team.