import { Coffee } from "lucide-react";
import Layout from "@/components/common/Layout";
import IconMarquee from "@/components/ui/linksmarquee";

export default function AboutMe() {
  return (
    <Layout>
      <div className="min-h-screen pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Heading */}
          <h1 className="text-4xl text-resume-primary dark:text-resume-secondary mb-6 text-center">
            About Me
          </h1>

          {/* Intro */}
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Hi 👋, I’m <span className="font-semibold">Rahul Mall</span>,
            a passionate developer and student currently building projects in
            <span className="font-medium"> React, Next JS TypeScript, Node, Flask, and FastAPI</span>.
            I love solving leetcode problems daily, experimenting with AI/ML, and creating full-stack applications that make a real impact.
            This project, <span className="font-semibold">ResumeAI</span>, is my attempt to help students and professionals
            build smarter resumes, get tailored AI feedback, and track applications seamlessly.
          </p>

          {/* Journey */}
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            Over the last few months, I’ve been learning deeply about{" "}
            <span className="font-medium">machine learning, backend systems, and scalable frontend design</span>.
            while working on side projects like{" "}
            <span className="italic">Building ML models, a Posture Detection app with FastAPI + OpenCV, and multiple React-based apps.</span>
          </p>

          <p className="text-lg leading-relaxed mb-6 text-center">View My Work:<a href="https://portfolio-website-eight-plum.vercel.app/" target="_blank" className="text-blue-500 underline ml-2">Portfolio</a></p>

          {/* Motivation */}
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
            ResumeAI is more than just a tool, it’s a reflection of my journey as a developer.
            If you find it helpful, I’d love your support. Even a small coffee keeps me motivated to
            keep improving this project and share more open-source work 🙌.
          </p>

          {/* Donation / Contribute */}
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl shadow-md mb-12 text-center">
            <h2 className="text-2xl text-resume-primary dark:text-resume-secondary mb-4">
              Found ResumeAI Helpful?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Support my work, buy me a coffee and help me keep building useful projects. Thank you! 🙂
            </p>
              <div className="flex flex-col justify-center items-center gap-4 bg-gray-800">
                <div className="text-green-500 bg-green-700/40 rounded-xl text-lg p-3 flex items-center gap-2">
                  <Coffee size={20} /> Buy Me a Coffee
                </div>
                {/* QR Code */}
                <img
                  src="/Rahul_UPI_QR.png"
                  alt="UPI QR Code"
                  className="w-48 h-48 rounded-lg shadow-md border"
                />
              </div>
          </div>
          <hr />

          {/* Social Links */}
          <h4 className="text-2xl text-resume-primary dark:text-resume-secondary mt-4 mb-2 text-center">Connect with me</h4>
          <IconMarquee speed={20} iconSize={30} />
        </div>
      </div>
    </Layout>
  );
}
