import Layout from "@/components/common/Layout";
import HeroSection from "./components/HeroSection";
import BentoSection from "./components/BentoSection";
import HowItWorks from "./components/HowItWorks";
import StatsSection from "./components/StatsSection";
import FAQSection from "./components/FAQSection";
import CTASection from "./components/CTASection";

/**
 * Landing page.
 *
 * One dark ground throughout, lit from above in the hero and from below in
 * the closing call to action. No section paints its own background: depth
 * comes from the cards and the lighting, not from alternating blocks.
 */
const Index = () => {
  return (
    <Layout>
      <div className="bg-ink">
        <HeroSection />
        <BentoSection />
        <HowItWorks />
        <StatsSection />
        <FAQSection />
        <CTASection />
      </div>
    </Layout>
  );
};

export default Index;
