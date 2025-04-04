# Supabase SDK for ReEnvision AI OS

The `@reenvision-ai/reai-os-sdk` is a lightweight JavaScript library designed to simplify Supabase integration within the "ReEnvision AI OS" web desktop environment. It provides a React hook, `useSupabase`, that initializes a Supabase client using URL parameters and supports app-specific initialization logic. This SDK is tailored for applications running in iframes, ensuring consistent database connectivity and one-time setup across your ecosystem.

## Features
- **Supabase Client Initialization**: Automatically configures a Supabase client using URL search parameters (`supabaseUrl`, `supabaseKey`, `accessToken`, `refreshToken`).
- **React Hook Integration**: Provides a `useSupabase` hook for seamless use in React components.
- **App-Specific Initialization**: Allows each app to define a custom `initialize` function that runs once to set up database resources (e.g., tables, default data).
- **Error and Loading States**: Returns `error`, `loading`, and `isInitialized` states for robust app development.

## Installation
### Prerequisites
- **Node.js**: Version 14 or higher.
- **npm or pnpm**: For package management.
- **React**: Version 18 or higher (peer dependency).
- **Supabase**: An active Supabase project with a database and API credentials.
- **Supabase JS Client**: Version 2 or higher (peer dependency).

### Get the SDK from GitHub
The SDK is hosted on GitHub at [ReEnvision-AI/reai-os-sdk](https://github.com/ReEnvision-AI/reai-os-sdk). 

```bash
npm install git+ssh://github.com/ReEnvision-AI/reai-os-sdk
```

## Setup
### Database
The SDK uses a Supabase table, `app_installations`, to track whether an app has been initialized. The `app_installations` table has a column for `user_id`, `app_id`, and `intialized`

For apps that need to create tables dynamically during initialization, define a custom PostgreSQL function:
```sql
CREATE OR REPLACE FUNCTION create_table_if_not_exists(table_name TEXT, schema TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = table_name) THEN
    EXECUTE 'CREATE TABLE ' || table_name || ' (' || schema || ')';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### URL Parameters
The SDK expects the following URL parameters to be passed to each iframe:
- **supabaseUrl**: The Supabase project URL (e.g., https://xyz.supabase.co).
- **supabaseKey**: The Supabase public API key.
- **accessToken**: The user’s access token for authentication.
- **refreshToken**: The refresh token for session management.

## Usage
The SDK exports a single React hook, `useSupabase`, which you can use in your app components.

### Basic Example
```javascript
import React from 'react';
import { useSupabase } from '@reenvision-ai/reai-os-sdk';

function App() {
  const { supabase, error, loading } = useSupabase({ appId: 'my-app' });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleAction = async () => {
    const { data, error } = await supabase.from('some_table').select('*');
    console.log(data, error);
  };

  return (
    <div>
      <h1>My App</h1>
      <button onClick={handleAction}>Fetch Data</button>
    </div>
  );
}

export default App;
```

### With Custom Initialization
To perform one-time setup (e.g., creating tables or inserting default data), provide an `initialize` function:
```javascript
import React from 'react';
import { useSupabase } from '@reenvision-ai/reai-os-sdk';

function AgentChatApp() {
  const initializeApp = async (supabase) => {
    // Create a chat_messages table if it doesn’t exist (if there is already an rpc )
    const { error: tableError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'chat_messages',
      schema: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
    });
    if (tableError) throw tableError;

    // Insert a welcome message
    const { error: insertError } = await supabase
      .from('chat_messages')
      .insert({ content: 'Welcome to Agent Chat!' });
    if (insertError) throw insertError;
  };

  const { supabase, error, loading, isInitialized } = useSupabase({
    appId: 'agent-chat', // Unique ID for this app
    initialize: initializeApp,
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!isInitialized) return <div>Initializing...</div>;

  const handleSendMessage = async () => {
    const { error } = await supabase
      .from('chat_messages')
      .insert({ content: 'Hello, world!' });
    if (error) console.error(error);
  };

  return (
    <div>
      <h1>Agent Chat</h1>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}

export default AgentChatApp;
```

### Hook Return Values
The `useSupabase` hook returns an object with the following properties:
- `supabase`: The initialized Supabase client (or null if not ready).
- `error`: Any error that occurred during initialization (or null if none).
- `loading`: Boolean indicating if the client is still initializing.
- `isInitialized`: Boolean indicating if the app-specific initialization has completed.

### Options
Pass an options object to `useSupabase`:
- `appId` (string, required): A unique identifier for the app. Used to track initialization in the `app_installations` table.
- `initialize` (function, optional): An async function that takes the `supabase` client as an argument. Runs once to set up the app’s database resources. Defaults to a no-op if not provided.