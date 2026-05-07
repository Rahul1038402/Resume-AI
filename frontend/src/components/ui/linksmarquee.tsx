import React, { useRef, useEffect, useState } from 'react';
import { Github, Linkedin, Instagram, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface IconMarqueeProps {
  speed?: number;
  iconSize?: number;
  className?: string;
}

export default function IconMarquee({
  speed = 15,
  iconSize = 40,
  className = '',
}: IconMarqueeProps) {
  const icons = [
    { Icon: Github, color: '#333', href: 'https://github.com/Rahul1038402' },
    { Icon: Linkedin, color: '#0077B5', href: 'https://www.linkedin.com/in/rahul-kr-mall' },
    { Icon: Instagram, color: '#E4405F', href: 'https://www.instagram.com/ig__rahul70' },
    { Icon: Mail, color: '#EA4335', href: 'mailto:rahul1038402@gmail.com' },
  ];

  // Triple the icons for seamless looping
  const tripled = [...icons, ...icons, ...icons];

  return (
    <div className={`relative w-full max-w-xs sm:max-w-md mx-auto overflow-hidden group flex h-24 ${className}`}>
      {/* Edge fades */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent dark:from-black z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent dark:from-black z-10" />

      <motion.div
        className="flex items-center gap-14 w-max"
        animate={{
          x: [0, -100 / 3 + '%'], // Move exactly one third (one set of icons)
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
        whileHover={{ 
          animationPlayState: 'paused' 
        }}
      >
        {tripled.map((iconData, i) => (
          <motion.div
            key={i}
            className="flex-none flex items-center justify-center"
            style={{
              width: 64,
              color: iconData.color,
            }}
            whileHover={{ 
              scale: 1.25,
              transition: { duration: 0.3 }
            }}
          >
            <a href={iconData.href} target="_blank" rel="noopener noreferrer">
              <iconData.Icon size={iconSize} />
            </a>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
