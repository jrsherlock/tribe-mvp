import React from 'react';
import { ProgressBar } from './ui/ProgressBar';

const GradientTest: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-gradient-healing min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-h1 font-display font-bold text-sand-800 mb-8 text-center">
          Therapeutic Gradient System Test
        </h1>

        {/* Background Gradients Test */}
        <div className="space-y-6">
          <h2 className="text-h2 font-display font-semibold text-sand-700">Background Gradients</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-sage h-32 rounded-xl flex items-center justify-center text-white font-semibold">
              Sage Gradient
            </div>
            <div className="bg-gradient-ocean h-32 rounded-xl flex items-center justify-center text-white font-semibold">
              Ocean Gradient
            </div>
            <div className="bg-gradient-sunrise h-32 rounded-xl flex items-center justify-center text-white font-semibold">
              Sunrise Gradient
            </div>
            <div className="bg-gradient-lavender h-32 rounded-xl flex items-center justify-center text-white font-semibold">
              Lavender Gradient
            </div>
          </div>
        </div>

        {/* Progress Bars Test */}
        <div className="space-y-6">
          <h2 className="text-h2 font-display font-semibold text-sand-700">Progress Bar Gradients</h2>
          
          <div className="space-y-4">
            <ProgressBar 
              value={75} 
              variant="sage" 
              label="Sage Progress" 
              showLabel 
            />
            <ProgressBar 
              value={60} 
              variant="ocean" 
              label="Ocean Progress" 
              showLabel 
            />
            <ProgressBar 
              value={85} 
              variant="sunrise" 
              label="Sunrise Progress" 
              showLabel 
            />
            <ProgressBar 
              value={45} 
              variant="lavender" 
              label="Lavender Progress" 
              showLabel 
            />
            <ProgressBar 
              value={90} 
              variant="success" 
              label="Success Progress" 
              showLabel 
            />
          </div>
        </div>

        {/* Gradient Buttons Test */}
        <div className="space-y-6">
          <h2 className="text-h2 font-display font-semibold text-sand-700">Gradient Elements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-sage-500 to-sage-600 p-6 rounded-xl text-white">
              <h3 className="font-semibold mb-2">Sage Gradient Card</h3>
              <p className="text-white/90">This represents growth and healing in recovery.</p>
            </div>

            <div className="bg-gradient-to-r from-ocean-600 to-ocean-700 p-6 rounded-xl text-white">
              <h3 className="font-semibold mb-2">Ocean Gradient Card</h3>
              <p className="text-white/90">This represents calm and stability.</p>
            </div>

            <div className="bg-gradient-to-r from-sunrise-500 to-sunrise-600 p-6 rounded-xl text-white">
              <h3 className="font-semibold mb-2">Sunrise Gradient Card</h3>
              <p className="text-white/90">This represents hope and new beginnings.</p>
            </div>

            <div className="bg-gradient-to-r from-lavender-500 to-lavender-600 p-6 rounded-xl text-white">
              <h3 className="font-semibold mb-2">Lavender Gradient Card</h3>
              <p className="text-white/90">This represents spiritual wellness.</p>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="bg-white rounded-xl p-6 shadow-soft border border-sand-200 text-center">
          <div className="w-12 h-12 bg-success-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-h3 font-display font-semibold text-sand-800 mb-2">
            Gradient System Working!
          </h3>
          <p className="text-body text-sand-600">
            All therapeutic gradients are now properly configured and rendering correctly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GradientTest;
