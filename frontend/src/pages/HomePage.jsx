import Hero from '../components/home/Hero'
import FeatureStrip from '../components/home/FeatureStrip'
import DevicesSection from '../components/home/DevicesSection'
import HowItWorksSection from '../components/home/HowItWorksSection'
import ServicesSection from '../components/home/ServicesSection'
import ChatbotPreview from '../components/home/ChatbotPreview'
import TrackingPreview from '../components/home/TrackingPreview'
import TransparencySection from '../components/home/TransparencySection'
import CTASection from '../components/home/CTASection'
import { usePageTitle } from '../hooks/usePageTitle'

export default function HomePage() {
  usePageTitle()
  return (
    <>
      <Hero />
      <FeatureStrip />
      <DevicesSection />
      <HowItWorksSection />
      <ServicesSection />
      <ChatbotPreview />
      <TrackingPreview />
      <TransparencySection />
      <CTASection />
    </>
  )
}
