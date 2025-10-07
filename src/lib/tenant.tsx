import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

export type Membership = { user_id: string; tenant_id: string; role: 'OWNER'|'ADMIN'|'MEMBER' }

type TenantContextType = {
  currentTenantId: string | null
  currentTenantName: string | null
  setCurrentTenantId: (id: string | null) => void
  memberships: Membership[]
  loading: boolean
}

const TenantContext = createContext<TenantContextType>({
  currentTenantId: null,
  currentTenantName: null,
  setCurrentTenantId: () => {},
  memberships: [],
  loading: true,
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null)
  const [currentTenantName, setCurrentTenantName] = useState<string | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let inFlight = false
    async function load() {
      if (inFlight) return
      inFlight = true
      setLoading(true)
      const { data: sessionRes } = await supabase.auth.getSession()
      if (!sessionRes.session) {
        if (isMounted) {
          setMemberships([])
          setCurrentTenantId(null)
          setCurrentTenantName(null)
          setLoading(false)
        }
        inFlight = false
        return
      }
      const { data, error } = await supabase.from('tenant_members').select('*')
      if (!isMounted) { inFlight = false; return }
      if (error) {
        console.error('Load tenant_members error:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setMemberships([])
        setCurrentTenantId(null)
        setCurrentTenantName(null)
      } else {
        setMemberships((data ?? []) as Membership[])
        // auto-select first membership if exactly one
        if ((data ?? []).length === 1) {
          const tenantId = (data![0] as any).tenant_id
          setCurrentTenantId(tenantId)
          // Fetch tenant name
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', tenantId)
            .single()
          if (tenantData && isMounted) {
            setCurrentTenantName(tenantData.name)
          }
        }
      }
      setLoading(false)
      inFlight = false
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => load())
    return () => { isMounted = false; sub.subscription.unsubscribe() }
  }, [])

  // Fetch tenant name when currentTenantId changes
  useEffect(() => {
    if (currentTenantId) {
      supabase
        .from('tenants')
        .select('name')
        .eq('id', currentTenantId)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentTenantName(data.name)
          }
        })
    } else {
      setCurrentTenantName(null)
    }
  }, [currentTenantId])

  const value = useMemo(() => ({ currentTenantId, currentTenantName, setCurrentTenantId, memberships, loading }), [currentTenantId, currentTenantName, memberships, loading])
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  return useContext(TenantContext)
}

