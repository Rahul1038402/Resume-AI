import React from 'react'
import Aurora from '../../components/ui/Aurora'
import GradientText from '../../components/ui/GradientText'
import { Button } from '../../components/ui/button'
import { Link } from 'react-router-dom'
import ShinyText from '../../components/ui/ShinyText'
import { motion, Variants } from 'framer-motion'

const HeroSection = () => {
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.1,
            }
        }
    }

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                ease: [0.6, 0.05, 0.01, 0.9]
            }
        }
    }

    return (
        <>
            <div className="h-screen">
                <div className="h-56">
                    <Aurora
                        colorStops={["#7CFF67", "#b19eef", "#5227ff"]}
                        blend={0.5}
                        amplitude={2.0}
                        speed={1.0}
                    />
                </div>
                <div className="relative overflow-hidden">
                    <motion.div
                        className="mx-auto px-4 pb-20"
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        <div className="max-w-3xl mx-auto text-center">
                            <div className="mb-6 size-full flex flex-col justify-center items-center">
                                <motion.div variants={itemVariants}>
                                    <GradientText
                                        colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
                                        animationSpeed={11}
                                        showBorder={false}
                                        className="text-6xl"
                                    >
                                        <p className="mb-5">
                                            Land Your Dream Job with AI-Powered Resume Tools
                                        </p>
                                    </GradientText>
                                </motion.div>

                                <motion.p
                                    className="text-2xl mt-6 mb-10 text-gray-600 dark:text-gray-400 max-w-3xl mx-auto"
                                    variants={itemVariants}
                                >
                                    Build professional resumes in minutes, get AI-powered feedback to optimize them, and track every job application in one dashboard.
                                </motion.p>
                            </div>

                            {/* Feature Buttons */}
                            <motion.div
                                className="flex flex-col sm:flex-row justify-center gap-4"
                                variants={itemVariants}
                            >
                                <button
                                    className="dark:bg-transparent rounded-lg border bg-resume-primary hover:bg-resume-primary/90 hover:dark:bg-gray-900/80 dark:border-gray-700 px-4 h-[60px] font-medium cursor-pointer transition-all duration-300"
                                >
                                    <Link to="/builder">
                                        <ShinyText text="Build a Resume" disabled={false} speed={5} className="text-lg" />
                                    </Link>
                                </button>

                                <button
                                    className="dark:bg-transparent rounded-lg border bg-resume-primary hover:bg-resume-primary/90 hover:dark:bg-gray-900/80 dark:border-gray-700 px-4 h-[60px] font-medium cursor-pointer transition-all duration-300"
                                >
                                    <Link to="/analyzer">
                                        <ShinyText text="Analyze Resume" disabled={false} speed={5} className="text-lg" />
                                    </Link>
                                </button>

                                <button
                                    className="dark:bg-transparent rounded-lg border bg-resume-primary hover:bg-resume-primary/90 hover:dark:bg-gray-900/80 dark:border-gray-700 px-4 h-[60px] font-medium cursor-pointer transition-all duration-300"
                                >
                                    <Link to="/tracker">
                                        <ShinyText text="Track Applications" disabled={false} speed={5} className="text-lg" />
                                    </Link>
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    )
}

export default HeroSection;
