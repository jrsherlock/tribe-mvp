# 🚀 Sangha Migration & Development Plan
*From Lumi SDK to Self-Hosted Supabase Backend*

---

## 📊 Executive Summary

**Project**: Migrate Sangha addiction recovery app from Lumi SDK to self-hosted Supabase backend
**Timeline**: 8-10 weeks
**Team Size**: 1-2 developers
**Budget Estimate**: $2,000-5,000 (infrastructure + tools)

### **Key Deliverables**
1. ✅ Complete Supabase backend with HIPAA-level security
2. ✅ Migrated frontend with new therapeutic design system
3. ✅ Production-ready deployment pipeline
4. ✅ Comprehensive testing and documentation
5. ✅ MVP feature set ready for user testing

---

## 🎯 Migration Phases

## **Phase 1: Backend Infrastructure (Weeks 1-2)**

### **1.1 Supabase Project Setup**
**Duration**: 2-3 days

**Tasks:**
- [ ] Create Supabase organization and projects (dev/staging/prod)
- [ ] Configure authentication providers (email, Google, Apple)
- [ ] Set up environment variables and secrets management
- [ ] Configure custom domains and SSL certificates
- [ ] Set up monitoring and logging

**Deliverables:**
- Supabase projects configured for all environments
- Environment configuration documentation
- Initial security audit checklist

### **1.2 Database Schema Implementation**
**Duration**: 3-4 days

**Tasks:**
- [ ] Execute `supabase-schema.sql` in all environments
- [ ] Apply RLS policies from `supabase-rls-policies.sql`
- [ ] Set up database migrations workflow
- [ ] Create seed data for development
- [ ] Test schema with sample data

**Deliverables:**
- Complete database schema deployed
- RLS policies tested and verified
- Migration scripts and rollback procedures
- Database documentation

### **1.3 Storage Configuration**
**Duration**: 2-3 days

**Tasks:**
- [ ] Configure Supabase Storage buckets
- [ ] Set up image optimization and resizing
- [ ] Implement file upload policies and size limits
- [ ] Configure CDN for image delivery
- [ ] Test file upload/download workflows

**Deliverables:**
- Storage buckets configured with proper policies
- Image processing pipeline
- File management utilities

---

## **Phase 2: Authentication Migration (Week 3)**

### **2.1 Supabase Auth Integration**
**Duration**: 3-4 days

**Tasks:**
- [ ] Replace Lumi auth with Supabase Auth
- [ ] Update `useAuth` hook for Supabase
- [ ] Implement user registration flow
- [ ] Add email verification and password reset
- [ ] Test authentication flows

**Code Changes:**
```typescript
// New useAuth hook structure
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Supabase auth implementation
  // ...
}
```

### **2.2 User Profile Migration**
**Duration**: 2-3 days

**Tasks:**
- [ ] Update user profile creation logic
- [ ] Migrate existing user data (if any)
- [ ] Test profile CRUD operations
- [ ] Implement profile privacy controls

**Deliverables:**
- Updated authentication system
- User profile management
- Privacy controls implemented

---

## **Phase 3: Core Feature Migration (Weeks 4-5)**

### **3.1 Daily Check-ins Migration**
**Duration**: 4-5 days

**Tasks:**
- [ ] Replace Lumi entities with Supabase queries
- [ ] Update check-in form submission
- [ ] Implement MEPSS rating validation
- [ ] Add emoji and gratitude handling
- [ ] Test privacy controls

**Code Changes:**
```typescript
// Replace Lumi SDK calls
// OLD: await lumi.entities.daily_checkins.create(data)
// NEW: await supabase.from('daily_checkins').insert(data)
```

### **3.2 Community Feed Migration**
**Duration**: 3-4 days

**Tasks:**
- [ ] Update feed data fetching
- [ ] Implement real-time subscriptions
- [ ] Migrate interaction system (comments/reactions)
- [ ] Test feed privacy and filtering

### **3.3 Photo Albums Migration**
**Duration**: 3-4 days

**Tasks:**
- [ ] Update file upload to Supabase Storage
- [ ] Migrate album and photo management
- [ ] Implement image optimization
- [ ] Test privacy controls for photos

**Deliverables:**
- All core features working with Supabase
- Real-time functionality implemented
- File upload system operational

---

## **Phase 4: Design System Implementation (Week 6)**

### **4.1 Tailwind Configuration Update**
**Duration**: 1-2 days

