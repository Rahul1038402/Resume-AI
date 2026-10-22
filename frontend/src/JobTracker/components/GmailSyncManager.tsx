import { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { planImport, describePlan } from '../importPlan';
import type { ExtractedApplication, ExistingApplication } from '../importPlan';

interface SyncMetadata {
    gmail_credentials: any;
    last_sync_time: string | null;
    cached_message_ids: string[];
    sync_enabled: boolean;
    auto_sync_frequency_hours: number;
    total_synced_count: number;
    last_sync_status: string | null;
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
    const [boardRows, setBoardRows] = useState<ExistingApplication[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [syncProgress, setSyncProgress] = useState<string>('');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
    const [scanDays, setScanDays] = useState(7);
    const [needsReauth, setNeedsReauth] = useState(false);
    const [unreadable, setUnreadable] = useState<{ subject: string; sender: string }[]>([]);

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
                .maybeSingle();

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
                .maybeSingle();

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
            setNeedsReauth(false);
            setUnreadable([]);

            /*
             * No signOut first.
             *
             * This used to sign the user out of the app before starting the
             * OAuth round trip, which meant pressing Reconnect logged you out
             * and left the tracker empty until Google redirected back. It was
             * presumably there to force a fresh consent screen, but
             * `prompt: 'consent'` already does that, and `access_type:
             * 'offline'` is what actually guarantees the refresh token.
             */
            const { error } = await supabase.auth.signInWithOAuth({
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
            setSyncStatus('Could not start Google sign-in: ' + error.message);
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

    /*
     * Store the Google tokens against the user.
     *
     * Two things went wrong here before.
     *
     * First, two code paths race. Returning from the OAuth round trip fires
     * `handleOAuthCallback` on mount *and* an onAuthStateChange SIGNED_IN,
     * and both called this. Each did a delete followed by an insert, so the
     * pair interleaved - both deleted, then both inserted - and the second
     * insert hit `gmail_sync_metadata_user_id_key`. Hence the
     * "duplicate key value violates unique constraint" alert on connecting.
     *
     * Second, and worse, the delete threw away the whole row: the imported
     * count, the last sync time, and `cached_message_ids`. So reconnecting
     * reset the panel to "0 imported" and, with the id cache gone, the next
     * sync rescanned and re-imported mail it had already seen. The row is now
     * updated in place and keeps everything that is not a credential.
     */
    const savingRef = useRef(false);

    const saveGmailCredentials = async (session: any) => {
        // Whichever path gets here first does the work; the other returns.
        if (savingRef.current) return;
        savingRef.current = true;

        try {
            if (!session?.provider_refresh_token) {
                setSyncStatus('Google did not return a refresh token. Try connecting again.');
                return;
            }

            // The session is the authority on who just signed in; the `user`
            // prop can still be the previous value at this point.
            const uid = session.user?.id || user?.id;
            if (!uid) return;

            const credentials = {
                token: session.provider_token,
                refresh_token: session.provider_refresh_token,
                expiry_date: new Date(Date.now() + 3600 * 1000).toISOString(),
                scope: 'https://www.googleapis.com/auth/gmail.readonly',
                token_type: 'Bearer'
            };

            const { data: existing } = await supabase
                .from('gmail_sync_metadata')
                .select('id')
                .eq('user_id', uid)
                .maybeSingle();

            let error;
            if (existing) {
                // Credentials only. The sync history is not ours to reset.
                ({ error } = await supabase
                    .from('gmail_sync_metadata')
                    .update({ gmail_credentials: credentials, sync_enabled: true })
                    .eq('user_id', uid));
            } else {
                ({ error } = await supabase
                    .from('gmail_sync_metadata')
                    .insert({
                        user_id: uid,
                        gmail_credentials: credentials,
                        sync_enabled: true,
                        auto_sync_frequency_hours: 6
                    }));

                // Another tab inserted between the check and the insert.
                // The row exists and is the one we wanted, so update it.
                if (error?.code === '23505') {
                    ({ error } = await supabase
                        .from('gmail_sync_metadata')
                        .update({ gmail_credentials: credentials, sync_enabled: true })
                        .eq('user_id', uid));
                }
            }

            if (error) throw error;

            setIsConnected(true);
            setNeedsReauth(false);
            setSyncStatus('Gmail connected');
            await checkGmailConnection();
        } catch (error: any) {
            console.error('Error saving credentials:', error);
            setSyncStatus('Could not save Gmail credentials: ' + error.message);
        } finally {
            savingRef.current = false;
        }
    };

    const handleSync = async (isAutoSync: boolean = false) => {
        if (!syncMetadata) {
            setSyncStatus('Connect Gmail first');
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

            setSyncProgress('Analyzing emails with AI...');

            const result = await response.json().catch(() => null);

            if (response.status === 429) {
                const resets = result?.rate_limit?.resets_at
                    ? ` Try again after ${new Date(result.rate_limit.resets_at).toLocaleTimeString()}.`
                    : '';
                setSyncStatus(`Daily sync limit reached.${resets}`);
                setSyncProgress('');
                return;
            }

            if (!response.ok && !result) {
                throw new Error(`Sync failed (HTTP ${response.status})`);
            }

            /*
             * Not a failure, a state the user has to resolve.
             *
             * gmail.readonly is a restricted scope, so while the OAuth consent
             * screen sits in Testing the refresh token Google issues expires
             * after seven days. It used to surface as "Sync failed:
             * invalid_grant", which reads like a bug and gives no hint that
             * the fix is one button away.
             */
            if (result?.status === 'reauth_required') {
                setNeedsReauth(true);
                setSyncStatus(result.error || 'Gmail access expired. Reconnect to keep syncing.');
                setSyncProgress('');
                return;
            }

            if (result?.status === 'error') {
                throw new Error(result.error);
            }

            setNeedsReauth(false);
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

            setLastSyncTime(new Date().toISOString());
            setSyncProgress('');

            setUnreadable(result.unreadable || []);

            if (result.new_applications?.length > 0) {
                setPendingApplications(result.new_applications);
                if (!isAutoSync) {
                    // The board is needed to tell "new card" from "moves an
                    // existing one", which is what the review list reports.
                    const { data: rows } = await supabase
                        .from('job_applications')
                        .select('id, company, job_role, status, email_message_id')
                        .eq('user_id', user.id);

                    const board = rows || [];
                    setBoardRows(board);

                    // Everything that would change something starts ticked;
                    // duplicates and no-ops start clear, so the default action
                    // is the one the user almost always wants.
                    const preview = planImport(result.new_applications, board);
                    setSelectedIds(
                        result.new_applications
                            .filter((a: ExtractedApplication) =>
                                preview.decisions[a.email_message_id]?.action !== 'skip')
                            .map((a: ExtractedApplication) => a.email_message_id)
                    );
                    setShowReviewModal(true);
                    setSyncStatus(`Found ${result.new_applications.length} to review`);
                } else {
                    await importApplications(result.new_applications);
                }
            } else {
                setSyncStatus(`No new applications (checked ${result.checked_count} emails)`);
            }

            await checkGmailConnection();
        } catch (error: any) {
            console.error('=== Sync Error ===', error);
            setSyncStatus('Sync failed: ' + error.message);
            setSyncProgress('');
        } finally {
            setIsSyncing(false);
        }
    };

    /*
     * Import, or advance what is already there.
     *
     * The decision itself lives in ./importPlan so it can be tested without a
     * database; this only carries it out.
     */
    const importApplications = async (applications: ExtractedApplication[]) => {
        try {
            const { data: existing, error: fetchError } = await supabase
                .from('job_applications')
                .select('id, company, job_role, status, email_message_id')
                .eq('user_id', user.id);

            if (fetchError) throw fetchError;

            const plan = planImport(applications, existing || []);

            if (plan.insert.length) {
                /*
                 * Upsert, not insert.
                 *
                 * There is a unique index on (user_id, email_message_id), so
                 * one already-imported email does not add a duplicate row -
                 * it fails the whole statement, and every other application in
                 * the batch is lost with it. The planner filters duplicates it
                 * can see, but it reads the board a moment earlier, so a
                 * second tab or a concurrent auto-sync can still collide.
                 * Ignoring the conflict keeps the rest of the batch.
                 */
                const { error } = await supabase.from('job_applications').upsert(
                    plan.insert.map(app => ({
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
                        auto_imported: true,
                    })),
                    { onConflict: 'user_id,email_message_id', ignoreDuplicates: true }
                );
                if (error) throw error;
            }

            for (const { id, status } of plan.advance) {
                const { error } = await supabase
                    .from('job_applications')
                    .update({ status })
                    .eq('id', id);
                if (error) throw error;
            }

            setPendingApplications([]);
            setShowReviewModal(false);
            onApplicationsImported();
            setSyncStatus(describePlan(plan));
        } catch (error: any) {
            console.error('Import error:', error);
            setSyncStatus('Import failed: ' + error.message);
        }
    };

    /*
     * What this sync would do, recomputed as the selection changes.
     *
     * The planner is pure, so the same function that performs the import can
     * describe it first - the review list and the result can never disagree
     * about whether something is a new card or a move.
     */
    const preview = useMemo(
        () => planImport(pendingApplications, boardRows),
        [pendingApplications, boardRows],
    );

    const STATUS_LABEL: Record<string, string> = {
        applied: 'Applied',
        in_progress: 'In Progress',
        got_offer: 'Got Offer',
        not_selected: 'Not Selected',
    };

    const toggleSelected = (id: string) =>
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );

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
                setSyncStatus('Could not disconnect: ' + error.message);
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
            setSyncStatus('Could not update settings: ' + error.message);
        }
    };

    return (
        <div className="rounded-xl border border-line bg-ink-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Mail className="h-4 w-4 shrink-0 text-mute" strokeWidth={1.6} />
                <span className="text-[0.85rem] text-white">Gmail auto-sync</span>

                {isConnected ? (
                    <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-mute-dim">
                        <span className={`h-1.5 w-1.5 rounded-full ${needsReauth ? 'bg-red-400/80' : 'bg-white/70'}`} />
                        {needsReauth ? 'Access expired' : 'Connected'}
                        {syncMetadata && (
                            <span className="text-mute-faint">
                                &middot; {syncMetadata.total_synced_count || 0} imported
                            </span>
                        )}
                        {lastSyncTime && (
                            <span className="hidden text-mute-faint sm:inline">
                                &middot; last synced {new Date(lastSyncTime).toLocaleDateString()}
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="text-[0.75rem] font-medium text-mute-dim">
                        Find applications already sitting in your inbox
                    </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {isConnected && needsReauth && (
                        <button
                            onClick={connectGmail}
                            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[0.78rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90"
                        >
                            <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                            Reconnect
                        </button>
                    )}
                    {isConnected && !needsReauth && (
                        <button
                            onClick={() => handleSync(false)}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-1.5 text-[0.78rem] font-medium text-white transition-colors duration-200 hover:border-line-bright hover:bg-white/[0.06] disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                            {isSyncing ? 'Syncing' : `Sync ${scanDays}d`}
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        aria-label="Sync settings"
                        aria-expanded={showSettings}
                        className="rounded-md p-1.5 text-mute-faint transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
                    >
                        <Settings className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                </div>
            </div>

            {!isConnected ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
                    <button
                        onClick={connectGmail}
                        className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-1.5 text-[0.78rem] font-medium text-white transition-colors duration-200 hover:border-line-bright hover:bg-white/[0.06]"
                    >
                        <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                        Connect Gmail
                    </button>
                    <p className="text-[0.72rem] font-medium text-mute-faint">
                        Only job-related mail is read, and nothing is sent anywhere.
                    </p>
                </div>
            ) : (
                <>
                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="mt-3 space-y-3 border-t border-line pt-3">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                                <label className="flex items-center gap-2">
                                    <span className="text-[0.78rem] font-medium text-mute">Scan last</span>
                                    <select
                                        value={scanDays}
                                        onChange={(e) => setScanDays(Number(e.target.value))}
                                        className="rb-input w-auto py-1.5 text-[0.78rem]"
                                    >
                                        <option value={3}>3 days</option>
                                        <option value={7}>7 days</option>
                                        <option value={14}>14 days</option>
                                        <option value={30}>30 days</option>
                                    </select>
                                </label>

                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={autoSyncEnabled}
                                        onChange={toggleAutoSync}
                                        className="h-3.5 w-3.5 accent-white"
                                    />
                                    <span className="text-[0.78rem] font-medium text-mute">Auto-sync every 6 hours</span>
                                </label>

                                <button
                                    onClick={disconnectGmail}
                                    className="ml-auto rounded-md border border-line-strong px-3 py-1.5 text-[0.78rem] font-medium text-mute transition-colors duration-200 hover:border-red-500/40 hover:text-red-300"
                                >
                                    Disconnect
                                </button>
                            </div>
                            <p className="text-[0.72rem] font-medium text-mute-faint">
                                Three syncs a day. Each one only reads mail it has not seen before,
                                so a wider window costs nothing on the syncs after the first.
                            </p>
                        </div>
                    )}

                    {/* Progress Indicator */}
                    {syncProgress && (
                        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[0.75rem] font-medium text-mute-dim">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
                            {syncProgress}
                        </div>
                    )}

                    {/* Emails that read as job mail but yielded nothing. They are
                        already remembered, so they will not be scanned again -
                        saying so beats letting them vanish. */}
                    {unreadable.length > 0 && (
                        <details className="mt-3 border-t border-line pt-3">
                            <summary className="cursor-pointer text-[0.75rem] font-medium text-mute-dim transition-colors hover:text-white">
                                {unreadable.length} email{unreadable.length === 1 ? '' : 's'} looked
                                job-related but could not be read &mdash; add {unreadable.length === 1 ? 'it' : 'them'} by hand
                            </summary>
                            <ul className="mt-2 space-y-1">
                                {unreadable.map((e, i) => (
                                    <li key={i} className="truncate text-[0.72rem] font-medium text-mute-faint">
                                        {e.subject} &middot; {e.sender}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}

                    {/* Sync Status Message */}
                    {syncStatus && (
                        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-[0.75rem] font-medium text-mute-dim">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                            {syncStatus}
                        </div>
                    )}

                </>
            )}

            {/* Review: tick what belongs on the board. Nothing is written
                until Add is pressed, so a wrong reading costs one click. */}
            {showReviewModal && pendingApplications.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-line-strong bg-ink-raised shadow-2xl shadow-black/60">
                        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                            <div>
                                <h2 className="text-[1.05rem] text-white">
                                    {pendingApplications.length} found in your inbox
                                </h2>
                                <p className="mt-1 text-[0.78rem] font-medium text-mute-dim">
                                    Tick the ones to keep. Nothing is added until you confirm.
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedIds(
                                    selectedIds.length === pendingApplications.length
                                        ? []
                                        : pendingApplications.map(a => a.email_message_id)
                                )}
                                className="shrink-0 rounded-md border border-line-strong px-3 py-1.5 text-[0.75rem] font-medium text-mute transition-colors duration-200 hover:border-line-bright hover:text-white"
                            >
                                {selectedIds.length === pendingApplications.length ? 'Clear all' : 'Select all'}
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
                            {pendingApplications.map((app) => {
                                const id = app.email_message_id;
                                const checked = selectedIds.includes(id);
                                const decision = preview.decisions[id];
                                return (
                                    <label
                                        key={id}
                                        className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors duration-200 ${
                                            checked
                                                ? 'border-line-bright bg-white/[0.04]'
                                                : 'border-line bg-ink-soft hover:border-line-strong'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleSelected(id)}
                                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-white"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline gap-x-2">
                                                <h3 className="text-[0.9rem] text-white">{app.job_title}</h3>
                                                <span className="text-[0.8rem] font-medium text-mute-dim">{app.company_name}</span>
                                            </div>

                                            {/* What this will actually do, said plainly. */}
                                            <p className="mt-1 text-[0.75rem] font-medium text-mute">
                                                {decision?.action === 'advance' ? (
                                                    <>
                                                        Moves {STATUS_LABEL[decision.from] || decision.from} &rarr;{' '}
                                                        <span className="text-white">{STATUS_LABEL[decision.to] || decision.to}</span>
                                                    </>
                                                ) : decision?.action === 'skip' ? (
                                                    <span className="text-mute-faint">
                                                        {decision.reason === 'duplicate'
                                                            ? 'Already imported from this email'
                                                            : 'Already up to date on the board'}
                                                    </span>
                                                ) : (
                                                    <>
                                                        New card in{' '}
                                                        <span className="text-white">{STATUS_LABEL[app.status] || app.status}</span>
                                                    </>
                                                )}
                                                {app.confidence === 'low' && (
                                                    <span className="ml-2 text-mute-faint">&middot; low confidence</span>
                                                )}
                                            </p>

                                            <p className="mt-1.5 text-[0.72rem] font-medium text-mute-faint">
                                                {app.platform} &middot; {new Date(app.application_date).toLocaleDateString()}
                                            </p>

                                            {app.notes && (
                                                <p className="mt-1.5 text-[0.75rem] font-medium text-mute-dim">{app.notes}</p>
                                            )}

                                            <p className="mt-1.5 truncate text-[0.72rem] font-medium text-mute-faint">
                                                {app.email_subject} &middot; {app.email_sender}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4">
                            <button
                                onClick={() => importApplications(
                                    pendingApplications.filter(a => selectedIds.includes(a.email_message_id))
                                )}
                                disabled={selectedIds.length === 0}
                                className="rounded-md bg-white px-4 py-2 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Add {selectedIds.length} to tracker
                            </button>
                            <button
                                onClick={() => { setShowReviewModal(false); setPendingApplications([]); }}
                                className="rounded-md border border-line-strong px-4 py-2 text-[0.8rem] font-medium text-mute transition-colors duration-200 hover:border-line-bright hover:text-white"
                            >
                                Cancel
                            </button>
                            <span className="ml-auto text-[0.72rem] font-medium text-mute-faint">
                                Unticked emails are not scanned again
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default GmailSyncManager;