import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { verifyInvite, acceptInvite, type Invite } from '../lib/services/invites'
import { signInWithEmail } from '../lib/services/auth'
import { motion } from 'framer-motion'
import { Mail, CheckCircle, XCircle, Loader, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

type InviteState = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepting' | 'success' | 'error'

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [state, setState] = useState<InviteState>('loading')
  const [invite, setInvite] = useState<Invite | null>(null)
  const [email, setEmail] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    async function checkInvite() {
      if (!token) {
        setState('invalid')
        return
      }

      try {
        const { data, error } = await verifyInvite(token)
        
        if (error || !data) {
          setState('expired')
          return
        }

        setInvite(data)
        setEmail(data.email)
        setState('valid')
      } catch (err) {
        console.error('Error verifying invite:', err)
        setState('error')
      }
    }

    checkInvite()
  }, [token])

  const handleAccept = async () => {
    if (!token) return

    // If user is not authenticated, they need to sign in first
    if (!isAuthenticated) {
      setNeedsAuth(true)
      return
    }

    setState('accepting')
    try {
      await acceptInvite(token)
      setState('success')
      toast.success('Invitation accepted! Redirecting...')
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err: any) {
      console.error('Error accepting invite:', err)
      toast.error(err.message || 'Failed to accept invitation')
      setState('error')
    }
  }

  const handleSignIn = async () => {
    if (!email) return

    try {
      await signInWithEmail(email)
      toast.success('Check your email for a sign-in link!')
      setNeedsAuth(false)
    } catch (err: any) {
      console.error('Error signing in:', err)
      toast.error(err.message || 'Failed to send sign-in link')
    }
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-sand-50">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-sage-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  // Invalid or expired state
  if (state === 'invalid' || state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-sand-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {state === 'invalid' ? 'Invalid Invitation' : 'Invitation Expired'}
          </h1>
          <p className="text-gray-600 mb-6">
            {state === 'invalid' 
              ? 'This invitation link is not valid. Please check the link and try again.'
              : 'This invitation has expired. Please contact your facility administrator for a new invitation.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    )
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-sand-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined the facility. Redirecting to your dashboard...
          </p>
        </motion.div>
      </div>
    )
  }

  // Need authentication state
  if (needsAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-sand-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <Mail className="w-16 h-16 text-sage-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-gray-600">
              To accept this invitation, please sign in with your email address.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <button
              onClick={handleSignIn}
              className="w-full px-6 py-3 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors font-medium"
            >
              Send Sign-In Link
            </button>

            <p className="text-xs text-gray-500 text-center">
              We'll send you a magic link to sign in. No password needed!
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Valid invitation - ready to accept
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-sand-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-sage-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-gray-600">
            You've been invited to join a recovery facility
          </p>
        </div>

        {invite && (
          <div className="bg-sage-50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{invite.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium">
                {invite.role === 'ADMIN' ? 'Facility Admin' : 'Member'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Expires:</span>
              <span className="font-medium">
                {new Date(invite.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              ✓ Signed in as {user?.email}
            </div>
            <button
              onClick={handleAccept}
              disabled={state === 'accepting'}
              className="w-full px-6 py-3 bg-sage-600 text-white rounded-lg hover:bg-sage-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {state === 'accepting' ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleAccept}
            className="w-full px-6 py-3 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors font-medium"
          >
            Continue
          </button>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          By accepting, you agree to join this facility and follow its guidelines.
        </p>
      </motion.div>
    </div>
  )
}

export default AcceptInvite

