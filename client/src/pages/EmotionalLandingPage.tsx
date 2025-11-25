import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { 
  Check, ArrowRight, Camera, Sparkles, Zap, 
  Activity, Brain, ChevronRight, Star, 
  BarChart2, Smartphone, Globe, Shield, 
  Award, MessageSquare, Users, Heart,
  Utensils, ScanLine, Plus, Play, RefreshCw,
  Flame, Bike, Coffee, Dumbbell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

export default function EmotionalLandingPage() {
  const { t } = useTranslation(['common']);
  const [, setLocation] = useLocation();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [activeBubble, setActiveBubble] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const transformationBubbles = [
    {
      id: 1,
      quote: t('common:emotionalLandingPage.testimonials.maria.quote'),
      name: t('common:emotionalLandingPage.testimonials.maria.name'),
      achievement: t('common:emotionalLandingPage.testimonials.maria.achievement'),
      position: "bottom-[20%] left-[10%]",
    },
    {
      id: 2,
      quote: t('common:emotionalLandingPage.testimonials.pavel.quote'),
      name: t('common:emotionalLandingPage.testimonials.pavel.name'),
      achievement: t('common:emotionalLandingPage.testimonials.pavel.achievement'),
      position: "bottom-[30%] right-[15%]",
    },
    {
      id: 3,
      quote: t('common:emotionalLandingPage.testimonials.sophia.quote'),
      name: t('common:emotionalLandingPage.testimonials.sophia.name'),
      achievement: t('common:emotionalLandingPage.testimonials.sophia.achievement'),
      position: "top-[25%] left-[20%]",
    }
  ];

  useEffect(() => {
    // Play/pause video when isVideoPlaying changes
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }

    // Rotate through testimonial bubbles
    const interval = setInterval(() => {
      setActiveBubble((prev) => (prev + 1) % transformationBubbles.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isVideoPlaying, transformationBubbles.length]);

  return (
    <div className="min-h-screen bg-white text-gray-800 overflow-hidden">
      {/* Full-screen video background with gradient overlay */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white via-gray-50/70 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-[#00BCD6]/5 mix-blend-multiply z-[1]"></div>
        
        {/* Video */}
        <video 
          ref={videoRef}
          className="absolute w-full h-full object-cover"
          loop 
          muted 
          playsInline
          onCanPlay={() => setVideoLoaded(true)}
          poster="/images/transformation-poster.jpg" // You may need to create this
        >
          {/* Replace with your actual transformation video */}
          <source src="https://assets.mixkit.co/videos/preview/mixkit-person-walking-on-a-track-field-40837-large.mp4" type="video/mp4" />
        </video>
        
        {/* Video play button (only shown before play) */}
        {videoLoaded && !isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <button
              onClick={() => setIsVideoPlaying(true)}
              className="p-8 rounded-full bg-[#00BCD6]/20 backdrop-blur-md text-[#00BCD6] hover:bg-[#00BCD6]/30 transition-all duration-300"
            >
              <Play className="h-16 w-16 fill-[#00BCD6]" />
            </button>
          </motion.div>
        )}
      </div>

      {/* Header/Navbar with glassmorphism */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-white/90 border-b border-gray-200">
        <div className="w-full">
          <nav className="flex justify-between items-center py-4 px-6 lg:px-12">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[#00BCD6]" />
              <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]">
                {t('common:emotionalLandingPage.header.appName')}
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#transformation" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">{t('common:emotionalLandingPage.header.navTransformation')}</a>
              <a href="#body-wisdom" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">{t('common:emotionalLandingPage.header.navBodyWisdom')}</a>
              <a href="#stories" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">{t('common:emotionalLandingPage.header.navStories')}</a>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="hidden md:flex text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setLocation("/auth?tab=signin")}
              >
                {t('common:emotionalLandingPage.header.login')}
              </Button>
              
              <Button
                className="bg-gradient-to-r from-[#00BCD6] to-[#A541FF] hover:opacity-90 text-white font-medium rounded-full"
                onClick={() => setLocation("/auth?tab=signup")}
              >
                {t('common:emotionalLandingPage.header.startJourney')}
              </Button>
            </div>
          </nav>
        </div>
      </header>
      
      {/* Main content overlaid on video */}
      <div className="relative z-10 pt-20 h-screen flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 w-full px-6 lg:px-12 flex flex-col justify-center">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.15 }}
            >
              {/* Emotional Badge */}
              <motion.div 
                variants={fadeInUp}
                className="inline-flex items-center px-3 py-1 mb-6 rounded-full bg-[#00BCD6]/10 backdrop-blur-sm border border-[#00BCD6]/20 text-sm text-[#00BCD6]"
              >
                <span className="flex items-center">
                  <Sparkles className="h-3.5 w-3.5 mr-2" />
                  {t('common:emotionalLandingPage.hero.badge')}
                </span>
              </motion.div>
              
              {/* Emotional Headline */}
              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] mb-3 md:mb-4 text-gray-900"
              >
                {t('common:emotionalLandingPage.hero.headline1')} 
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF] bg-[length:200%_auto] animate-gradient">
                  {t('common:emotionalLandingPage.hero.headline2')}
                </span>
              </motion.h1>
              
              <motion.p 
                variants={fadeInUp}
                className="text-base md:text-lg lg:text-xl text-gray-600 mb-5 md:mb-6 leading-relaxed max-w-2xl mx-auto"
              >
                {t('common:emotionalLandingPage.hero.subheadline')}
              </motion.p>
              
              {/* CTA Pulse Button */}
              <motion.div 
                variants={fadeInUp}
                className="mb-6 md:mb-8"
              >
                <div className="relative inline-block">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.8, 0.4, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "loop"
                    }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00BCD6] to-[#A541FF]"
                  />
                  <Button
                    className="relative bg-gradient-to-r from-[#00BCD6] to-[#A541FF] hover:opacity-90 text-white font-semibold rounded-full py-4 md:py-6 px-6 md:px-8 text-base md:text-lg shadow-lg shadow-purple-500/20"
                    onClick={() => setLocation("/auth?tab=signup")}
                  >
                    {t('common:emotionalLandingPage.hero.ctaButton')}
                    <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </div>
          
          {/* Floating testimonial bubbles */}
          <div className="relative h-[20vh] md:h-[25vh] mt-4">
            <AnimatePresence mode="wait">
              {transformationBubbles.map((bubble, index) => (
                index === activeBubble && (
                  <motion.div
                    key={bubble.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.7 }}
                    className={`absolute ${bubble.position} max-w-xs bg-white backdrop-blur-md rounded-2xl p-4 border border-gray-200 shadow-xl`}
                  >
                    <p className="text-gray-700 italic mb-2 text-sm md:text-base">{bubble.quote}</p>
                    <div className="flex items-center">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-[#00BCD6] to-[#A541FF] flex items-center justify-center text-white mr-2 md:mr-3 text-sm md:text-base">
                        {bubble.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm md:text-base">{bubble.name}</p>
                        <p className="text-xs text-gray-500">{bubble.achievement}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        </section>
        
        {/* Pulsing scroll indicator */}
        <motion.div 
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-gray-500 text-sm mb-2">{t('common:emotionalLandingPage.hero.scrollIndicator')}</div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-300 bg-white/50">
            <ChevronRight className="h-4 w-4 text-gray-500 rotate-90" />
          </div>
        </motion.div>
      </div>
      
      {/* Journey highlights as visual steps */}
      <section className="relative bg-gradient-to-b from-white to-gray-50 py-24" id="transformation">
        <div className="absolute inset-0 bg-[#00BCD6]/5 mix-blend-multiply"></div>
        <div className="w-full px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <motion.h2 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-4xl font-black mb-6 text-gray-900"
            >
              {t('common:emotionalLandingPage.transformation.title1')}
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]">
                {t('common:emotionalLandingPage.transformation.title2')}
              </span>
            </motion.h2>
            <p className="text-xl text-gray-600">
              {t('common:emotionalLandingPage.transformation.subtitle')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                icon: <Brain className="h-12 w-12 text-[#00BCD6]" />,
                title: t('common:emotionalLandingPage.transformation.features.bodyIntelligence.title'),
                description: t('common:emotionalLandingPage.transformation.features.bodyIntelligence.description'),
                delay: 0.2
              },
              {
                icon: <Flame className="h-12 w-12 text-[#A541FF]" />,
                title: t('common:emotionalLandingPage.transformation.features.nutritionalDNA.title'),
                description: t('common:emotionalLandingPage.transformation.features.nutritionalDNA.description'),
                delay: 0.4
              },
              {
                icon: <RefreshCw className="h-12 w-12 text-[#F59E0B]" />,
                title: t('common:emotionalLandingPage.transformation.features.transformationTimeline.title'),
                description: t('common:emotionalLandingPage.transformation.features.transformationTimeline.description'),
                delay: 0.6
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: item.delay }}
                className="bg-white rounded-3xl p-8 border border-gray-100 hover:border-gray-200 transition-all duration-300 shadow-lg group"
              >
                <div className="p-4 rounded-2xl bg-gray-50 inline-block mb-6 group-hover:bg-gray-100 transition-all duration-300">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <Button
              className="bg-gradient-to-r from-[#00BCD6] to-[#A541FF] hover:opacity-90 text-white border-none rounded-full py-6 px-8 text-lg font-semibold shadow-lg transition-all duration-300"
              onClick={() => setLocation("/auth?tab=signup")}
            >
              {t('common:emotionalLandingPage.transformation.ctaButton')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Body Wisdom Section */}
      <section className="relative py-24 bg-gradient-to-b from-gray-50 to-white" id="body-wisdom">
        <div className="w-full px-6 lg:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-black mb-6 text-gray-900">
                {t('common:emotionalLandingPage.bodyWisdom.title1')}
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]">
                  {t('common:emotionalLandingPage.bodyWisdom.title2')}
                </span>
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {t('common:emotionalLandingPage.bodyWisdom.subtitle')}
              </p>
              
              <div className="space-y-6">
                {[
                  {
                    icon: <Activity className="h-6 w-6 text-[#00BCD6]" />,
                    title: t('common:emotionalLandingPage.bodyWisdom.features.energyFlow.title'),
                    description: t('common:emotionalLandingPage.bodyWisdom.features.energyFlow.description')
                  },
                  {
                    icon: <Coffee className="h-6 w-6 text-[#A541FF]" />,
                    title: t('common:emotionalLandingPage.bodyWisdom.features.tastePersonality.title'),
                    description: t('common:emotionalLandingPage.bodyWisdom.features.tastePersonality.description')
                  },
                  {
                    icon: <Dumbbell className="h-6 w-6 text-[#F59E0B]" />,
                    title: t('common:emotionalLandingPage.bodyWisdom.features.adaptiveProgress.title'),
                    description: t('common:emotionalLandingPage.bodyWisdom.features.adaptiveProgress.description')
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="p-3 bg-[#00BCD6]/10 rounded-full">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1 text-gray-900">{item.title}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              {/* 3D body visualization */}
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-lg overflow-hidden h-[500px] relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[#00BCD6]/5 to-transparent"></div>
                
                {/* Abstract body silhouette with glowing points */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[250px] h-[400px] bg-gray-50 rounded-full mx-auto relative">
                    {/* Energy points */}
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-[30%] left-[20%] w-4 h-4 rounded-full bg-[#00BCD6] shadow-lg shadow-[#00BCD6]/50"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                      className="absolute top-[45%] right-[25%] w-5 h-5 rounded-full bg-[#A541FF] shadow-lg shadow-[#A541FF]/50"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                      className="absolute top-[60%] left-[30%] w-6 h-6 rounded-full bg-[#F59E0B] shadow-lg shadow-[#F59E0B]/50"
                    />
                    
                    {/* Energy flow lines */}
                    <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 250 400">
                      <motion.path
                        d="M75 120 Q 125 150, 175 180"
                        stroke="#00BCD6"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5,5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                      <motion.path
                        d="M175 180 Q 125 210, 90 240"
                        stroke="#A541FF"
                        strokeWidth="2"
                        fill="none"
                        strokeDasharray="5,5"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 0.6 }}
                        transition={{ duration: 3, delay: 0.5, repeat: Infinity }}
                      />
                    </svg>
                  </div>
                </div>
                
                {/* Stats floating around */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 }}
                  className="absolute top-[20%] left-[10%] bg-white backdrop-blur-md border border-gray-100 rounded-lg px-3 py-2 shadow-md"
                >
                  <div className="text-[#00BCD6] font-bold">{t('common:emotionalLandingPage.bodyWisdom.visualization.energyLevel')}</div>
                  <div className="text-gray-600 text-xs">{t('common:emotionalLandingPage.bodyWisdom.visualization.morningBurst')}</div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="absolute bottom-[20%] right-[15%] bg-white backdrop-blur-md border border-gray-100 rounded-lg px-3 py-2 shadow-md"
                >
                  <div className="text-[#A541FF] font-bold">{t('common:emotionalLandingPage.bodyWisdom.visualization.tasteProfile')}</div>
                  <div className="text-gray-600 text-xs">{t('common:emotionalLandingPage.bodyWisdom.visualization.richSavory')}</div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section - Emotional Bridge to Signup */}
      <section className="relative py-24 bg-gradient-to-b from-[#00BCD6]/5 to-[#A541FF]/5">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent z-10"></div>
          
          {/* Abstract wave pattern */}
          <svg
            className="absolute bottom-0 left-0 right-0 w-full opacity-10"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            style={{ height: '70%' }}
          >
            <motion.path
              initial={{ opacity: 0.2 }}
              animate={{ 
                opacity: [0.2, 0.4, 0.2],
                d: [
                  "M0,192L48,186.7C96,181,192,171,288,176C384,181,480,203,576,202.7C672,203,768,181,864,181.3C960,181,1056,203,1152,197.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,192L48,170.7C96,149,192,107,288,106.7C384,107,480,149,576,160C672,171,768,149,864,144C960,139,1056,149,1152,170.7C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,192L48,186.7C96,181,192,171,288,176C384,181,480,203,576,202.7C672,203,768,181,864,181.3C960,181,1056,203,1152,197.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              fill="#00BCD6"
            />
            <motion.path
              initial={{ opacity: 0.2 }}
              animate={{ 
                opacity: [0.2, 0.3, 0.2],
                d: [
                  "M0,256L48,240C96,224,192,192,288,176C384,160,480,160,576,176C672,192,768,224,864,229.3C960,235,1056,213,1152,208C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,256L48,261.3C96,267,192,277,288,261.3C384,245,480,203,576,197.3C672,192,768,224,864,218.7C960,213,1056,171,1152,165.3C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,256L48,240C96,224,192,192,288,176C384,160,480,160,576,176C672,192,768,224,864,229.3C960,235,1056,213,1152,208C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              fill="#A541FF"
            />
          </svg>
        </div>
        
        <div className="w-full px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-5xl font-black mb-6 text-gray-900"
            >
              {t('common:emotionalLandingPage.finalCTA.title1')}
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#00BCD6] to-[#A541FF]">
                {t('common:emotionalLandingPage.finalCTA.title2')}
              </span>
              {t('common:emotionalLandingPage.finalCTA.title3')}
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-gray-600 mb-8"
            >
              {t('common:emotionalLandingPage.finalCTA.subtitle')}
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-10"
            >
              <Button
                className="bg-gradient-to-r from-[#00BCD6] to-[#A541FF] hover:opacity-90 text-white font-bold rounded-full py-8 px-10 text-xl shadow-xl shadow-[#00BCD6]/10 transition-all duration-300"
                onClick={() => setLocation("/auth?tab=signup")}
              >
                {t('common:emotionalLandingPage.finalCTA.ctaButton')}
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-sm text-gray-500"
            >
              {t('common:emotionalLandingPage.finalCTA.socialProof')}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}