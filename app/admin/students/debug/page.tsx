"use client"

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useState } from 'react';

interface HealthCheck {
  timestamp: string;
  environment: string;
  status: string;
  checks: {
    resendApiKey: {
      configured: boolean;
      keyLength: number;
      keyPreview: string;
    };
    firebase: {
      projectId: { configured: boolean; value: string };
      clientEmail: { configured: boolean; value: string };
      privateKey: { configured: boolean; hasNewlines: boolean; length: number };
    };
    firebaseAdmin: {
      appsInitialized: number;
      canConnectToFirestore: boolean;
      documentsFound?: number;
      firestoreError?: string;
    };
  };
}

export default function EmailDebugPage() {
  const [healthData, setHealthData] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/students/email/health');
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Service Debug</h1>
        <p className="text-muted-foreground">
          Diagnostic tools for troubleshooting email functionality
        </p>
      </div>

      <div className="space-y-6">
        {/* Health Check Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Health Check
              {healthData && getStatusIcon(healthData.status === 'healthy')}
            </CardTitle>
            <CardDescription>
              Check if all required services and configurations are working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={checkHealth} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Health Check
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {healthData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Status:</span>
                    {getStatusBadge(healthData.status)}
                  </div>
                  
                  <div className="grid gap-4">
                    {/* Resend Configuration */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        Resend API Configuration
                        {getStatusIcon(healthData.checks.resendApiKey.configured)}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div>Configured: {healthData.checks.resendApiKey.configured ? 'Yes' : 'No'}</div>
                        <div>Key Length: {healthData.checks.resendApiKey.keyLength}</div>
                        <div>Key Preview: {healthData.checks.resendApiKey.keyPreview}</div>
                      </div>
                    </div>

                    {/* Firebase Configuration */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        Firebase Configuration
                        {getStatusIcon(
                          healthData.checks.firebase.projectId.configured &&
                          healthData.checks.firebase.clientEmail.configured &&
                          healthData.checks.firebase.privateKey.configured
                        )}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <span>Project ID:</span>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(healthData.checks.firebase.projectId.configured)}
                            {healthData.checks.firebase.projectId.value}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <span>Client Email:</span>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(healthData.checks.firebase.clientEmail.configured)}
                            {healthData.checks.firebase.clientEmail.value}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <span>Private Key:</span>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(healthData.checks.firebase.privateKey.configured)}
                            {healthData.checks.firebase.privateKey.configured ? 
                              `${healthData.checks.firebase.privateKey.length} chars, newlines: ${healthData.checks.firebase.privateKey.hasNewlines}` : 
                              'Not configured'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Firebase Admin Status */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        Firebase Admin Status
                        {getStatusIcon(healthData.checks.firebaseAdmin.canConnectToFirestore)}
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div>Apps Initialized: {healthData.checks.firebaseAdmin.appsInitialized}</div>
                        <div>Firestore Connection: {healthData.checks.firebaseAdmin.canConnectToFirestore ? 'Success' : 'Failed'}</div>
                        {healthData.checks.firebaseAdmin.documentsFound !== undefined && (
                          <div>Sample Documents Found: {healthData.checks.firebaseAdmin.documentsFound}</div>
                        )}
                        {healthData.checks.firebaseAdmin.firestoreError && (
                          <div className="text-red-500">Error: {healthData.checks.firebaseAdmin.firestoreError}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Last checked: {new Date(healthData.timestamp).toLocaleString()} 
                    (Environment: {healthData.environment})
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common debugging and testing actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button 
                variant="outline" 
                onClick={() => window.open('/admin/students', '_blank')}
              >
                Go to Students Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('/api/students/email/health', '_blank')}
              >
                View Raw Health Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues & Solutions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <strong>400 Bad Request:</strong> Usually environment variables not set correctly
              </div>
              <div>
                <strong>No student emails found:</strong> Check if student documents have 'email' or 'username' fields
              </div>
              <div>
                <strong>Firebase connection failed:</strong> Verify FIREBASE_PRIVATE_KEY formatting (needs \\n for newlines)
              </div>
              <div>
                <strong>Resend errors:</strong> Ensure domain is verified and API key has correct permissions
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
