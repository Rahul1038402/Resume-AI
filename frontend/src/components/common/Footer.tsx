import { Link } from "react-router-dom";
import Orb from '@/components/ui/Orb';
import { Logo } from "./Logo";
import { Twitter, Linkedin, Github } from 'lucide-react';

const Footer = () => {
  const socialLinks = [
    { icon: Twitter, href: "https://x.com/Rahul_Kr_Mall", label: "Twitter" },
    { icon: Linkedin, href: "https://www.linkedin.com/in/rahul-malll-85989327b/", label: "LinkedIn" },
    { icon: Github, href: "https://github.com/Rahul1038402", label: "GitHub" }
  ];
  return (
    <>
      {/* Footer Navigation */}
      <div className="relative w-full border-t border-gray-300 dark:border-gray-700 bg-gradient-to-t from-white/95 via-white/70 to-white/0 dark:from-black/95 dark:via-black/70 dark:to-black/0 backdrop-blur-sm">
        <div className="flex flex-col justify-center items-center container mx-auto px-4 pb-8 relative pt-6">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2 relative z-50">
                <Logo className="w-8 h-8 sm:w-10 sm:h-10" />
                <span className="text-3xl text-resume-primary dark:text-resume-secondary">
                  ResumeAI
                </span>
              </Link>
            </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 relative pb-12">
            <div className='w-fit h-fit backdrop-blur-md'>
              <h4 className="font-semibold text-xl text-resume-primary dark:text-resume-secondary mb-10">Features</h4>
              <ul className="space-y-6">
                <li>
                  <Link to="/builder" className="text-gray-600 hover:text-resume-primary dark:text-gray-300 dark:hover:text-white transition-colors">Resume Builder</Link>
                </li>
                <li>
                  <Link to="/analyzer" className="text-gray-600 hover:text-resume-primary dark:text-gray-300 dark:hover:text-white transition-colors">Resume Analyzer</Link>
                </li>
                <li>
                  <Link to="/tracker" className="text-gray-600 hover:text-resume-primary dark:text-gray-300 dark:hover:text-white transition-colors">Job Tracker</Link>
                </li>
              </ul>
            </div>

            <div className='w-fit h-fit backdrop-blur-md'>
              <h4 className="font-semibold text-xl text-resume-primary dark:text-resume-secondary mb-10">About Us</h4>
              <ul className="space-y-6">
                <li>
                  <Link to="/about" className="text-gray-600 hover:text-resume-primary dark:text-gray-300 dark:hover:text-white transition-colors">About Resume AI</Link>
                </li>
                <li>
                  <Link to="/aboutme" className="text-gray-600 hover:text-resume-primary dark:text-gray-300 dark:hover:text-white transition-colors">About Me</Link>
                </li>
                <li>
                  <Link to="/terms" className="text-gray-600 hover:text-resume-primary dark:text-gray-300 dark:hover:text-white transition-colors">Terms of Service</Link>
                </li>
              </ul>
            </div>
            <Orb
              hoverIntensity={0.75}
              rotateOnHover={true}
              hue={10}
              forceHoverState={false}
            />
            {/* Gradient Border Bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(203,213,225,0.5)_20%,rgba(203,213,225,1)_50%,rgba(203,213,225,0.5)_80%,transparent_100%)]
    dark:bg-[linear-gradient(to_right,transparent_0%,rgba(100,116,139,0.3)_20%,rgba(100,116,139,0.6)_50%,rgba(100,116,139,0.3)_80%,transparent_100%)]"
            />
          </div>

          <div className="flex flex-col justify-between items-center w-full gap-6">
            {/* Copyright Section */}
            <div className="w-full">
              <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} ResumeAI. All rights reserved.</p>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center hover:text-gray-500 rounded-lg transition-colors duration-300"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;