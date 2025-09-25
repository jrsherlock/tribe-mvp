import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { ToastContent, getToastStyles, therapeuticToasts } from './ui/Toast';
import toast from 'react-hot-toast';
import { CheckCircle, AlertCircle, Users, ArrowRight, Play, TestTube } from 'lucide-react';

const UXTestComponent: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `✅ ${result}`]);
  };

  const testToastSystem = () => {
    // Test success toast
    const successConfig = therapeuticToasts.checkinSuccess(false, false);
    toast.success(
      (t) => (
        <ToastContent
          type={successConfig.type}
          title={successConfig.title}
          message={successConfig.message}
        />
      ),
      {
        duration: 3000,
        style: getToastStyles(successConfig.type)
      }
    );

    addTestResult('Success toast displayed with therapeutic styling');

    // Test error toast after 2 seconds
    setTimeout(() => {
      const errorConfig = therapeuticToasts.checkinError();
      toast.error(
        (t) => (
          <ToastContent
            type={errorConfig.type}
            title={errorConfig.title}
            message={errorConfig.message}
          />
        ),
        {
          duration: 3000,
          style: getToastStyles(errorConfig.type)
        }
      );
      addTestResult('Error toast displayed with therapeutic styling');
    }, 2000);
  };

  const testNavigation = () => {
    // Test navigation with state
    navigate('/sangha', {
      state: {
        message: 'Test navigation from UX test component - this should show a welcome message!'
      }
    });
    addTestResult('Navigation to Sangha Feed with state message');
  };

  const testLoadingToast = () => {
    const loadingConfig = therapeuticToasts.loadingCheckin(false);
    const loadingToast = toast.loading(loadingConfig.title, {
      icon: loadingConfig.icon,
      style: getToastStyles('info')
    });

    addTestResult('Loading toast displayed');

    // Dismiss after 3 seconds and show success
    setTimeout(() => {
      toast.dismiss(loadingToast);
      const successConfig = therapeuticToasts.checkinSuccess(true, false);
      toast.success(
        (t) => (
          <ToastContent
            type={successConfig.type}
            title={successConfig.title}
            message={successConfig.message}
          />
        ),
        {
          duration: 3000,
          style: getToastStyles(successConfig.type)
        }
      );
      addTestResult('Loading toast dismissed and success toast shown');
    }, 3000);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-8 space-y-8 bg-gradient-healing min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-h1 font-display font-bold text-sand-800 mb-4">
            UX Improvements Test Suite
          </h1>
          <p className="text-body text-sand-600">
            Test the new post-submission navigation and enhanced feedback system
          </p>
        </div>

        {/* Test Controls */}
        <Card className="p-6 space-y-6">
          <h2 className="text-h2 font-display font-semibold text-sand-800 flex items-center space-x-2">
            <TestTube className="w-6 h-6" />
            <span>Test Controls</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="primary" 
              onClick={testToastSystem}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Test Toast System</span>
            </Button>

            <Button 
              variant="accent" 
              onClick={testLoadingToast}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Test Loading Flow</span>
            </Button>

            <Button 
              variant="info" 
              onClick={testNavigation}
              className="flex items-center space-x-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Test Navigation</span>
            </Button>

            <Button 
              variant="secondary" 
              onClick={clearResults}
            >
              Clear Results
            </Button>
          </div>
        </Card>

        {/* Test Results */}
        <Card className="p-6">
          <h2 className="text-h2 font-display font-semibold text-sand-800 mb-4">
            Test Results
          </h2>
          
          {testResults.length === 0 ? (
            <p className="text-sand-500 italic">No tests run yet. Click the buttons above to test the UX improvements.</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center space-x-2 text-success-700">
                  <CheckCircle className="w-4 h-4" />
                  <span>{result}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Implementation Summary */}
        <Card className="p-6">
          <h2 className="text-h2 font-display font-semibold text-sand-800 mb-4">
            Implementation Summary
          </h2>
          
          <div className="space-y-4">
            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <h3 className="font-semibold text-success-800 mb-2">✅ Issue 1: Post-Submission Navigation & Feedback</h3>
              <ul className="text-sm text-success-700 space-y-1">
                <li>• Enhanced toast notifications with therapeutic styling</li>
                <li>• Loading states during submission process</li>
                <li>• Automatic navigation to Sangha Feed after success</li>
                <li>• Comprehensive error handling with user-friendly messages</li>
              </ul>
            </div>

            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <h3 className="font-semibold text-success-800 mb-2">✅ Issue 2: Anonymous Check-ins Fixed</h3>
              <ul className="text-sm text-success-700 space-y-1">
                <li>• Updated SanghaFeed to fetch profiles for all check-in authors</li>
                <li>• Fixed profile fetching logic to show usernames instead of "Anonymous"</li>
                <li>• Added fallback profile fetching for better reliability</li>
                <li>• Improved user experience with proper name display</li>
              </ul>
            </div>

            <div className="bg-ocean-50 border border-ocean-200 rounded-lg p-4">
              <h3 className="font-semibold text-ocean-800 mb-2">🎯 Expected User Flow</h3>
              <div className="text-sm text-ocean-700">
                <p className="mb-2">1. User completes daily check-in</p>
                <p className="mb-2">2. Clicks submit → sees loading toast</p>
                <p className="mb-2">3. Success toast appears with confirmation</p>
                <p className="mb-2">4. Automatically redirected to Sangha Feed</p>
                <p>5. Sees their check-in with proper username display</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Navigation Links */}
        <div className="flex justify-center space-x-4">
          <Button 
            variant="primary" 
            onClick={() => navigate('/checkin')}
            className="flex items-center space-x-2"
          >
            <span>Go to Daily Check-in</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => navigate('/sangha')}
            className="flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>Go to Sangha Feed</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UXTestComponent;