**Tasks:**
- [ ] Update `tailwind.config.js` with new therapeutic color palette
- [ ] Replace existing color classes throughout codebase
- [ ] Update component styles to match design standards

### **4.2 Component Library Creation**
**Duration**: 3-4 days

**Tasks:**
- [ ] Create base UI components (Button, Card, Input, etc.)
- [ ] Implement accessibility features
- [ ] Update existing components to use new design system
- [ ] Create component documentation

**Deliverables:**
- New therapeutic design system implemented
- Accessible component library
- Updated visual design throughout app

---

## **Phase 5: Advanced Features & Polish (Week 7)**

### **5.1 Analytics Implementation**
**Duration**: 2-3 days

**Tasks:**
- [ ] Update analytics queries for Supabase
- [ ] Implement progress tracking
- [ ] Add data visualization improvements
- [ ] Test performance with larger datasets

### **5.2 Real-time Features**
**Duration**: 2-3 days

**Tasks:**
- [ ] Implement real-time feed updates
- [ ] Add live interaction notifications
- [ ] Test real-time performance
- [ ] Optimize subscription management

### **5.3 Performance Optimization**
**Duration**: 2-3 days

**Tasks:**
- [ ] Implement query optimization
- [ ] Add caching strategies
- [ ] Optimize image loading
- [ ] Performance testing and monitoring

**Deliverables:**
- Enhanced analytics and reporting
- Real-time community features
- Optimized performance

---

## **Phase 6: Testing & Deployment (Week 8)**

### **6.1 Comprehensive Testing**
**Duration**: 3-4 days

**Tasks:**
- [ ] Unit tests for all components
- [ ] Integration tests for API calls
- [ ] End-to-end testing scenarios
- [ ] Security penetration testing
- [ ] Accessibility testing

### **6.2 Production Deployment**
**Duration**: 2-3 days

**Tasks:**
- [ ] Set up CI/CD pipeline
- [ ] Configure production environment
- [ ] Deploy to production
- [ ] Monitor deployment and performance
- [ ] Create backup and recovery procedures

### **6.3 Documentation & Handoff**
**Duration**: 1-2 days

**Tasks:**
- [ ] Complete technical documentation
- [ ] Create user guides and admin documentation
- [ ] Prepare for user testing
- [ ] Knowledge transfer sessions

**Deliverables:**
- Production-ready application
- Complete test coverage
- Deployment pipeline
- Comprehensive documentation

---

## 🛠 Technical Implementation Details

### **Environment Setup**
```bash
# Development environment
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ENVIRONMENT=development

# Production environment
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_ENVIRONMENT=production
```

### **Key Dependencies to Add**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-react": "^0.4.2",
    "@supabase/auth-helpers-nextjs": "^0.8.7"
  }
}
```

### **Supabase Client Setup**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

---

## 💰 Budget Breakdown

### **Infrastructure Costs (Monthly)**
- **Supabase Pro**: $25/month (includes auth, database, storage)
- **Domain & SSL**: $15/year
- **Monitoring Tools**: $20/month
- **Backup Storage**: $10/month
- **Total Monthly**: ~$55

### **Development Tools**
- **Design Tools**: $20/month (Figma Pro)
- **Testing Tools**: $50/month (Cypress, testing services)
- **CI/CD**: $0 (GitHub Actions free tier)

### **One-time Costs**
- **Security Audit**: $500-1000
- **Performance Testing**: $200-500
- **Documentation**: $300-500

**Total First Year**: ~$2,000-3,000

---

## 🎯 Success Metrics

### **Technical Metrics**
- [ ] 100% feature parity with current Lumi implementation
- [ ] <2s page load times
- [ ] 99.9% uptime
- [ ] WCAG AA accessibility compliance
- [ ] Zero critical security vulnerabilities

### **User Experience Metrics**
- [ ] Improved user satisfaction scores
- [ ] Reduced support tickets
- [ ] Increased daily active users
- [ ] Higher check-in completion rates

### **Business Metrics**
- [ ] 50% reduction in backend costs
- [ ] Full control over data and infrastructure
- [ ] Ability to implement custom features
- [ ] HIPAA compliance readiness

---

## 🚨 Risk Mitigation

### **Technical Risks**
- **Data Migration**: Comprehensive backup and rollback procedures
- **Performance Issues**: Load testing and optimization strategies
- **Security Vulnerabilities**: Regular security audits and penetration testing

### **Timeline Risks**
- **Scope Creep**: Strict change management process
- **Technical Blockers**: Buffer time built into each phase
- **Resource Constraints**: Clear prioritization and MVP focus

### **Business Risks**
- **User Disruption**: Phased rollout with feature flags
- **Data Loss**: Multiple backup strategies and testing
- **Compliance Issues**: Legal review of privacy and security measures

---

## 📋 Next Steps

### **Immediate Actions (This Week)**
1. [ ] Create Supabase account and initial project
2. [ ] Set up development environment
3. [ ] Begin database schema implementation
4. [ ] Start updating package.json dependencies

### **Week 1 Priorities**
1. [ ] Complete Supabase project setup
2. [ ] Deploy database schema to development
3. [ ] Begin authentication migration
4. [ ] Set up basic CI/CD pipeline

### **Success Criteria for Phase 1**
- [ ] Supabase backend fully configured
- [ ] Database schema deployed and tested
- [ ] Authentication working in development
- [ ] File storage operational

---

## 🔧 Implementation Code Examples

### **Updated useAuth Hook**
```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email: string
  user_metadata: {
    display_name?: string
    avatar_url?: string
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ? transformUser(session.user) : null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ? transformUser(session.user) : null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const transformUser = (user: User): AuthUser => ({
    id: user.id,
    email: user.email!,
    user_metadata: user.user_metadata
  })

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut
  }
}
```

### **Daily Check-in Migration Example**
```typescript
// src/services/checkinService.ts
import { supabase } from '../lib/supabase'

