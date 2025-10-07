import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Users, Building2, RefreshCw, Wrench, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getAdminClient } from '../../lib/admin-client'
import toast from 'react-hot-toast'

interface DataViolation {
  user_id: string
  group_id: string
  group_role: string
  group_name: string
  group_facility_id: string
  user_facility_id: string | null
  violation_type: 'NO_FACILITY' | 'WRONG_FACILITY' | 'OK'
  user_email?: string
  user_display_name?: string
  facility_name?: string
}

interface DiagnosticStats {
  total_users: number
  total_groups: number
  total_facilities: number
  violations_count: number
  no_facility_count: number
  wrong_facility_count: number
}

const DataIntegrityDiagnostic: React.FC = () => {
  const [violations, setViolations] = useState<DataViolation[]>([])
  const [stats, setStats] = useState<DiagnosticStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    fetchDiagnostics()
  }, [])

  const fetchDiagnostics = async () => {
    try {
      setLoading(true)

      // Query for data integrity violations
      const { data: violationsData, error: violationsError } = await supabase.rpc('check_data_integrity', {})
        .catch(async () => {
          // Fallback: manual query if RPC doesn't exist
          const { data, error } = await supabase
            .from('group_memberships')
            .select(`
              user_id,
              group_id,
              role,
              groups!inner (
                id,
                name,
                tenant_id
              )
            `)

          if (error) throw error

          // Get tenant_members for all users
          const userIds = data?.map((v: any) => v.user_id) || []
          const { data: tenantMembers } = await supabase
            .from('tenant_members')
            .select('user_id, tenant_id')
            .in('user_id', userIds)

          const tenantMemberMap = new Map(
            tenantMembers?.map((tm: any) => [tm.user_id, tm.tenant_id]) || []
          )

          // Find violations
          const violations = data?.filter((v: any) => {
            const userTenantId = tenantMemberMap.get(v.user_id)
            const groupTenantId = v.groups.tenant_id
            return !userTenantId || userTenantId !== groupTenantId
          }).map((v: any) => ({
            user_id: v.user_id,
            group_id: v.group_id,
            group_role: v.role,
            group_name: v.groups.name,
            group_facility_id: v.groups.tenant_id,
            user_facility_id: tenantMemberMap.get(v.user_id) || null,
            violation_type: !tenantMemberMap.get(v.user_id) ? 'NO_FACILITY' : 'WRONG_FACILITY'
          })) || []

          return { data: violations, error: null }
        })

      if (violationsError) throw violationsError

      // Enrich with user and facility data
      if (violationsData && violationsData.length > 0) {
        const userIds = [...new Set(violationsData.map((v: any) => v.user_id))]
        const facilityIds = [...new Set(violationsData.map((v: any) => v.group_facility_id).filter(Boolean))]

        // Fetch user profiles
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', userIds)

        // Fetch user emails from auth.users (requires admin client)
        const adminClient = getAdminClient()
        const emails = new Map<string, string>()
        if (adminClient) {
          for (const userId of userIds) {
            const { data: { user } } = await adminClient.auth.admin.getUserById(userId)
            if (user?.email) {
              emails.set(userId, user.email)
            }
          }
        }

        // Fetch facility names
        const { data: facilities } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', facilityIds)

        const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || [])
        const facilityMap = new Map(facilities?.map((f: any) => [f.id, f.name]) || [])

        const enrichedViolations = violationsData.map((v: any) => ({
          ...v,
          user_email: emails.get(v.user_id),
          user_display_name: profileMap.get(v.user_id),
          facility_name: facilityMap.get(v.group_facility_id)
        }))

        setViolations(enrichedViolations)
      } else {
        setViolations([])
      }

      // Calculate stats
      const { data: groupsCount } = await supabase
        .from('groups')
        .select('id', { count: 'exact', head: true })

      const { data: usersCount } = await supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true })

      const { data: facilitiesCount } = await supabase
        .from('tenants')
        .select('id', { count: 'exact', head: true })

      setStats({
        total_users: usersCount?.length || 0,
        total_groups: groupsCount?.length || 0,
        total_facilities: facilitiesCount?.length || 0,
        violations_count: violationsData?.length || 0,
        no_facility_count: violationsData?.filter((v: any) => v.violation_type === 'NO_FACILITY').length || 0,
        wrong_facility_count: violationsData?.filter((v: any) => v.violation_type === 'WRONG_FACILITY').length || 0
      })

    } catch (error: any) {
      console.error('Failed to fetch diagnostics:', error)
      toast.error('Failed to load data integrity diagnostics')
    } finally {
      setLoading(false)
    }
  }

  const handleFixViolation = async (violation: DataViolation) => {
    try {
      setFixing(true)
      const adminClient = getAdminClient()
      if (!adminClient) {
        throw new Error('Admin access required')
      }

      // Option 1: Assign user to the facility that owns the group
      const { error: assignError } = await adminClient
        .from('tenant_members')
        .upsert({
          user_id: violation.user_id,
          tenant_id: violation.group_facility_id,
          role: 'MEMBER'
        }, {
          onConflict: 'user_id,tenant_id'
        })

      if (assignError) throw assignError

      toast.success(`Assigned user to facility: ${violation.facility_name}`)
      await fetchDiagnostics() // Refresh
    } catch (error: any) {
      console.error('Failed to fix violation:', error)
      toast.error(error.message || 'Failed to fix violation')
    } finally {
      setFixing(false)
    }
  }

  const handleRemoveFromGroup = async (violation: DataViolation) => {
    try {
      setFixing(true)
      const adminClient = getAdminClient()
      if (!adminClient) {
        throw new Error('Admin access required')
      }

      // Remove user from group
      const { error } = await adminClient
        .from('group_memberships')
        .delete()
        .eq('user_id', violation.user_id)
        .eq('group_id', violation.group_id)

      if (error) throw error

      toast.success(`Removed user from group: ${violation.group_name}`)
      await fetchDiagnostics() // Refresh
    } catch (error: any) {
      console.error('Failed to remove from group:', error)
      toast.error(error.message || 'Failed to remove from group')
    } finally {
      setFixing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Integrity Diagnostic</h2>
          <p className="text-sm text-gray-600 mt-1">
            Identifies users in groups without proper facility assignment
          </p>
        </div>
        <button
          onClick={fetchDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-700 font-medium">Facilities</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total_facilities}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-green-700 font-medium">Groups</p>
                <p className="text-2xl font-bold text-green-900">{stats.total_groups}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-700 font-medium">Total Users</p>
                <p className="text-2xl font-bold text-purple-900">{stats.total_users}</p>
              </div>
            </div>
          </div>

          <div className={`${stats.violations_count > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              {stats.violations_count > 0 ? (
                <AlertTriangle className="w-8 h-8 text-red-600" />
              ) : (
                <CheckCircle className="w-8 h-8 text-green-600" />
              )}
              <div>
                <p className={`text-sm font-medium ${stats.violations_count > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Violations
                </p>
                <p className={`text-2xl font-bold ${stats.violations_count > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {stats.violations_count}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Multi-Tenant Architecture Rule</p>
            <p>Users must be assigned to a <strong>facility first</strong> before they can join groups within that facility.</p>
            <p className="mt-1">Hierarchy: <code className="bg-blue-100 px-1 rounded">Facilities → Groups → Users</code></p>
          </div>
        </div>
      </div>

      {/* Violations List */}
      {violations.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">No Data Integrity Issues Found!</h3>
          <p className="text-green-700">All users in groups are properly assigned to facilities.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Found {violations.length} Violation{violations.length > 1 ? 's' : ''}
          </h3>

          {violations.map((violation, index) => (
            <motion.div
              key={`${violation.user_id}-${violation.group_id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">
                      {violation.violation_type === 'NO_FACILITY' ? 'User Not Assigned to Facility' : 'Wrong Facility'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">User</p>
                      <p className="font-medium text-gray-900">
                        {violation.user_display_name || violation.user_email || violation.user_id.substring(0, 8)}
                      </p>
                      {violation.user_email && (
                        <p className="text-xs text-gray-500">{violation.user_email}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-600">Group</p>
                      <p className="font-medium text-gray-900">{violation.group_name}</p>
                      <p className="text-xs text-gray-500">Role: {violation.group_role}</p>
                    </div>

                    <div>
                      <p className="text-gray-600">Group's Facility</p>
                      <p className="font-medium text-gray-900">{violation.facility_name || 'Unknown'}</p>
                    </div>

                    <div>
                      <p className="text-gray-600">User's Facility</p>
                      <p className="font-medium text-gray-900">
                        {violation.user_facility_id ? 'Different Facility' : 'None (Solo User)'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleFixViolation(violation)}
                    disabled={fixing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Wrench className="w-4 h-4" />
                    Assign to Facility
                  </button>

                  <button
                    onClick={() => handleRemoveFromGroup(violation)}
                    disabled={fixing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Remove from Group
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DataIntegrityDiagnostic

