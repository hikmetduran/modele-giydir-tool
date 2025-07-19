'use client';

import { useEffect, useState } from 'react';
import { account, databases, COLLECTIONS, APPWRITE_DATABASE_ID } from '@/lib/appwrite';
import { Models } from 'appwrite';

interface DebugInfo {
  auth: {
    user: Models.User<Models.Preferences> | null;
    error: string | null;
  };
  database: {
    name: string;
    collections: Array<{
      name: string;
      id: string;
      rowCount: number;
      status: string;
      error: string | null;
    }>;
    error: string | null;
  };
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    auth: { user: null, error: null },
    database: { name: 'modele-giydir-db', collections: [], error: null }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      
      // Fetch auth info
      let user: Models.User<Models.Preferences> | null = null;
      let authError: string | null = null;
      
      try {
        user = await account.get();
      } catch (error: any) {
        authError = error.message || 'Failed to fetch user';
      }

      // Fetch database info
      const collections: Array<{name: string, id: string}> = [
        { name: 'Profiles', id: COLLECTIONS.profiles || 'profiles' },
        { name: 'Model Photos', id: COLLECTIONS.modelPhotos || 'modelPhotos' },
        { name: 'Product Images', id: COLLECTIONS.productImages || 'productImages' },
        { name: 'Try On Results', id: COLLECTIONS.tryOnResults || 'tryOnResults' },
        { name: 'Wallets', id: COLLECTIONS.wallets || 'wallets' },
        { name: 'Credit Transactions', id: COLLECTIONS.creditTransactions || 'creditTransactions' }
      ];

      const collectionData = await Promise.all(
        collections.map(async (collection) => {
          try {
            // Try to get at least one document to check permissions
            const response = await databases.listDocuments(
              APPWRITE_DATABASE_ID || 'modele-giydir-db',
              collection.id
            );
            return {
              name: collection.name,
              id: collection.id,
              rowCount: response.total,
              status: 'accessible',
              error: null
            };
          } catch (error: any) {
            let status = 'error';
            let errorMessage = error.message || 'Unknown error';
            
            if (error.code === 401) {
              status = 'unauthorized';
              errorMessage = 'Read permission required';
            } else if (error.code === 404) {
              status = 'not_found';
              errorMessage = 'Collection not found';
            }
            
            return {
              name: collection.name,
              id: collection.id,
              rowCount: 0,
              status,
              error: errorMessage
            };
          }
        })
      );

      setDebugInfo({
        auth: { user, error: authError },
        database: {
          name: 'modele-giydir-db',
          collections: collectionData,
          error: null
        }
      });
    } catch (error: any) {
      setDebugInfo(prev => ({
        ...prev,
        database: { ...prev.database, error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDebugInfo();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug Dashboard</h1>
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Debug Dashboard</h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Authentication Status</h2>
          </div>
          <div className="px-6 py-4">
            {debugInfo.auth.error ? (
              <div className="text-red-600">
                <p className="font-medium">Error: {debugInfo.auth.error}</p>
              </div>
            ) : debugInfo.auth.user ? (
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">User ID:</span>
                  <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {debugInfo.auth.user.$id}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Username:</span>
                  <span className="ml-2">
                    {debugInfo.auth.user.name || 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2">{debugInfo.auth.user.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created At:</span>
                  <span className="ml-2">
                    {new Date(debugInfo.auth.user.$createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Authenticated
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-600">
                <p>No user logged in</p>
              </div>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Database Status</h2>
          </div>
          <div className="px-6 py-4">
            <div className="mb-4">
              <span className="font-medium text-gray-700">Database Name:</span>
              <span className="ml-2 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {debugInfo.database.name}
              </span>
            </div>
            
            {debugInfo.database.error ? (
              <div className="text-red-600">
                <p className="font-medium">Error: {debugInfo.database.error}</p>
              </div>
            ) : (
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Collections:</h3>
                <div className="space-y-2">
                  {debugInfo.database.collections.map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">{collection.name}</span>
                        <span className="ml-2 text-sm text-gray-500 font-mono">
                          ({collection.id})
                        </span>
                        {collection.status !== 'accessible' && (
                          <div className="text-xs text-red-600 mt-1">
                            {collection.error}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {collection.status === 'accessible' ? (
                          <>
                            <span className="text-lg font-semibold text-gray-900">
                              {collection.rowCount}
                            </span>
                            <span className="ml-1 text-sm text-gray-500">rows</span>
                          </>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            collection.status === 'unauthorized' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {collection.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Environment Info</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Endpoint:</span>
                <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                  {process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Project ID:</span>
                <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                  {process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'modele-giydir'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
