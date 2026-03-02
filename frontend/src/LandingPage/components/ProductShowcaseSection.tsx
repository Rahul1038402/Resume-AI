import { motion } from "framer-motion";
import { FileText, BarChart3, ClipboardList } from "lucide-react";
import { useState } from "react";

const ProductShowcaseSection = () => {
  const [activeTab, setActiveTab] = useState(0);

  const products = [
    {
      IconComponent: FileText,
      title: "Resume Builder",
      description: "Professional templates optimized for ATS systems",
      image: "/screenshots/builder.png",
      color: "#3b82f6"
    },
    {
      IconComponent: BarChart3,
      title: "AI Analyzer",
      description: "Get instant feedback on ATS compatibility and keywords",
      image: "/screenshots/analyzer.png",
      color: "#10b981"
    },
    {
      IconComponent: ClipboardList,
      title: "Application Tracker",
      description: "Track all your applications in one organized dashboard",
      image: "/screenshots/tracker.png",
      color: "#8b5cf6"
    }
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div
        className="absolute bottom-0 left-0 right-0 h-px bg-[linear-gradient(to_right,transparent_0%,rgba(203,213,225,0.5)_20%,rgba(203,213,225,1)_50%,rgba(203,213,225,0.5)_80%,transparent_100%)]
    dark:bg-[linear-gradient(to_right,transparent_0%,rgba(100,116,139,0.3)_20%,rgba(100,116,139,0.6)_50%,rgba(100,116,139,0.3)_80%,transparent_100%)]"
      />

      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl mb-6 text-blue-600 dark:text-cyan-400">
              See Resume AI in Action
            </h2>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {products.map((product, index) => {
              const Icon = product.IconComponent;
              return (
                <motion.button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeTab === index
                      ? 'bg-resume-primary dark:bg-resume-secondary text-white dark:text-black shadow-lg'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-5 h-5" />
                  {product.title}
                </motion.button>
              );
            })}
          </div>

          {/* Content Display */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className=" bg-transparent rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${products[activeTab].color}20` }}
                >
                  {(() => {
                    const Icon = products[activeTab].IconComponent;
                    return <Icon className="w-6 h-6" style={{ color: products[activeTab].color }} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {products[activeTab].title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {products[activeTab].description}
                  </p>
                </div>
              </div>

              {/* Screenshot Display */}
              <div className="mt-6 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                <img
                  src={products[activeTab].image}
                  alt={`${products[activeTab].title} screenshot`}
                  className="w-full h-auto"
                  onError={(e) => {
                    // Fallback placeholder if image doesn't exist
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="500"%3E%3Crect fill="%23e5e7eb" width="800" height="500"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="%236b7280"%3EScreenshot Coming Soon%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button
              className="bg-resume-primary dark:bg-resume-secondary hover:bg-resume-primary/90 dark:hover:bg-resume-secondary/90 text-white dark:text-black px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              onClick={() => window.location.href = '/builder'}
            >
              Try It Yourself - Free
            </button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductShowcaseSection;