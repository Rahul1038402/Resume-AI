import { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, Building, FileText, Clock, XCircle, Award, Globe, Search, Sparkles } from 'lucide-react';
import Layout from '@/components/common/Layout';
import GradientText from '@/components/ui/GradientText';
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

    const statusOptions = [
        { value: 'applied', label: 'Applied', icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
        { value: 'in_progress', label: 'In Progress', icon: Calendar, color: 'text-yellow-600 dark:text-yellow-400' },
        { value: 'got_offer', label: 'Got Offer', icon: Award, color: 'text-green-600 dark:text-green-400' },
        { value: 'not_selected', label: 'Not Selected', icon: XCircle, color: 'text-red-600 dark:text-red-400' }
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
            const { data, error } = await supabase
                .from('job_applications')
                .select('*')
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

                const { data: { publicUrl } } = supabase.storage
                    .from('resumes')
                    .getPublicUrl(fileName);

                resumeUrl = publicUrl;
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
    };

    // Loader while the Supabase session is being restored
    if (loading) {
        return (
            <Loader />
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full mx-4 border border-border">
                    <div className="text-center">
                        <GradientText
                            colors={["#9BBD67", "#26C168", "#92C8C0", "#4079ff", "#E3F1E8"]}
                            animationSpeed={10}
                            showBorder={false}
                            className="text-4xl"
                        >
                            ResumeAI
                        </GradientText>
                        <p className="text-muted-foreground mb-8">Track your job applications efficiently</p>
                        <button
                            onClick={signInWithGoogle}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-50/10 dark:text-gray-100 hover:bg-gray-200/70 dark:hover:bg-gray-100/30 text-gray-800 font-medium rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <svg width="20" height="20" viewBox="0 0 24 24">
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
            <div className="pt-28 bg-background">
                <div className="text-center mb-4">
                    <GradientText
                        colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                        animationSpeed={11}
                        showBorder={false}
                        className="text-5xl"
                    >
                        <p className="mb-5">
                            Job Application Tracker
                        </p>
                    </GradientText>
                </div>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <GmailSyncManager
                        user={user}
                        onApplicationsImported={fetchApplications}
                    />
                </main>

                <main className="max-w-[100rem] min-h-screen mx-2 px-4 sm:px-6 lg:px-8 pt-8 mb-14  border border-gray-300 dark:border-gray-800 rounded-xl">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-4 pb-8">
                        {/* Left: View Toggle */}
                        <div className="flex items-center gap-2">
                            <p>View Mode:</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewMode('timeline')}
                                    className={`px-4 py-2 rounded-lg transition ${viewMode === 'timeline'
                                        ? 'bg-resume-primary dark:bg-resume-secondary text-white dark:text-black'
                                        : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    Timeline
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-4 py-2 rounded-lg transition ${viewMode === 'grid'
                                        ? 'bg-resume-primary dark:bg-resume-secondary text-white dark:text-black'
                                        : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    Grid
                                </button>

                            </div>
                        </div>

                        {/* Right: Add Button */}
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-resume-primary dark:bg-resume-secondary hover:bg-resume-primary/90 hover:dark:bg-resume-secondary/80 text-white dark:text-black rounded-lg transition whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            Add Application
                        </button>
                    </div>


                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 custom:grid-cols-5 gap-4 mb-8">
                        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                                </div>
                                <Building className="w-8 h-8 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 shadow-sm border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">Applied</p>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.applied}</p>
                                </div>
                                <Clock className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 shadow-sm border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">In Progress</p>
                                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.in_progress}</p>
                                </div>
                                <Calendar className="w-8 h-8 text-yellow-500" />
                            </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 shadow-sm border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 dark:text-green-400">Got Offer</p>
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.got_offer}</p>
                                </div>
                                <Award className="w-8 h-8 text-green-500" />
                            </div>
                            {stats.got_offer > 0 && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                    <Sparkles className="w-3 h-3" />
                                    <span className="font-medium">Congratulations! 🎉</span>
                                </div>
                            )}
                            {stats.got_offer === 0 && (
                                <p className="mt-2 text-xs text-muted-foreground">Keep grinding! 💪</p>
                            )}
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 shadow-sm border border-red-200 dark:border-red-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-red-600 dark:text-red-400">Not Selected</p>
                                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.not_selected}</p>
                                </div>
                                <XCircle className="w-8 h-8 text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="rounded-lg p-4 shadow-sm mb-6">
                        <div className="flex flex-col custom:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search by job role, company, or platform..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="w-full pl-10 pr-4 py-4 bg-background rounded-md border
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                    />
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div ref={statusRef} className="relative inline-block text-left">
                                {/* Dropdown Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                    className="inline-flex dark:text-gray-400 justify-between items-center p-4 bg-background rounded-md border
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                >
                                    {selectedStatuses.length > 0
                                        ? `${selectedStatuses.length} selected`
                                        : 'Filter by Status'}
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
                                    <div className="absolute mt-2 w-56 bg-card border border-input rounded-lg shadow-lg z-50">
                                        <ul className="max-h-60 overflow-y-auto py-2">
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
                                                    className={`px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${selectedStatuses.includes(option.value)
                                                        ? 'bg-accent text-accent-foreground'
                                                        : ''
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
                                    className="inline-flex dark:text-gray-400 justify-between items-center p-4 bg-background rounded-md border
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                >
                                    {sortBy ? sortOptions.find(o => o.value === sortBy)?.label : 'Sort by'}
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
                                    <div className="absolute mt-2 w-44 bg-popover border border-input rounded-lg shadow-lg z-50">
                                        <ul className="py-2">
                                            {sortOptions.map((option) => (
                                                <li
                                                    key={option.value}
                                                    onClick={() => {
                                                        setSortBy(option.value);
                                                        setShowSortDropdown(false); // close after selecting one
                                                    }}
                                                    className={`px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${sortBy === option.value ? 'bg-accent text-accent-foreground' : ''
                                                        }`}
                                                >
                                                    {sortBy === option.value ? '✓ ' : ''}{option.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Clear Filters */}
                        {(searchQuery || selectedStatuses.length > 0) && (
                            <div className="mt-4 flex items-center gap-2 text-sm flex-wrap">
                                <span className="text-muted-foreground">Active filters:</span>
                                {searchQuery && (
                                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                        Search: "{searchQuery}"
                                    </span>
                                )}
                                {selectedStatuses.map(status => (
                                    <span key={status} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                        {statusOptions.find(opt => opt.value === status)?.label}
                                    </span>
                                ))}
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedStatuses([]);
                                    }}
                                    className="ml-2 text-resume-primary dark:text-resume-secondary hover:underline"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Timeline View */}
                    {viewMode === 'timeline' && (
                        <>
                            <span className="text-gray-700 dark:text-gray-400 underline italic text-sm flex justify-center items-center mb-4">Drag and Drop to change status</span>
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
                                {statusOptions.map(statusOption => (
                                    <div
                                        key={statusOption.value}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, statusOption.value)}
                                        className="rounded-lg p-4 border-2 border-dashed border-border min-h-[300px]"
                                    >
                                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
                                            <statusOption.icon className={`w-5 h-5 ${statusOption.color}`} />
                                            <h3 className="font-semibold text-foreground">{statusOption.label}</h3>
                                            <span className="ml-auto text-sm text-muted-foreground">
                                                {filteredApplications.filter(app => app.status === statusOption.value).length}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {filteredApplications
                                                .filter(app => app.status === statusOption.value)
                                                .map(app => (
                                                    <div
                                                        key={app.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, app)}
                                                        className="bg-card rounded-lg p-3 cursor-move hover:shadow-md transition border border-border"
                                                    >
                                                        <h4 className="font-medium text-sm text-foreground mb-1">{app.job_role}</h4>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Building className="w-3 h-3" />
                                                            {app.company}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {new Date(app.date_applied).toLocaleDateString()}
                                                        </p>
                                                        <div className="flex gap-2 pt-2">
                                                            <button
                                                                onClick={() => handleEdit(app)}
                                                                className="flex-1 px-3 py-2 bg-resume-primary/10 dark:bg-resume-secondary/10 text-resume-primary dark:text-resume-secondary rounded hover:bg-resume-primary/20 dark:hover:bg-resume-secondary/20 transition text-sm font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(app.id)}
                                                                className="flex-1 px-3 py-2 bg-red-200 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredApplications.map((app) => {
                                const statusOption = statusOptions.find(opt => opt.value === app.status);
                                const StatusIcon = statusOption?.icon || Clock;

                                return (
                                    <div key={app.id} className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-semibold text-lg text-resume-accent">{app.job_role}</h3>
                                                <p className="text-muted-foreground flex items-center gap-1">
                                                    <Building className="w-4 h-4" />
                                                    {app.company}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusIcon className={`w-5 h-5 ${statusOption?.color || 'text-muted-foreground'}`} />
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-4">
                                            {app.platform && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Globe className="w-4 h-4" />
                                                    Platform: {app.platform}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Calendar className="w-4 h-4" />
                                                Applied: {new Date(app.date_applied).toLocaleDateString()}
                                            </div>

                                            {app.resume_url && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                                    <a
                                                        href={app.resume_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:text-primary/80 underline"
                                                    >
                                                        View Resume
                                                    </a>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusOption?.value === 'applied' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                                    statusOption?.value === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                                        statusOption?.value === 'got_offer' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                                            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                    }`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusOption?.label}
                                                </span>
                                            </div>

                                            {app.description && (
                                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                    {app.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(app)}
                                                className="flex-1 px-3 py-2 bg-resume-primary/10 dark:bg-resume-secondary/10 text-resume-primary dark:text-resume-secondary rounded hover:bg-resume-primary/20 dark:hover:bg-resume-secondary/20 transition text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(app.id)}
                                                className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredApplications.length === 0 && (
                        <div className="text-center py-12">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                                {applications.length === 0 ? 'No applications yet' : 'No applications found'}
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                {applications.length === 0
                                    ? 'Start tracking your job applications by adding your first one!'
                                    : 'Try adjusting your search or filter criteria'
                                }
                            </p>
                            {applications.length === 0 && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-resume-primary dark:bg-resume-secondary hover:bg-resume-primary/90 hover:dark:bg-resume-secondary/80 text-white rounded-lg transition"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add Your First Application
                                </button>
                            )}
                        </div>
                    )}
                </main>

                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-white/80 dark:bg-black flex items-center justify-center p-4 z-60">
                        <div className="bg-white dark:bg-black rounded-lg shadow-xl max-w-2xl w-full max-h-[70vh] overflow-y-auto border border-border">
                            <div className="order-b border-b border-gray-300 dark:border-gray-800 p-6 z-10">
                                <h2 className="text-xl text-resume-primary dark:text-resume-secondary">
                                    {editingApp ? 'Edit Application' : 'Add New Application'}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Job Role <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.job_role}
                                        onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                                        className="h-8 w-full p-2 text-xs rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-black
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                        placeholder="e.g., Senior Frontend Developer"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Company <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="h-8 w-full p-2 text-xs rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-black
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                        placeholder="e.g., Google"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Platform
                                    </label>
                                    <select
                                        value={formData.platform}
                                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                        className="h-8 w-full p-2 text-xs rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-black
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                    >
                                        <option value="">Select a platform</option>
                                        {platformOptions.map(platform => (
                                            <option key={platform} value={platform}>{platform}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Date Applied <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date_applied}
                                        onChange={(e) => setFormData({ ...formData, date_applied: e.target.value })}
                                        className="h-8 w-full p-2 text-xs rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-black
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Status <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="h-8 w-full p-2 text-xs rounded-md border border-gray-300 dark:border-gray-800 bg-white dark:bg-black
                                   focus:border-[0.5px] focus:ring-1 focus:ring-resume-primary/60 dark:focus:ring-resume-secondary/70 
                                   focus:shadow-[0_0_6px_rgba(26,54,93,0.4)] dark:focus:shadow-[0_0_6px_rgba(56,178,172,0.4)] 
                                   outline-none focus:outline-none transition-all duration-150"
                                    >
                                        {statusOptions.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Resume PDF
                                    </label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setFormData({ ...formData, resume_pdf: e.target.files?.[0] || null })}
                                        className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-resume-primary/10 file:text-resume-primary dark:file:bg-resume-secondary/10 dark:file:text-resume-secondary hover:file:bg-resume-primary/20 dark:hover:file:bg-resume-secondary/20"
                                    />
                                    {editingApp?.resume_url && !formData.resume_pdf && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Current resume: <a href={editingApp.resume_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-800 dark:text-gray-400 mb-1">
                                        Description / Notes
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                                        placeholder="Add any notes about this application..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-resume-primary dark:bg-resume-secondary hover:bg-resume-primary/90 hover:dark:bg-resume-secondary/80 text-white rounded-lg transition font-medium"
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


