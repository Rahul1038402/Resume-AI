import Layout from "@/components/common/Layout";
import NumberedFeatureCards from "./components/CardComponents";
import PainPointsSection from "./components/PainPointsSection";
import HeroSection from "@/LandingPage/components/HeroSection";
import StatsSection from "@/LandingPage/components/StatsSection";
import WhyResumeAISection from "@/LandingPage/components/WhyResumeAISection";
import CTASection from "@/LandingPage/components/CTASection";
import FAQSection from "@/LandingPage/components/FAQSection";
import ProductShowcaseSection from "./components/ProductShowcaseSection";

const Index = () => {
  return (
    <Layout>
      {/* Hero Section with improved CTA hierarchy */}
      <section className="overflow-hidden">
        <HeroSection />
      </section>

      {/* Problem/Solution comparison */}
      <PainPointsSection />

      {/* Why Choose ResumeAI */}
      <WhyResumeAISection />

      <ProductShowcaseSection />

      {/* How it works - step by step */}
      <NumberedFeatureCards />

      {/* Social proof with stats */}
      <StatsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <CTASection />

    </Layout>
  );
};

export default Index;