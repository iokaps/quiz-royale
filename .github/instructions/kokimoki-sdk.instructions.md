---
description: Instructions for the Kokimoki SDK
applyTo: '**/*.tsx,**/*.ts'
---

# Kokimoki SDK

The Kokimoki SDK is a comprehensive development toolkit for building real-time collaborative game applications

## General guidelines

- **IMPORTANT** `kmClient` is the main entry point for Kokimoki SDK
- Use `kmClient.id` as a unique identifier for each client (player)
- Use `kmClient.store` for global stores and `kmClient.localStore` for local stores
- Use `kmClient.transact` for atomic state updates across single store or multiple stores
- Use `kmClient.upload` and related API methods to handle media uploads in application
- Use `kmClient.serverTimestamp()` for time-related matters as this will be synced among players
- Use `useSnapshot` hook from `valtio` to get reactive state inside React components
- Use AI integration API methods: `kmClient.chat` and `kmClient.transformImage` to add AI capabilities to application

## Kokimoki Client

- The `kmClient` instance is created in [km-client.ts](../../src/services/km-client.ts)
- The `kmClient` provides the following key functionalities:
  - `kmClient.store` and `kmClient.localStore` for creating stores
  - `kmClient.transact` for atomic state updates
  - `kmClient.serverTimestamp()` for synchronized timestamps
  - `kmClient.id` for unique player identification

## Client ID

- Each client (player) has a unique `kmClient.id` (aka `clientId`), stable identifier that represents a player across multiple connections
  (client sessions)
- The `kmClient.id` is persistent across client connections
- The `kmClient.id` remains consistent after user reconnect or page reload
- Use `kmClient.id` to identify players in global stores
- Each client (player) can have multiple connections, but all connections share the same `kmClient.id`

## Kokimoki Store

Kokimoki Store powered by `valtio` and `valtio-yjs` for real-time state management in Kokimoki game applications

### Store initialization

- Stores should be defined in `src/state/stores/`
- Store can be created in two ways:
  - `kmClient.localStore` is used for data stored on the player device (local)
  - `kmClient.store` is used for data shared among all players in a game (global)

**Example: Creating a Store**

```typescript
import { kmClient } from '@services/km-client';

interface State {
  title: string;
  count: number;
}

const initialState: State = {
  title: 'Store',
  count: 0
};

// Initialize global store with initial state
export const store = kmClient.store<PlayerState>('store-name', initialState);
```

### State management

- State actions are functions that modify the store state by performing transactions
- Actions should be defined in `/src/state/actions/`
- Use async/await for all state transactions by `kmClient.transact` function for global stores
- Transactions are atomic and ensure state consistency
- ALWAYS update store state inside `kmClient.transact()` within action function
- Prefer using records, not arrays: store collections as `Record<string, T>` with timestamp keys for automatic sorting and better sync performance

**Example: Updating State**

```typescript
import { store } from '../store';

// Update state
await kmClient.transact([store], ([state]) => {
  state.title = 'New store';
  state.count += 1;
});
```

### Combining Stores

- Multiple stores can be updated in a single transaction
- Prefer to update stores in a single transaction to ensure state consistency

**Example: Multiple Stores**

```typescript
// Update multiple stores in a single transaction
await kmClient.transact([store1, store2], ([state1, state2]) => {
  state1.name = 'My Store1';
  state2.name = 'My Store2';
});
```

### Reactive State in Components

- Use `useSnapshot` hook from `valtio` to get reactive state inside React components
- The component will re-render when the store state changes

**Example: Using State in Components**

```tsx
import { useSnapshot } from 'valtio';
import { store } from '../store';

const Component = () => {
  // Get reactive snapshot of the store state
  const { title, count } = useSnapshot(store.proxy);

  return (
    <div>
      <h1>Title: {title}</h1>
      <p>Count: {count}</p>
    </div>
  );
};
```

## Server Time Synchronization

Kokimoki SDK implements a time synchronization system to ensure consistent timestamps across all connected clients, regardless of their local clock differences

- Use `kmClient.serverTimestamp()` to get the current server-synchronized timestamp
- The timestamp is a Epoch Unix Timestamp
- Use server timestamps for time-related matters like event scheduling, timeouts, timers, etc.

## Media Uploads

Kokimoki SDK provides media storage service (Kokimoki server) to handle media file uploads. No setup required

### API Methods

#### upload(name, blob, tags?): Promise<Upload>

Uploads media file.

**Parameters:**

- **name**: `string` filename
- **blob**: `Blob` object to upload
- **tags**: `string[]` (optional)

**Example:**

```typescript
const upload: Upload = await kmClient.upload('filename.jpg', fileBlob, [
  'tag1',
  'tag2'
]);
// Use upload.url to access the media file
```

#### listUploads(filter?, skip?, limit?): Promise<Paginated<Upload>>

Query uploaded media files by filter and pagination

**Parameters:**

- **filter.clientId**: `string` Specific client (optional)
- **filter.mimeTypes**: `string[]` E.g., ['image/jpeg', 'image/png'] (optional)
- **filter.tags**: `string[]` All tags must match (optional)
- **skip**: `number` Pagination offset (default: 0)
- **limit**: `number` Max results (default: 100)

**Example:**

```typescript
// Query uploads by tag and uploaded by this client
const { data, total }: Paginated<Upload> = await kmClient.listUploads(
  { clientId: kmClient.id, tags: ['tag1'] },
  skip,
  limit
);
```

#### updateUpload(id, update): Promise<Upload>

Replace uploaded media file tags with new tags

**Parameters:**

- **id**: `string` Upload id
- **update.tags**: `string[]`

**Example:**

```typescript
const updatedUpload: Upload = await kmClient.updateUpload(upload.id, {
  tags: ['new']
});
```

#### deleteUpload(id): Promise<void>

Permanently delete uploaded media

**Parameters:**

- **id**: `string` Upload id

**Example:**

```typescript
await kmClient.deleteUpload(upload.id);
```

### Types

```typescript
interface Upload {
  id: string; // unique id
  url: string; // file url (CDN)
  name: string; // original filename
  size: number; // in bytes
  mimeType: string;
  clientId: string; // who uploaded
  tags: string[]; // metadata for filtering and organization
  completed: boolean; // upload status
  createdAt: Date;
  appId: string;
}

interface Paginated<T> {
  items: T[];
  total: number;
}
```

### Common Patterns

#### Example: User-specific uploads

```typescript
// Get uploaded media files by clientId
const clientUploads = await kmClient.listUploads({ clientId: kmClient.id });
```

#### Example: Filter by file type

```typescript
// Get only uploaded images
const images = await kmClient.listUploads({
  mimeTypes: ['image/jpeg', 'image/png']
});
```

#### Example: Tag-based uploads

```typescript
// Upload media file with tag
await kmClient.upload('avatar.jpg', blob, ['profile']);

// Query uploads by tag
const profileUploads = await kmClient.listUploads({ tags: ['profile'] });
```

#### Example: Usage in Kokimoki Store

```typescript
// Upload image from Blob
const upload = await kmClient.upload('file.jpg', blob);

await kmClient.transact([store], (state) => {
  // Add image to images array in the store
  state.playerImages[upload.id] = { url: upload.url };
});
```

### Key Points

- **CDN**: Media `upload.url` is public and can be used directly
- **Tags**: Use tag system to organize uploads
- **Pagination**: Use skip/limit to paginate results
- **Filtering**: Combine clientId, mimeTypes, and tags to query uploads

## AI Integration

Built-in methods for AI text generation and image transformation. No API keys required

### API Methods

#### chat(systemPrompt, userPrompt?, temperature?, maxTokens?): Promise<{ content: string }>

Used to generate text response with AI

**Parameters:**

- **systemPrompt**: `string` AI role/behavior
- **userPrompt**: `string` User message (optional)
- **temperature**: `number` Creativity level from 0.0 = factual to 1.0 = creative (optional)
- **maxTokens**: `number` Response length limit (optional)

**Examples:**

```typescript
// Generate text response
const { content } = await kmClient.chat(
  'You are a sarcastic assistant',
  'Write a story about dragons',
  0.7, // moderate creativity
  500 // limit to 500 tokens
);
```

```typescript
// Generate quiz questions in JSON format
const { content } = await kmClient.chat(
  'Return valid JSON array in the format [{"question": "string"}]',
  'Generate 5 quiz questions about history',
  0.5 // balanced creativity
);

const questions = JSON.parse(content);
```

#### transformImage(baseImageUrl, prompt, tags?): Promise<Upload>

Used to transform image with AI. The result is stored as [`Upload`](#media-uploads) object

**Parameters:**

- **baseImageUrl**: `string` Source image URL
- **prompt**: `string` Transformation description
- **tags**: `string[]` Tags for the result in `Upload` format (optional)

**Example:**

```typescript
// Transform image from url
const upload: Upload = await kmClient.transformImage(
  'https://static.kokimoki.com/game/image.jpg',
  'Make it look like a painting',
  ['art', 'ai-generated']
);
```

## Store Connections

Each Kokimoki store has a `connections` property that provides real-time presence information of all clients connected to that store.

### Accessing Connections

- Use `store.connections` to access the connections proxy for any Kokimoki store
- Use `store.connections.clientIds` to get a `Set` of online client IDs
- Use `useSnapshot` to get reactive updates when connections change
- **ALWAYS** use `useSnapshot(store.connections)` to get reactive updates when connections change

### Example: Track Online Players

```tsx
import { useSnapshot } from 'valtio';
import { globalStore } from '@/state/stores/global-store';

const Component = () => {
  // Get online client IDs from store connections
  const onlineClientIds = useSnapshot(globalStore.connections).clientIds;

  // Check if specific player is online
  const isPlayerOnline = onlineClientIds.has(playerId);

  // Get count of online players
  const onlineCount = onlineClientIds.size;

  return <div>Online players: {onlineCount}</div>;
};
```

### Example: Display Player List with Online Status

```tsx
import { useSnapshot } from 'valtio';
import { globalStore } from '@/state/stores/global-store';

const PlayerList = () => {
  const players = useSnapshot(globalStore.proxy).players;
  const onlineClientIds = useSnapshot(globalStore.connections).clientIds;

  const playersList = Object.entries(players).map(([clientId, player]) => ({
    clientId,
    name: player.name,

    isOnline: onlineClientIds.has(clientId)
  }));

  return (
    <ul>
      {playersList.map((player) => (
        <li key={player.clientId}>
          {player.name} - {player.isOnline ? 'Online' : 'Offline'}
        </li>
      ))}
    </ul>
  );
};
```

### Key Points

- Each store has its own `connections` property
- `connections.clientIds` is a `Set<string>` containing connected client IDs
- Use `useSnapshot(store.connections)` to get reactive updates
- Players can have multiple browser tabs open, but all share the same `clientId`
- A player is considered online if their `clientId` is in the `clientIds` set
