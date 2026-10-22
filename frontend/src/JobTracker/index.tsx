import { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Building, FileText, Clock, XCircle, Award, Globe, Search, Loader2, Pencil, Trash2, Inbox } from 'lucide-react';
import Layout from '@/components/common/Layout';
import '../index.css'
import { supabase } from '../lib/supabaseClient'
import Loader from '@/components/common/Loader';
import GmailSyncManager from '@/JobTracker/components/GmailSyncManager';

const JobTracker = () => {
    const [user, setUser] = useState(null);
    const [applications, setApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingApp, setEditingApp] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [sortBy, setSortBy] = useState('');
    const [viewMode, setViewMode] = useState('timeline');
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOver, setDragOver] = useState<string | null>(null);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        job_role: '',
        company: '',
        platform: '',
        date_applied: '',
        resume_pdf: null,
        status: 'applied',
        description: ''
    });

    /*
     * Four states on a monochrome page. An offer is the one thing worth
     * shouting about, so it gets white - the only accent the theme has. The
     * two middle states are greys a step apart, and a rejection is the single
     * place red is allowed. The icons carry the rest of the distinction.
     */
    const statusOptions = [
        { value: 'applied', label: 'Applied', icon: Clock, color: 'text-mute', chip: 'border-line-strong text-mute' },
        { value: 'in_progress', label: 'In Progress', icon: Calendar, color: 'text-white', chip: 'border-line-strong bg-white/[0.04] text-mute' },
        { value: 'got_offer', label: 'Got Offer', icon: Award, color: 'text-white', chip: 'border-line-bright bg-white/10 text-white' },
        { value: 'not_selected', label: 'Not Selected', icon: XCircle, color: 'text-red-300', chip: 'border-red-500/30 bg-red-500/[0.06] text-red-200' }
    ];

    const platformOptions = [
        'LinkedIn',
        'Indeed',
        'Glassdoor',
        'Wellfound',
        'Stack Overflow Jobs',
        'GitHub Jobs',
        'Company Website',
        'Job Fair',
        'Referral',
        'Other'
    ];

    const sortOptions = [
        { value: 'date_newest', label: 'Date (Newest First)' },
        { value: 'date_oldest', label: 'Date (Oldest First)' },
        { value: 'company_asc', label: 'Company (A-Z)' },
        { value: 'company_desc', label: 'Company (Z-A)' },
        { value: 'role_asc', label: 'Job Role (A-Z)' },
        { value: 'role_desc', label: 'Job Role (Z-A)' }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setShowStatusDropdown(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setShowSortDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        checkUser();
        const subscription = setupAuthListener();
        return () => subscription?.unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            fetchApplications();
        }
    }, [user]);

    // Calculate stats
    const stats = {
        total: applications.length,
        applied: applications.filter(app => app.status === 'applied').length,
        in_progress: applications.filter(app => app.status === 'in_progress').length,
        got_offer: applications.filter(app => app.status === 'got_offer').length,
        not_selected: applications.filter(app => app.status === 'not_selected').length
    };

    // Filter and sort applications with debounce
    useEffect(() => {
        let filtered = [...applications];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(app =>
                app.job_role.toLowerCase().includes(query) ||
                app.company.toLowerCase().includes(query) ||
                (app.platform && app.platform.toLowerCase().includes(query))
            );
        }

        // Apply status filter
        if (selectedStatuses.length > 0) {
            filtered = filtered.filter(app => selectedStatuses.includes(app.status));
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date_newest':
                    return new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime();
                case 'date_oldest':
                    return new Date(a.date_applied).getTime() - new Date(b.date_applied).getTime();
                case 'company_asc':
                    return a.company.localeCompare(b.company);
                case 'company_desc':
                    return b.company.localeCompare(a.company);
                case 'role_asc':
                    return a.job_role.localeCompare(b.job_role);
                case 'role_desc':
                    return b.job_role.localeCompare(a.job_role);
                default:
                    return 0;
            }
        });


        setFilteredApplications(filtered);
    }, [applications, searchQuery, selectedStatuses, sortBy]);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        setLoading(false);
    };

    const setupAuthListener = () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                fetchApplications();
            } else {
                setApplications([]);
            }
        });
        return subscription;
    };

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            alert('Error signing in: ' + error.message);
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            alert('Error signing out: ' + error.message);
        }
    };

    const fetchApplications = async () => {
        try {
            // Filtered here as well as by RLS. The policy is the real
            // boundary, but it lives in Supabase rather than in this repo, so
            // a query that relies on it alone gives no sign when it is wrong.
            if (!user?.id) return;

            const { data, error } = await supabase
                .from('job_applications')
                .select('*')
                .eq('user_id', user.id)
                .order('date_applied', { ascending: false });

            if (error) throw error;
            setApplications(data || []);
        } catch (error) {
            console.error('Error fetching applications:', error);
        }
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
    };

    const handleStatusFilterChange = (status) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        try {
            let resumeUrl = null;

            // Upload resume if provided
            if (formData.resume_pdf) {
                const fileExt = formData.resume_pdf.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, formData.resume_pdf);

                if (uploadError) throw uploadError;

                /*
                 * Store the path, not a public URL.
                 *
                 * getPublicUrl produced a link that works without any
                 * credentials, which is only meaningful if the bucket is
                 * public - and a bucket of resumes should not be. The path is
                 * signed on demand instead, so a link is good for a minute
                 * and only for someone who is signed in as the owner.
                 */
                resumeUrl = fileName;
            }

            const applicationData = {
                job_role: formData.job_role,
                company: formData.company,
                platform: formData.platform,
                date_applied: formData.date_applied,
                resume_url: resumeUrl || (editingApp ? editingApp.resume_url : null),
                status: formData.status,
                description: formData.description,
                user_id: user.id
            };

            if (editingApp) {
                const { error } = await supabase
                    .from('job_applications')
                    .update(applicationData)
                    .eq('id', editingApp.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('job_applications')
                    .insert([applicationData]);
                if (error) throw error;
            }

            resetForm();
            fetchApplications();
        } catch (error) {
            alert('Error saving application: ' + error.message);
        }
    };

    /*
     * Resume links.
     *
     * Rows written before the bucket was closed hold a full public URL rather
     * than a path, so the path is recovered from it. Both shapes work and
     * nothing needs backfilling.
     */
    const storagePath = (stored) => {
        const marker = '/resumes/';
        const at = stored.indexOf(marker);
        return at === -1 ? stored : stored.slice(at + marker.length);
    };

    const openResume = async (stored) => {
        // Opened synchronously on the click, then pointed at the signed URL -
        // a window.open after an await is treated as a popup and blocked.
        const tab = window.open('', '_blank', 'noopener,noreferrer');
        try {
            const { data, error } = await supabase.storage
                .from('resumes')
                .createSignedUrl(storagePath(stored), 60);

            if (error || !data?.signedUrl) throw error || new Error('No link returned');
            if (tab) tab.location.href = data.signedUrl;
        } catch (error) {
            tab?.close();
            alert('Could not open that resume: ' + error.message);
        }
    };

    const handleEdit = (app) => {
        setEditingApp(app);
        setFormData({
            job_role: app.job_role,
            company: app.company,
            platform: app.platform || '',
            date_applied: app.date_applied,
            resume_pdf: null,
            status: app.status,
            description: app.description || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this application?')) {
            try {
                const { error } = await supabase
                    .from('job_applications')
                    .delete()
                    .eq('id', id);
                if (error) throw error;
                fetchApplications();
            } catch (error) {
                alert('Error deleting application: ' + error.message);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            job_role: '',
            company: '',
            platform: '',
            date_applied: '',
            resume_pdf: null,
            status: 'applied',
            description: ''
        });
        setShowForm(false);
        setEditingApp(null);
    };

    // Drag and drop handlers
    const handleDragStart = (e, app) => {
        setDraggedItem(app);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        if (draggedItem && draggedItem.status !== newStatus) {
            try {
                const { error } = await supabase
                    .from('job_applications')
                    .update({ status: newStatus })
                    .eq('id', draggedItem.id);

                if (error) throw error;
                fetchApplications();
            } catch (error) {
                alert('Error updating status: ' + error.message);
            }
        }
        setDraggedItem(null);
        setDragOver(null);
    };

    // Loader while the Supabase session is being restored
    if (loading) {
        return (
            <Loader />
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-sm rounded-xl border border-line bg-ink-card p-8">
                    <div className="text-center">
                        <h1 className="text-[1.6rem] font-medium tracking-[-0.01em] text-white">
                            Application tracker
                        </h1>
                        <p className="mx-auto mt-2 max-w-xs text-[0.8rem] leading-relaxed text-mute-dim">
                            Every application in one place, with the status of each.
                            Sign in to keep your list.
                        </p>
                        <button
                            onClick={signInWithGoogle}
                            className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2.5 text-[0.85rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in
                                </>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-ink pt-24 pb-20">
                {/*
                  One container for the whole page. The heading, the Gmail
                  panel and the board each used to set their own width
                  (full-bleed, max-w-7xl, max-w-[100rem]), so no two edges on
                  the page lined up with each other.
                */}
                <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">

                    {/* A tool's header, not a landing page's: the title and the
                        one action you came to perform, on a single line. */}
                    <header className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <h1 className="text-[1.75rem] font-medium leading-tight tracking-[-0.02em] text-white">
                                Applications
                            </h1>
                            <p className="mt-1 text-[0.8rem] font-medium text-mute-dim">
                                Every role you have applied for, and where each one stands.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 whitespace-nowrap rounded-md bg-white px-3.5 py-2 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90"
                        >
                            <Plus className="h-4 w-4" strokeWidth={1.8} />
                            Add application
                        </button>
                    </header>

                    {/* The five counts as one quiet strip rather than five
                        cards: they are a readout, not the content. */}
                    <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-line py-3">
                        {[
                            { label: 'Total', value: stats.total, Icon: Building, tone: 'text-mute-faint' },
                            { label: 'Applied', value: stats.applied, Icon: Clock, tone: 'text-mute-faint' },
                            { label: 'In progress', value: stats.in_progress, Icon: Calendar, tone: 'text-mute-faint' },
                            { label: 'Offers', value: stats.got_offer, Icon: Award, tone: 'text-white' },
                            { label: 'Not selected', value: stats.not_selected, Icon: XCircle, tone: 'text-red-300/70' },
                        ].map(({ label, value, Icon, tone }) => (
                            <div key={label} className="flex items-center gap-2">
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} strokeWidth={1.6} />
                                <span className="text-[0.95rem] font-medium tabular-nums text-white">{value}</span>
                                <span className="text-[0.75rem] font-medium text-mute-dim">{label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5">
                        <GmailSyncManager
                            user={user}
                            onApplicationsImported={fetchApplications}
                        />
                    </div>

                    {/* Search, filters, sort and the view switch on one row.
                        These were three stacked rows of chrome before any
                        application was visible. */}
                    <div className="mt-5 flex flex-col gap-2.5 custom:flex-row custom:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute-faint" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search by role, company or platform"
                                className="rb-input h-9 pl-9"
                            />
                        </div>

                        <div className="flex items-center gap-2.5">
                            {/* Status Filter */}
                            <div ref={statusRef} className="relative inline-block text-left">
                                {/* Dropdown Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className="inline-flex h-9 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-line-strong bg-ink-soft px-3 text-[0.8rem] text-mute transition-colors duration-200 hover:border-line-bright hover:text-white focus:border-white/40 focus:outline-none"
                                >
                                    {selectedStatuses.length > 0
                                        ? `${selectedStatuses.length} selected`
                                        : 'Status'}
                                    <svg
                                        className={`w-4 h-4 ml-2 transition-transform ${showStatusDropdown ? 'rotate-180' : 'rotate-0'
                                            }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {showStatusDropdown && (
                                    <div className="absolute z-50 mt-2 w-56 rounded-lg border border-line-strong bg-ink-raised py-1 shadow-xl shadow-black/40">
                                        <ul className="max-h-60 overflow-y-auto">
                                            {statusOptions.map((option) => (
                                                <li
                                                    key={option.value}
                                                    onClick={() => {
                                                        if (selectedStatuses.includes(option.value)) {
                                                            setSelectedStatuses(selectedStatuses.filter(s => s !== option.value));
                                                        } else {
                                                            setSelectedStatuses([...selectedStatuses, option.value]);
                                                        }
                                                    }}
                                                    className={`cursor-pointer px-3.5 py-2 text-[0.8rem] transition-colors duration-150 hover:bg-white/[0.06] hover:text-white ${selectedStatuses.includes(option.value)
                                                        ? 'bg-white/[0.06] text-white'
                                                        : 'text-mute'
                                                        }`}
                                                >
                                                    {selectedStatuses.includes(option.value) ? '✓ ' : ''}{option.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                            {/* Sort */}
                            <div ref={sortRef} className="relative inline-block text-left">
                                {/* Dropdown Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                                    className="inline-flex h-9 shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-line-strong bg-ink-soft px-3 text-[0.8rem] text-mute transition-colors duration-200 hover:border-line-bright hover:text-white focus:border-white/40 focus:outline-none"
                                >
                                    {sortBy ? sortOptions.find(o => o.value === sortBy)?.label : 'Sort'}
                                    <svg
                                        className={`w-4 h-4 ml-2 transition-transform ${showSortDropdown ? 'rotate-180' : 'rotate-0'
                                            }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {showSortDropdown && (
                                    <div className="absolute z-50 mt-2 w-44 rounded-lg border border-line-strong bg-ink-raised py-1 shadow-xl shadow-black/40">
                                        <ul>
                                            {sortOptions.map((option) => (
                                                <li
                                                    key={option.value}
                                                    onClick={() => {
                                                        setSortBy(option.value);
                                                        setShowSortDropdown(false); // close after selecting one
                                                    }}
                                                    className={`cursor-pointer px-3.5 py-2 text-[0.8rem] transition-colors duration-150 hover:bg-white/[0.06] hover:text-white ${sortBy === option.value ? 'bg-white/[0.06] text-white' : 'text-mute'
                                                        }`}
                                                >
                                                    {sortBy === option.value ? '✓ ' : ''}{option.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1 rounded-md border border-line p-0.5">
                                {(['timeline', 'grid'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        aria-pressed={viewMode === mode}
                                        className={`rounded px-2.5 py-1.5 text-[0.8rem] capitalize transition-colors duration-200 ${viewMode === mode
                                            ? 'bg-white/10 text-white'
                                            : 'text-mute hover:text-white'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                        {/* Clear Filters */}
                        {(searchQuery || selectedStatuses.length > 0) && (
                            <div className="mt-4 flex items-center gap-2 text-sm flex-wrap">
                                <span className="text-muted-foreground">Active filters:</span>
                                {searchQuery && (
                                    <span className="rounded border border-line-strong px-2 py-0.5 text-[0.75rem] font-medium text-mute">
                                        Search: "{searchQuery}"
                                    </span>
                                )}
                                {selectedStatuses.map(status => (
                                    <span key={status} className="rounded border border-line-strong px-2 py-0.5 text-[0.75rem] font-medium text-mute">
                                        {statusOptions.find(opt => opt.value === status)?.label}
                                    </span>
                                ))}
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedStatuses([]);
                                    }}
                                    className="ml-2 text-white underline-offset-4 hover:underline"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                    {/* ---- Board ---- */}
                    {viewMode === 'timeline' && (
                        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {statusOptions.map(statusOption => {
                                const column = filteredApplications.filter(app => app.status === statusOption.value);
                                return (
                                    <section
                                        key={statusOption.value}
                                        onDragOver={handleDragOver}
                                        onDragEnter={() => setDragOver(statusOption.value)}
                                        onDragLeave={(e) => {
                                            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null);
                                        }}
                                        onDrop={(e) => handleDrop(e, statusOption.value)}
                                        className={`rounded-xl border p-2.5 transition-colors duration-200 ${dragOver === statusOption.value
                                            ? 'border-line-bright bg-white/[0.04]'
                                            : 'border-line bg-ink-card/60'
                                            }`}
                                    >
                                        <header className="flex items-center gap-2 px-1.5 pb-2.5">
                                            <statusOption.icon className={`h-3.5 w-3.5 shrink-0 ${statusOption.color}`} strokeWidth={1.8} />
                                            <h3 className="text-[0.8rem] font-medium text-white">{statusOption.label}</h3>
                                            <span className="ml-auto text-[0.75rem] tabular-nums text-mute-faint">
                                                {column.length}
                                            </span>
                                        </header>

                                        <div className="space-y-2">
                                            {column.map(app => (
                                                <article
                                                    key={app.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, app)}
                                                    onDragEnd={() => setDragOver(null)}
                                                    className="group cursor-grab rounded-lg border border-line bg-ink-soft p-3 transition-colors duration-200 hover:border-line-strong active:cursor-grabbing"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="text-[0.85rem] leading-snug text-white">
                                                            {app.job_role}
                                                        </h4>
                                                        <div className="flex shrink-0 gap-0.5">
                                                            <button
                                                                onClick={() => handleEdit(app)}
                                                                aria-label={`Edit ${app.job_role}`}
                                                                className="rounded p-1 text-mute-faint transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
                                                            >
                                                                <Pencil className="h-3 w-3" strokeWidth={1.8} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(app.id)}
                                                                aria-label={`Delete ${app.job_role}`}
                                                                className="rounded p-1 text-mute-faint transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400"
                                                            >
                                                                <Trash2 className="h-3 w-3" strokeWidth={1.8} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <p className="mt-1 truncate text-[0.75rem] font-medium text-mute">
                                                        {app.company}
                                                    </p>

                                                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[0.7rem] font-medium text-mute-faint">
                                                        <span className="truncate">{app.platform || '\u2014'}</span>
                                                        <span className="shrink-0 tabular-nums">
                                                            {new Date(app.date_applied).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </article>
                                            ))}

                                            {column.length === 0 && (
                                                <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[0.75rem] font-medium text-mute-faint">
                                                    Drop a card here
                                                </p>
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    )}

                    {viewMode === 'grid' && filteredApplications.length > 0 && (
                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {filteredApplications.map((app) => {
                                const statusOption = statusOptions.find(opt => opt.value === app.status);
                                const StatusIcon = statusOption?.icon || Clock;

                                return (
                                    <article key={app.id} className="flex flex-col rounded-xl border border-line bg-ink-card p-4 transition-colors duration-200 hover:border-line-strong">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-[0.95rem] text-white">{app.job_role}</h3>
                                                <p className="mt-0.5 truncate text-[0.8rem] font-medium text-mute">
                                                    {app.company}
                                                </p>
                                            </div>
                                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[0.7rem] font-medium ${statusOption?.chip ?? 'border-line-strong text-mute'}`}>
                                                <StatusIcon className="h-3 w-3" strokeWidth={1.8} />
                                                {statusOption?.label}
                                            </span>
                                        </div>

                                        {app.description && (
                                            <p className="mt-3 line-clamp-2 text-[0.78rem] font-medium leading-relaxed text-mute-dim">
                                                {app.description}
                                            </p>
                                        )}

                                        <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.72rem] font-medium text-mute-faint">
                                            {app.platform && (
                                                <div className="flex items-center gap-1.5">
                                                    <Globe className="h-3 w-3" strokeWidth={1.8} />
                                                    <dd>{app.platform}</dd>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" strokeWidth={1.8} />
                                                <dd className="tabular-nums">{new Date(app.date_applied).toLocaleDateString()}</dd>
                                            </div>
                                            {app.resume_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => openResume(app.resume_url)}
                                                    className="flex items-center gap-1.5 text-mute underline-offset-4 transition-colors hover:text-white hover:underline"
                                                >
                                                    <FileText className="h-3 w-3" strokeWidth={1.8} />
                                                    Resume
                                                </button>
                                            )}
                                        </dl>

                                        <div className="mt-4 flex gap-2 border-t border-line pt-3">
                                            <button
                                                onClick={() => handleEdit(app)}
                                                className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-[0.78rem] font-medium text-white transition-colors duration-200 hover:border-line-bright hover:bg-white/[0.06]"
                                            >
                                                <Pencil className="h-3 w-3" strokeWidth={1.8} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(app.id)}
                                                aria-label={`Delete ${app.job_role}`}
                                                className="flex items-center justify-center rounded-md border border-line px-3 py-1.5 text-mute transition-colors duration-200 hover:border-red-500/40 hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty state: only when there is genuinely nothing to show.
                        The timeline keeps its columns so the statuses stay
                        visible as drop targets. */}
                    {filteredApplications.length === 0 && viewMode === 'grid' && (
                        <div className="mt-5 rounded-xl border border-line bg-ink-card px-6 py-14 text-center">
                            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-ink-soft">
                                <Inbox className="h-5 w-5 text-mute" strokeWidth={1.6} />
                            </div>
                            <h3 className="text-[0.95rem] text-white">
                                {applications.length === 0 ? 'Nothing tracked yet' : 'Nothing matches those filters'}
                            </h3>
                            <p className="mx-auto mt-1.5 max-w-sm text-[0.8rem] font-medium leading-relaxed text-mute-dim">
                                {applications.length === 0
                                    ? 'Add the first application and it will appear here, with its status.'
                                    : 'Try a different search, or clear the filters above.'}
                            </p>
                            {applications.length === 0 && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90"
                                >
                                    <Plus className="h-4 w-4" strokeWidth={1.8} />
                                    Add application
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line-strong bg-ink-raised shadow-2xl shadow-black/60">
                            <div className="z-10 border-b border-line p-5">
                                <h2 className="text-[1.05rem] text-white">
                                    {editingApp ? 'Edit Application' : 'Add New Application'}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="rb-label">
                                        Job Role <span className="text-mute-faint">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.job_role}
                                        onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                                        className="rb-input"
                                        placeholder="e.g., Senior Frontend Developer"
                                    />
                                </div>

                                <div>
                                    <label className="rb-label">
                                        Company <span className="text-mute-faint">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="rb-input"
                                        placeholder="e.g., Google"
                                    />
                                </div>

                                <div>
                                    <label className="rb-label">
                                        Platform
                                    </label>
                                    <select
                                        value={formData.platform}
                                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                        className="rb-input"
                                    >
                                        <option value="">Select a platform</option>
                                        {platformOptions.map(platform => (
                                            <option key={platform} value={platform}>{platform}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="rb-label">
                                        Date Applied <span className="text-mute-faint">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date_applied}
                                        onChange={(e) => setFormData({ ...formData, date_applied: e.target.value })}
                                        /* Chromium draws the picker glyph dark; on this ground it
                                           reads as a white block until inverted. */
                                        className="rb-input [color-scheme:dark]"
                                    />
                                </div>

                                <div>
                                    <label className="rb-label">
                                        Status <span className="text-mute-faint">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="rb-input"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="rb-label">
                                        Resume PDF
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setFormData({ ...formData, resume_pdf: e.target.files?.[0] || null })}
                                        className="w-full rounded-md border border-line-strong bg-ink-soft px-3 py-2 text-[0.8rem] text-mute [color-scheme:dark] transition-colors duration-200 file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-[0.75rem] file:font-medium file:text-white hover:border-line-bright hover:file:bg-white/20 focus:border-white/40 focus:outline-none"
                                    />
                                    {editingApp?.resume_url && !formData.resume_pdf && (
                                        <p className="mt-1.5 text-[0.75rem] font-medium text-mute-faint">
                                            Current resume:{' '}
                                            <button
                                                type="button"
                                                onClick={() => openResume(editingApp.resume_url)}
                                                className="text-mute underline underline-offset-4 transition-colors hover:text-white"
                                            >
                                                View
                                            </button>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="rb-label">
                                        Description / Notes
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="rb-textarea resize-y"
                                        placeholder="Add any notes about this application..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 rounded-md bg-white px-4 py-2 text-[0.8rem] font-medium text-ink transition-colors duration-200 hover:bg-white/90 disabled:opacity-60"
                                    >
                                        {editingApp ? 'Update Application' : 'Add Application'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default JobTracker;


