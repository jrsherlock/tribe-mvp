import React from 'react'
import { useAuth, clearAuthStorage } from '../hooks/useAuth'
import { motion } from 'framer-motion'
import {Shield, Users, TrendingUp, Heart, CheckCircle, Star, ArrowRight, Lock, Award, RefreshCw} from 'lucide-react'
import { DevUserImpersonation } from './DevUserImpersonation'

const Welcome: React.FC = () => {
  const { signIn } = useAuth()
  const isDev = import.meta.env.DEV

  const handleSignIn = async () => {
    try {
      await signIn()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleResetAuth = () => {
    if (confirm('This will clear all authentication data and reload the page. This can help if you\'re stuck on a loading screen. Continue?')) {
      console.log('[Welcome] Manual auth reset')
      clearAuthStorage()
      window.location.reload()
    }
  }

  const features = [
    {
      icon: Heart,
      title: 'Daily Wellness Check-ins',
      description: 'Evidence-based tracking across mental, emotional, physical, social, and spiritual dimensions of recovery',
      stats: '5-Dimension Framework'
    },
    {
      icon: Users,
      title: 'Peer Support Network',
      description: 'Connect with verified members in a secure, moderated environment designed for lasting recovery',
      stats: 'Verified Community'
    },
    {
      icon: TrendingUp,
      title: 'Progress Analytics',
      description: 'Comprehensive insights into your recovery journey with milestone tracking and trend analysis',
      stats: 'Data-Driven Insights'
    },
    {
      icon: Shield,
      title: 'Privacy & Security',
      description: 'HIPAA-compliant platform with end-to-end encryption protecting your recovery journey',
      stats: 'HIPAA Compliant'
    }
  ]

  const testimonials = [
    {
      quote: "This platform gave me the structure and community I needed after leaving treatment. The daily check-ins became my anchor.",
      name: "Sarah M.",
      role: "2 years sober",
      rating: 5
    },
    {
      quote: "Having a safe space to share struggles and victories with people who understand has been transformative.",
      name: "Michael R.",
      role: "18 months sober",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-healing">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-sage-50 to-sand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center">
            {/* Trust Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center space-x-2 bg-success-100 text-success-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-success-200"
            >
              <Shield size={16} />
              <span>HIPAA Compliant • Secure • Confidential</span>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6 mb-12"
            >
              <h1 className="text-display-lg lg:text-display-xl font-display font-bold text-sand-900 leading-tight">
                Continue Your Recovery
                <span className="block text-sage-600">With Purpose</span>
              </h1>

              <p className="text-body-lg lg:text-h4 text-sand-600 max-w-4xl mx-auto leading-relaxed">
                A therapeutic support platform designed for individuals transitioning from treatment to independent recovery,
                featuring evidence-based tracking and compassionate peer support.
              </p>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16"
            >
              <button
                onClick={handleSignIn}
                className="bg-sage-500 hover:bg-sage-600 text-white px-8 py-4 rounded-lg text-lg font-semibold shadow-sage hover:shadow-strong hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2 group focus:ring-2 focus:ring-sage-500 focus:ring-offset-2"
              >
                <span>Begin Your Journey</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center space-x-4 text-sand-600">
                <div className="flex items-center space-x-1">
                  <CheckCircle size={20} className="text-success-600" />
                  <span>No commitment required</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Lock size={20} className="text-success-600" />
                  <span>100% confidential</span>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">10,000+</div>
                <div className="text-secondary-600">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">85%</div>
                <div className="text-secondary-600">12-Month Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">24/7</div>
                <div className="text-secondary-600">Peer Support Available</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-h1 font-display font-bold text-sand-900 mb-4">
              Evidence-Based Recovery Support
            </h2>
            <p className="text-body-lg text-sand-600 max-w-3xl mx-auto">
              Our platform combines clinical best practices with peer support to provide comprehensive, therapeutic recovery assistance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="bg-white border border-sand-200 rounded-xl p-8 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-start space-x-6">
                    <div className="w-16 h-16 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-8 h-8 text-sage-600" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-h3 font-display font-semibold text-sand-900">{feature.title}</h3>
                        <span className="text-caption font-semibold text-sage-600 bg-sage-100 px-3 py-1 rounded-full border border-sage-200">
                          {feature.stats}
                        </span>
                      </div>
                      <p className="text-body text-sand-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-24 bg-sage-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-h1 font-display font-bold text-sand-900 mb-4">
              Real Stories, Real Recovery
            </h2>
            <p className="text-body-lg text-sand-600">
              Hear from members who have found strength and healing in our supportive community
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-secondary-200"
              >
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-secondary-700 text-lg leading-relaxed mb-6">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold text-lg">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-secondary-900">{testimonial.name}</div>
                    <div className="text-secondary-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-sage-600 to-sage-700 rounded-3xl p-12 text-white text-center shadow-xl"
          >
            <Award className="w-16 h-16 mx-auto mb-8 opacity-90" />
            <h3 className="text-3xl font-bold mb-8">Our Commitment to Your Recovery</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="text-xl font-semibold">Confidentiality</div>
                <div className="text-primary-100 leading-relaxed">
                  Your privacy is sacred. All interactions are protected by the highest security standards.
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xl font-semibold">Evidence-Based</div>
                <div className="text-primary-100 leading-relaxed">
                  Every feature is grounded in proven recovery methodologies and clinical research.
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-xl font-semibold">Peer-Driven</div>
                <div className="text-primary-100 leading-relaxed">
                  Recovery thrives in community. Connect with others who understand your journey.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-24 bg-secondary-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold text-secondary-900">
              Your Recovery Journey Continues Here
            </h2>
            <p className="text-xl text-secondary-600 leading-relaxed">
              Join thousands of individuals who have found strength, support, and sustained recovery through our platform.
            </p>
            <button
              onClick={handleSignIn}
              className="bg-sage-600 hover:bg-sage-700 text-white px-12 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center space-x-3 group"
            >
              <span>Start Your Journey Today</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-sm text-secondary-500 mt-4">
              Free to join • No credit card required • HIPAA compliant
            </div>

            {/* Debug: Reset Auth Button (only in dev) */}
            {isDev && (
              <button
                onClick={handleResetAuth}
                className="mt-6 text-xs text-red-600 hover:text-red-700 underline flex items-center space-x-1 mx-auto"
              >
                <RefreshCw size={12} />
                <span>Reset Auth (Debug)</span>
              </button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Development User Impersonation Tool */}
      <DevUserImpersonation />
    </div>
  )
}

export default Welcome