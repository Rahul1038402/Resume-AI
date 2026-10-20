import { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface SyncMetadata {
    gmail_credentials: any;
    last_sync_time: string | null;
    cached_message_ids: string[];
    sync_enabled: boolean;
    auto_sync_frequency_hours: number;
    total_synced_count: number;
    last_sync_status: string | null;
}

interface ExtractedApplication {
    company_name: string;
    job_title: string;
    application_date: string;
    status: string;
    platform: string;
    notes: string;
    email_message_id: string;
    email_subject: string;
    email_sender: string;
    confidence: string;
}

interface GmailSyncManagerProps {
    user: any;
    onApplicationsImported: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const GmailSyncManager = ({ user, onApplicationsImported }: GmailSyncManagerProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
    const [pendingApplications, setPendingApplications] = useState<ExtractedApplication[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [syncProgress, setSyncProgress] = useState<string>('');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
    const [scanDays, setScanDays] = useState(7);

    useEffect(() => {
        if (!user) return;

        checkGmailConnection();
        // setupAutoSync returns the interval id; without clearing it the
        // timer survived unmount and kept firing syncs
        const intervalId = setupAutoSync();
        return () => clearInterval(intervalId);
    }, [user]);

    const checkGmailConnection = async () => {
        try {
            const { data, error } = await supabase
                .from('gmail_sync_metadata')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                setIsConnected(true);
                setSyncMetadata(data);
                setLastSyncTime(data.last_sync_time);
                setAutoSyncEnabled(data.sync_enabled);
            }
        } catch (error) {
            console.error('Error checking Gmail connection:', error);
        }
    };

    const setupAutoSync = () => {
        const interval = setInterval(async () => {
            const { data } = await supabase
                .from('gmail_sync_metadata')
                .select('sync_enabled, last_sync_time, auto_sync_frequency_hours')
                .eq('user_id', user.id)
                .single();

            if (data?.sync_enabled) {
                const hoursSinceSync = data.last_sync_time
                    ? (Date.now() - new Date(data.last_sync_time).getTime()) / (1000 * 60 * 60)
                    : 999;

                if (hoursSinceSync >= (data.auto_sync_frequency_hours || 6)) {
                    console.log('Auto-syncing Gmail...');
                    handleSync(true);
                }
            }
        }, 1000 * 60 * 60);

        return interval;
    };

    const connectGmail = async () => {
        try {
            await supabase.auth.signOut();

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    scopes: 'https://www.googleapis.com/auth/gmail.readonly',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });

            if (error) throw error;
        } catch (error: any) {
            alert('Failed to connect Gmail: ' + error.message);
        }
    };

    useEffect(() => {
        const handleOAuthCallback = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.provider_token && session?.provider_refresh_token) {
                console.log('✅ Got refresh token from OAuth');
                await saveGmailCredentials(session);
            } else if (session?.provider_token && !session?.provider_refresh_token) {
                console.warn('⚠️ No refresh token - user needs to reconnect');
            }
        };

        handleOAuthCallback();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.provider_refresh_token) {
                console.log('Auth state changed, saving credentials');
                await saveGmailCredentials(session);
            }
        });

        return () => subscription.unsubscribe();
    }, [user]);

    const saveGmailCredentials = async (session: any) => {
        try {
            console.log('=== Saving Credentials ===');

            if (!session.provider_refresh_token) {
                alert('No refresh token received. Please try disconnecting and reconnecting Gmail.');
                return;
            }

            const credentials = {
                token: session.provider_token,
                refresh_token: session.provider_refresh_token,
                expiry_date: new Date(Date.now() + 3600 * 1000).toISOString(),
                scope: 'https://www.googleapis.com/auth/gmail.readonly',
                token_type: 'Bearer'
            };

            await supabase
                .from('gmail_sync_metadata')
                .delete()
                .eq('user_id', user.id);

            const { data, error } = await supabase
                .from('gmail_sync_metadata')
                .insert({
                    user_id: user.id,
                    gmail_credentials: credentials,
                    sync_enabled: true,
                    auto_sync_frequency_hours: 6
                })
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Saved to database');
            setIsConnected(true);
            await checkGmailConnection();
        } catch (error: any) {
            console.error('Error saving credentials:', error);
            alert('Failed to save Gmail credentials: ' + error.message);
        }
    };

    const handleSync = async (isAutoSync: boolean = false) => {
        if (!syncMetadata) {
            alert('Please connect Gmail first');
            return;
        }

        setIsSyncing(true);
        setSyncStatus('Starting sync...');
        setSyncProgress('Preparing to scan emails...');

        try {
            console.log('=== Starting Sync ===');
            console.log('Scan days:', scanDays);

            setSyncProgress(`Searching Gmail for job emails (last ${scanDays} days)...`);

            const response = await fetch(`${API_URL}/gmail/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    credentials: syncMetadata.gmail_credentials,
                    last_sync_time: syncMetadata.last_sync_time,
                    cached_message_ids: syncMetadata.cached_message_ids || [],
                    scan_days: scanDays
                })
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setSyncProgress('Analyzing emails with AI...');

            const result = await response.json();
            console.log('=== Sync Result ===', result);

            if (result.status === 'error') {
                throw new Error(result.error);
            }

            setSyncProgress('Updating sync metadata...');

            await supabase
                .from('gmail_sync_metadata')
                .update({
                    last_sync_time: new Date().toISOString(),
                    cached_message_ids: result.message_ids || [],
                    total_synced_count: (syncMetadata.total_synced_count || 0) + result.extracted_count,
                    last_sync_status: result.status,
                    gmail_credentials: result.updated_credentials || syncMetadata.gmail_credentials
                })
                .eq('user_id', user.id);

            await supabase
                .from('gmail_sync_history')
                .insert({
                    user_id: user.id,
                    status: result.status,
                    checked_count: result.checked_count,
                    extracted_count: result.extracted_count
                });

            if (result.status === 'no_changes') {
                setSyncStatus(`✓ No new applications found (checked ${result.checked_count} emails)`);
                setSyncProgress('');
                setLastSyncTime(new Date().toISOString());
            } else if (result.new_applications.length > 0) {
                setPendingApplications(result.new_applications);
                if (!isAutoSync) {
                    setShowReviewModal(true);
                } else {
                    await importApplications(result.new_applications);
                }
                setSyncStatus(`✓ Found ${result.new_applications.length} new applications`);
                setSyncProgress('');
                setLastSyncTime(new Date().toISOString());
            }

            await checkGmailConnection();
        } catch (error: any) {
            console.error('=== Sync Error ===', error);
            setSyncStatus('✗ Sync failed: ' + error.message);
            setSyncProgress('');
            alert('Sync failed: ' + error.message);
        } finally {
            console.log('=== Sync Complete ===');
            setIsSyncing(false);
        }
    };

    const importApplications = async (applications: ExtractedApplication[]) => {
        try {
            const applicationsToInsert = applications.map(app => ({
                user_id: user.id,
                job_role: app.job_title,
                company: app.company_name,
                platform: app.platform,
                date_applied: app.application_date,
                status: app.status,
                description: app.notes || '',
                email_message_id: app.email_message_id,
                email_subject: app.email_subject,
                email_sender: app.email_sender,
                auto_imported: true
            }));

            const { error } = await supabase
                .from('job_applications')
                .insert(applicationsToInsert);

            if (error) throw error;

            setPendingApplications([]);
            setShowReviewModal(false);
            onApplicationsImported();

            alert(`Successfully imported ${applications.length} applications!`);
        } catch (error: any) {
            console.error('Import error:', error);
            alert('Failed to import applications: ' + error.message);
        }
    };

    const removeFromPending = (index: number) => {
        setPendingApplications(prev => prev.filter((_, i) => i !== index));
    };

    const disconnectGmail = async () => {
        if (confirm('Are you sure you want to disconnect Gmail?')) {
            try {
                await supabase
                    .from('gmail_sync_metadata')
                    .delete()
                    .eq('user_id', user.id);

                setIsConnected(false);
                setSyncMetadata(null);
                setLastSyncTime(null);
            } catch (error: any) {
                alert('Failed to disconnect: ' + error.message);
            }
        }
    };

    const toggleAutoSync = async () => {
        try {
            const newValue = !autoSyncEnabled;
            await supabase
                .from('gmail_sync_metadata')
                .update({ sync_enabled: newValue })
                .eq('user_id', user.id);

            setAutoSyncEnabled(newValue);
            await checkGmailConnection();
        } catch (error: any) {
            alert('Failed to update settings: ' + error.message);
        }
    };

    return (
        <div className="bg-card rounded-lg p-6 shadow-sm border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <Mail className="w-6 h-6 text-resume-primary dark:text-resume-secondary" />
                            <h3 className="text-lg font-semibold text-foreground">Gmail Auto-Sync</h3>
                        </div>
                        <p className="pl-9 text-sm text-muted-foreground">
                            Automatically track applications from your email
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-muted rounded-lg transition"
                >
                    <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {!isConnected ? (
                <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-4">
                        <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                        Connect your Gmail to automatically detect and track job applications
                    </p>
                    <button
                        onClick={connectGmail}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-resume-primary dark:bg-resume-secondary hover:bg-resume-primary/90 hover:dark:bg-resume-secondary/80 text-white rounded-lg transition font-medium"
                    >
                        <Mail className="w-5 h-5" />
                        Connect Gmail
                    </button>
                    <p className="text-xs text-muted-foreground mt-3">
                        We only read job-related emails. Your data is secure.
                    </p>
                </div>
            ) : (
                <>
                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="mb-4 p-4 bg-gray-200 dark:bg-gray-900 rounded-lg">
                            <h4 className="font-medium text-foreground pb-3 border-b">Sync Settings</h4>
                            <div className="pt-2 space-y-3">
                                <div>
                                    <label className="block text-sm text-foreground mb-2">
                                        Scan last:
                                    </label>
                                    <select
                                        value={scanDays}
                                        onChange={(e) => setScanDays(Number(e.target.value))}
                                        className="w-full px-3 py-2 bg-card border rounded text-sm"
                                    >
                                        <option value={3}>3 days</option>
                                        <option value={7}>7 days (recommended)</option>
                                        <option value={14}>14 days</option>
                                        <option value={30}>30 days (slower)</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Longer periods scan more emails but take more time
                                    </p>
                                </div>

                                <label className="flex items-center justify-between">
                                    <span className="text-sm text-foreground">Auto-sync every 6 hours</span>
                                    <input
                                        type="checkbox"
                                        checked={autoSyncEnabled}
                                        onChange={toggleAutoSync}
                                        className="w-4 h-4 text-resume-primary focus:ring-resume-primary"
                                    />
                                </label>

                                <button
                                    onClick={disconnectGmail}
                                    className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium"
                                >
                                    Disconnect Gmail
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sync Status */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <div className="flex flex-col md:flex-row gap-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-foreground">Connected</span>
                                </div>
                                {lastSyncTime && (
                                    <>
                                        <span className="md:visible invisible text-muted-foreground">•</span>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                Last synced: {new Date(lastSyncTime).toLocaleString()}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => handleSync(false)}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-resume-primary/10 dark:bg-resume-secondary/10 text-resume-primary dark:text-resume-secondary rounded hover:bg-resume-primary/20 dark:hover:bg-resume-secondary/20 transition text-xs md:text-sm font-medium disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : `Sync (${scanDays}d)`}
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    {syncProgress && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-2 animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            {syncProgress}
                        </div>
                    )}

                    {/* Sync Status Message */}
                    {syncStatus && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <AlertCircle className="w-4 h-4" />
                            {syncStatus}
                        </div>
                    )}

                    {/* Stats */}
                    {syncMetadata && (
                        <div className="mt-4 pt-4 border-t border-border">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total synced:</span>
                                <span className="font-medium text-foreground">{syncMetadata.total_synced_count || 0} applications</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Review Modal - keeping existing code */}
            {showReviewModal && pendingApplications.length > 0 && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
                        <div className="sticky top-0 bg-card border-b border-border p-6 z-10">
                            <h2 className="text-2xl font-bold text-foreground">
                                Review {pendingApplications.length} New Applications
                            </h2>
                            <p className="text-muted-foreground mt-1">
                                Review and edit before importing
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {pendingApplications.map((app, index) => (
                                <div key={index} className="bg-muted rounded-lg p-4 border border-border">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-foreground">{app.job_title}</h3>
                                            <p className="text-sm text-muted-foreground">{app.company_name}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFromPending(index)}
                                            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded transition"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Platform:</span>
                                            <span className="ml-2 text-foreground">{app.platform}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Status:</span>
                                            <span className="ml-2 text-foreground capitalize">{app.status.replace('_', ' ')}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Applied:</span>
                                            <span className="ml-2 text-foreground">{new Date(app.application_date).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Confidence:</span>
                                            <span className="ml-2 text-foreground capitalize">{app.confidence}</span>
                                        </div>
                                    </div>
                                    {app.notes && (
                                        <p className="text-sm text-muted-foreground mt-2 italic">
                                            Note: {app.notes}
                                        </p>
                                    )}

                                    <details className="mt-2">
                                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                            Email details
                                        </summary>
                                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                            <p>From: {app.email_sender}</p>
                                            <p>Subject: {app.email_subject}</p>
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>

                        <div className="sticky bottom-0 bg-card border-t border-border p-6 flex gap-3">
                            <button
                                onClick={() => importApplications(pendingApplications)}
                                className="flex-1 px-6 py-3 bg-resume-primary dark:bg-resume-secondary hover:bg-resume-primary/90 hover:dark:bg-resume-secondary/80 text-white rounded-lg transition font-medium"
                            >
                                Import All ({pendingApplications.length})
                            </button>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="flex-1 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default GmailSyncManager;