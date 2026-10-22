import Layout from "@/components/common/Layout";
import GradientText from "@/components/ui/GradientText";
import GlowingCards, { GlowingCard } from "@/components/ui/glowing-cards";
import { Link } from "react-router-dom";

const About = () => {

  return (
    <Layout>
      <div className="container mx-auto px-4 pt-24 pb-12 z-[-3]">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl text-resume-primary dark:text-resume-secondary mb-6">
              About{" "}
              <GradientText
                colors={["#9BBD67", "#26C168", "#92C8C0", "#4079ff", "#E3F1E8"]}
                animationSpeed={10}
                showBorder={false}
                className="text-5xl md:text-6xl  inline"
              >
                ResumeAI
              </GradientText>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Your AI-powered career companion for creating standout resumes, analyzing compatibility, and tracking applications—all in one place.
            </p>
          </div>

          {/* Mission & Values Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-20 relative pb-24">
            <GlowingCards
              enableGlow={true}
              glowRadius={25}
              glowOpacity={0.6}
              animationDuration={500}
            >
              <GlowingCard
                glowColor='#4079ff'
                className="p-6 border-t-4 transition-all duration-300 hover:shadow-2xl h-[300px]">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-2xl  text-resume-primary dark:text-resume-secondary mb-4">
                  Our Mission
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  To empower new grads and college students who are job seekers worldwide with AI-driven tools that simplify resume creation, enhance job application success, and foster career growth.
                </p>
              </GlowingCard >
            </GlowingCards>

            <GlowingCards
              enableGlow={true}
              glowRadius={25}
              glowOpacity={0.6}
              animationDuration={500}
            >
              <GlowingCard
                glowColor='#d6b354'
                className="p-6 border-t-4 transition-all duration-300 hover:shadow-2xl h-[300px]">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-2xl  text-resume-primary dark:text-resume-secondary mb-4">
                  Privacy First
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  None of your resume data is stored permanently. All uploads and analyses are processed securely in-memory and deleted immediately after your session ends. Only the application tracking data you choose to save is stored, and it's protected with industry-standard encryption.
                </p>
              </GlowingCard>
            </GlowingCards>
            {/* Gradient Border Bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(203,213,225,0.5)_20%,rgba(203,213,225,1)_50%,rgba(203,213,225,0.5)_80%,transparent_100%)]
    dark:bg-[linear-gradient(to_right,transparent_0%,rgba(100,116,139,0.3)_20%,rgba(100,116,139,0.6)_50%,rgba(100,116,139,0.3)_80%,transparent_100%)]"
            />
          </div>

          {/* How It Works */}
          <div className="mb-20 pb-24 relative">
            <h2 className="text-3xl  text-center text-resume-primary dark:text-resume-secondary mb-12">
              How It Works
            </h2>
            <div className="grid md:grid-cols-5 gap-6">
              {[
                { step: "1", title: "Analyze", desc: "Upload & get AI insights"},
                { step: "2", title: "Build", desc: "Create optimized resume"},
                { step: "3", title: "Apply", desc: "Submit with confidence"},
                { step: "4", title: "Track", desc: "Monitor applications"},
                { step: "5", title: "Succeed", desc: "Land your dream job"}
              ].map((item, index) => (
                <div
                  key={index}
                  className="group relative bg-white dark:bg-black rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-[#26C168]"
                >
                  <div className="text-sm font-semibold text-[#4079ff] mb-2">
                    Step {item.step}
                  </div>
                  <div className="text-lg  text-resume-primary dark:text-resume-secondary mb-2">
                    {item.title}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
            {/* Gradient Border Bottom */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(203,213,225,0.5)_20%,rgba(203,213,225,1)_50%,rgba(203,213,225,0.5)_80%,transparent_100%)]
    dark:bg-[linear-gradient(to_right,transparent_0%,rgba(100,116,139,0.3)_20%,rgba(100,116,139,0.6)_50%,rgba(100,116,139,0.3)_80%,transparent_100%)]"
            />
          </div>

          {/* CTA Section */}
          <div className="text-center gradient-bg rounded-2xl p-12 shadow-2xl">
            <h2 className="text-3xl md:text-4xl text-white mb-4">
              Ready to Transform Your Job Search?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join us today and take the first step towards landing your dream job with ResumeAI.
            </p>
            <Link to='/analyzer'>
              <button className="bg-white text-resume-primary px-8 py-4 rounded-lg  text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Get Started Free →
              </button>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </Layout>
  );
};

export default About;