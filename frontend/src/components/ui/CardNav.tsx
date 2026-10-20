
import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { ArrowUpRight, LogOut, NotepadText } from 'lucide-react';
import { supabase } from "@/lib/supabaseClient";
import { Link } from 'react-router-dom';
import GradientText from './GradientText';
import { Logo } from '../common/Logo';

type CardNavLink = {
    label: string;
    href: string;
    ariaLabel: string;
    external?: boolean;
};

export type CardNavItem = {
    label: string;
    bgColor: string;
    textColor: string;
    links: CardNavLink[];
};

export interface CardNavProps {
    items: CardNavItem[];
    className?: string;
    ease?: string;
    baseColor?: string;
    menuColor?: string;
    buttonBgColor?: string;
    buttonTextColor?: string;
}

const CardNav: React.FC<CardNavProps> = ({
    items,
    className = '',
    ease = 'power3.out',
    baseColor = '#fff',
    menuColor,
    buttonBgColor,
    buttonTextColor
}) => {
    const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

    const navRef = useRef<HTMLDivElement | null>(null);
    const cardsRef = useRef<HTMLDivElement[]>([]);
    const tlRef = useRef<gsap.core.Timeline | null>(null);

    // Auth functionality from Header
    useEffect(() => {
        checkUser();
        setupAuthListener();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
    };

    const setupAuthListener = () => {
        supabase.auth.onAuthStateChange((event: any, session: any) => {
            setUser(session?.user || null);
        });
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
            console.error('Error signing in:', error);
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setShowUserMenu(false);
            window.location.reload(); // Reload the page after sign out
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (showUserMenu && !target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showUserMenu]);

    const calculateHeight = () => {
        const navEl = navRef.current;
        if (!navEl) return 260;

        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        const contentEl = navEl.querySelector('.card-nav-content') as HTMLElement;
        if (contentEl) {
            const wasVisible = contentEl.style.visibility;
            const wasPointerEvents = contentEl.style.pointerEvents;
            const wasPosition = contentEl.style.position;
            const wasHeight = contentEl.style.height;

            contentEl.style.visibility = 'visible';
            contentEl.style.pointerEvents = 'auto';
            contentEl.style.position = 'static';
            contentEl.style.height = 'auto';

            contentEl.offsetHeight; // Force reflow

            const topBar = 60;
            const padding = 16;
            const contentHeight = contentEl.scrollHeight;

            contentEl.style.visibility = wasVisible;
            contentEl.style.pointerEvents = wasPointerEvents;
            contentEl.style.position = wasPosition;
            contentEl.style.height = wasHeight;

            return topBar + contentHeight + padding;
        }

        // Fallback with extra space for auth section
        return isMobile ? 400 : 260;
    };

    const createTimeline = () => {
        const navEl = navRef.current;
        if (!navEl) return null;

        gsap.set(navEl, { height: 60, overflow: 'hidden' });
        gsap.set(cardsRef.current, { y: 50, opacity: 0 });

        const tl = gsap.timeline({ paused: true });

        tl.to(navEl, {
            height: calculateHeight,
            duration: 0.4,
            ease
        });

        tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

        return tl;
    };

    useLayoutEffect(() => {
        const tl = createTimeline();
        tlRef.current = tl;

        return () => {
            tl?.kill();
            tlRef.current = null;
        };
    }, [ease, items]);

    useLayoutEffect(() => {
        const handleResize = () => {
            if (!tlRef.current) return;

            if (isExpanded) {
                const newHeight = calculateHeight();
                gsap.set(navRef.current, { height: newHeight });

                tlRef.current.kill();
                const newTl = createTimeline();
                if (newTl) {
                    newTl.progress(1);
                    tlRef.current = newTl;
                }
            } else {
                tlRef.current.kill();
                const newTl = createTimeline();
                if (newTl) {
                    tlRef.current = newTl;
                }
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isExpanded]);

    const toggleMenu = () => {
        const tl = tlRef.current;
        if (!tl) return;
        if (!isExpanded) {
            setIsHamburgerOpen(true);
            setIsExpanded(true);
            tl.play(0);
        } else {
            setIsHamburgerOpen(false);
            tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
            tl.reverse();
        }
    };

    const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
        if (el) cardsRef.current[i] = el;
    };

    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // initial check

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div
            className={`card-nav-container fixed left-1/2 -translate-x-1/2 w-[90%] max-w-[800px] z-[99] top-[1.2em] md:top-[2em] ${className}`}
        >
            <nav
                ref={navRef}
                className={`card-nav border border-white/10 block h-[60px] p-0 rounded-3xl shadow-md bg-ground/85
                    backdrop-blur-md relative overflow-hidden will-change-[height] transition-colors duration-300
                        ${isExpanded ? "open" : ""}`}>
                <div className="card-nav-top absolute inset-x-0 top-0 h-[60px] flex items-center justify-between p-2 pl-[1.1rem] z-[2]">
                    {/* Logo Container */}
                    <div className="logo-container flex items-center order-1">
                        <div className="flex items-center gap-2">
                            <Link to="/" className="flex items-center gap-2 relative z-50">
                                <Logo className="w-8 h-8 sm:w-10 sm:h-10" />
                                <span className="text-2xl text-resume-primary dark:text-resume-secondary">
                                    ResumeAI
                                </span>
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 order-2 mr-4">
                        {/* User Avatar */}
                        {user && (
                            <div className="relative">
                                <img
                                    src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                                    alt={user.user_metadata?.full_name || user.email || 'User'}
                                    className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                />
                            </div>
                        )}
                        {/* Hamburger Menu */}
                        <div
                            className={`hamburger-menu ${isHamburgerOpen ? "open" : ""} group h-full flex flex-col items-center justify-center cursor-pointer gap-[6px]`}
                            onClick={toggleMenu}
                            role="button"
                            aria-label={isExpanded ? "Close menu" : "Open menu"}
                            tabIndex={0}
                            style={{ color: menuColor || "#000" }}
                        >
                            <div
                                className={`hamburger-line dark:text-gray-400 w-[30px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${isHamburgerOpen ? "translate-y-[4px] rotate-45" : ""
                                    } group-hover:opacity-75`}
                            />
                            <div
                                className={`hamburger-line dark:text-gray-400 w-[30px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${isHamburgerOpen ? "-translate-y-[4px] -rotate-45" : ""
                                    } group-hover:opacity-75`}
                            />
                        </div>
                    </div>
                </div>

                <div
                    className={`card-nav-content h-auto absolute left-0 right-0 top-[60px] bottom-0 p-2 flex flex-col items-stretch gap-2 justify-start z-[1] ${isExpanded ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
                        }`}
                    aria-hidden={!isExpanded}
                >
                    {/* Nav Cards */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-end gap-2 md:gap-[12px]">
                        {(items || []).slice(0, 3).map((item, idx) => (
                            <div
                                key={`${item.label}-${idx}`}
                                className="nav-card bg-transparent border border-gray-600/40 select-none relative flex flex-col gap-2 p-[12px_16px] rounded-[calc(0.75rem-0.2rem)] min-w-0 flex-[1_1_auto] h-auto min-h-[60px] md:h-full md:min-h-0 md:flex-[1_1_0%]"
                                ref={setCardRef(idx)}
                            >
                                <div className="nav-card-label font-normal tracking-[-0.5px] text-[18px] md:text-[22px]">
                                    {item.label}
                                </div>
                                <div className="nav-card-links mt-auto flex flex-col gap-[2px]">
                                    {item.links?.map((lnk, i) => (
                                        <a
                                            key={`${lnk.label}-${i}`}
                                            className="nav-card-link inline-flex items-center gap-[6px] no-underline cursor-pointer transition-opacity duration-300 hover:opacity-75 text-[15px] md:text-[16px]"
                                            href={lnk.href}
                                            aria-label={lnk.ariaLabel}
                                            target={lnk.external ? "_blank" : "_self"}
                                        >
                                            <ArrowUpRight className="nav-card-link-icon shrink-0" aria-hidden="true" />
                                            {lnk.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Auth Section - Below the nav cards */}
                    <div className="w-full p-4 rounded-xl border border-gray-600/40">
                        {!user ? (
                            <button
                                onClick={signInWithGoogle}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
                            >
                                Sign in with Google
                            </button>
                        ) : (
                            <div className="flex sm:flex-row flex-col gap-3 sm:justify-between h-full">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={user.user_metadata?.avatar_url || user.user_metadata?.picture}
                                        alt={user.user_metadata?.full_name || 'User'}
                                        className="w-10 h-10 rounded-full border-2 border-gray-300 dark:border-gray-600"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {user.user_metadata?.full_name || user.email}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={signOut}
                                    className="w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </div>
    );
};
export default CardNav;