export interface CheckinData {
  mental_rating: number
  emotional_rating: number
  physical_rating: number
  social_rating: number
  spiritual_rating: number
  mental_notes?: string
  emotional_notes?: string
  physical_notes?: string
  social_notes?: string
  spiritual_notes?: string
  mental_emojis?: string[]
  emotional_emojis?: string[]
  physical_emojis?: string[]
  social_emojis?: string[]
  spiritual_emojis?: string[]
  gratitude?: string[]
  is_private: boolean
  mood_emoji: string
}

export class CheckinService {
  static async createCheckin(data: CheckinData) {
    const { data: checkin, error } = await supabase
      .from('daily_checkins')
      .insert({
        ...data,
        checkin_date: new Date().toISOString().split('T')[0],
        user_id: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) throw error
    return checkin
  }

  static async updateCheckin(id: string, data: Partial<CheckinData>) {
    const { data: checkin, error } = await supabase
      .from('daily_checkins')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return checkin
  }

  static async getTodaysCheckin() {
    const today = new Date().toISOString().split('T')[0]
    const { data: checkin, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('checkin_date', today)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .maybeSingle()

    if (error) throw error
    return checkin
  }

  static async getPublicCheckins(limit = 20) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()

    const { data: checkins, error } = await supabase
      .from('daily_checkins')
      .select(`
        *,
        user_profiles!inner(
          display_name,
          avatar_url,
          is_public
        )
      `)
      .eq('is_private', false)
      .eq('user_profiles.is_public', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return checkins
  }
}
```

### **File Upload Service**
```typescript
// src/services/fileService.ts
import { supabase } from '../lib/supabase'

export class FileService {
  static async uploadPhoto(file: File, bucket = 'photos'): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${bucket}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  static async deletePhoto(url: string, bucket = 'photos') {
    const path = url.split('/').pop()
    if (!path) throw new Error('Invalid file URL')

    const { error } = await supabase.storage
      .from(bucket)
      .remove([`${bucket}/${path}`])

    if (error) throw error
  }
}
```

### **Real-time Subscriptions**
```typescript
// src/hooks/useRealtimeFeed.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeFeed() {
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    fetchPublicCheckins()

    // Set up real-time subscription
    const subscription = supabase
      .channel('public-checkins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_checkins',
          filter: 'is_private=eq.false'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCheckins(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setCheckins(prev =>
              prev.map(checkin =>
                checkin.id === payload.new.id ? payload.new : checkin
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setCheckins(prev =>
              prev.filter(checkin => checkin.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchPublicCheckins = async () => {
    // Implementation here
    setLoading(false)
  }

  return { checkins, loading }
}
```

---

*This comprehensive migration plan provides everything needed to transform Sangha from a Lumi SDK-dependent application to a fully self-hosted, production-ready addiction recovery platform using Supabase, complete with the new therapeutic design system and HIPAA-level security.*
