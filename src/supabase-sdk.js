import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const defaultInitialize = async () => {};

/**
 * Custom hook to initialize and manage a Supabase client using URL search parameters.
 * @returns {Object} An object containing the Supabase client, loading state, and any error.
 */
export function useSupabase({appId, initialize = defaultInitialize} = {}) {
  const [supabase, setSupabase] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function setupClient() {
      try {
        // Extract parameters from the iframe's URL
        const params = new URLSearchParams(window.location.search);
        const supabaseUrl = params.get('supabaseUrl');
        const supabaseKey = params.get('supabaseKey');
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');

        // Validate the presence of required parameters
        if (!supabaseUrl || !supabaseKey || !accessToken || !refreshToken) {
          throw new Error('Missing required URL parameters: supabaseUrl, supabaseKey, accessToken, or refreshToken');
        }

        // Initialize the Supabase client
        const client = createClient(supabaseUrl, supabaseKey);

        // Set the authentication session
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        const { data: installData, error: installError } = await client.from('app_installations').select('initialized').eq('app_id', appID).single()
        if (installError && installError.code !== 'PGRST116') { // PGRST116 = no rows found
          throw installError;
        }

        const alreadyInitialized = installData?.initialized || false;

        if (!alreadyInitialized) {
          // Run the app-specific initialization
          await initialize(client);

          // Mark the app as initialized in the database
          const { error: upsertError } = await client
            .from('app_installations')
            .upsert({ app_id: appId, initialized: true }, { onConflict: 'app_id' });

          if (upsertError) throw upsertError;

          setIsInitialized(true);
        } else {
          setIsInitialized(true);
        }

        // Store the initialized client in state
        setSupabase(client);
      } catch (err) {
        // Capture any errors during initialization
        setError(err);
      } finally {
        // Ensure loading state is updated regardless of success or failure
        setLoading(false);
      }
    }

    setupClient();
  }, [appId, initialize]);

  return { supabase, error, loading, isInitialized };
}