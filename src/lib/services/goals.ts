import { supabase } from '../supabase'

/**
 * Goal frequency types
 */
export type GoalFrequency = 'daily' | 'weekly' | 'monthly'

/**
 * User Goal interface
 */
export interface UserGoal {
  id: string
  user_id: string
  tenant_id: string | null
  goal_key: string
  title: string
  description: string | null
  frequency: GoalFrequency
  target_count: number
  is_public: boolean
  created_at: string
  updated_at: string
}

/**
 * Goal Progress interface
 */
export interface GoalProgress {
  id: string
  goal_id: string
  user_id: string
  logged_at: string
  note?: string | null
  created_at: string
}

/**
 * Get all goals for the current user
 */
export async function listUserGoals() {
  return supabase
    .from('user_goals')
    .select('*')
    .order('created_at', { ascending: false })
}

/**
 * Get a specific goal by ID
 */
export async function getGoal(goalId: string) {
  return supabase
    .from('user_goals')
    .select('*')
    .eq('id', goalId)
    .single()
}

/**
 * Get a specific goal by key
 */
export async function getGoalByKey(goalKey: string) {
  return supabase
    .from('user_goals')
    .select('*')
    .eq('goal_key', goalKey)
    .single()
}

/**
 * Create a new goal
 */
export async function createGoal(params: {
  goal_key: string
  title: string
  description?: string
  frequency?: GoalFrequency
  target_count?: number
  is_public?: boolean
  tenant_id?: string | null
}) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  return supabase
    .from('user_goals')
    .insert({
      user_id: session.session.user.id,
      tenant_id: params.tenant_id || null,
      goal_key: params.goal_key,
      title: params.title,
      description: params.description || null,
      frequency: params.frequency || 'daily',
      target_count: params.target_count || 1,
      is_public: params.is_public || false,
    })
    .select()
    .single()
}

/**
 * Update an existing goal
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<Pick<UserGoal, 'title' | 'description' | 'frequency' | 'target_count' | 'is_public'>>
) {
  return supabase
    .from('user_goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single()
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string) {
  return supabase
    .from('user_goals')
    .delete()
    .eq('id', goalId)
}

/**
 * Get all progress entries for a specific goal
 */
export async function getGoalProgress(goalId: string) {
  return supabase
    .from('goal_progress')
    .select('*')
    .eq('goal_id', goalId)
    .order('logged_at', { ascending: false })
}

/**
 * Log progress for a goal using the RPC function
 * This is the recommended way to log progress as it handles
 * duplicate detection and validation
 */
export async function triggerGoalProgress(goalKey: string) {
  const { data, error } = await supabase.rpc('log_goal_progress', {
    p_goal_key: goalKey,
  })

  if (error) {
    console.error('Error logging goal progress:', error)
    throw error
  }

  return { data, error: null }
}

/**
 * Create a progress entry for a goal
 * Can optionally include a note and custom timestamp
 */
export async function createGoalProgress(
  goal_id: string,
  options?: {
    logged_at?: string
    note?: string
  }
) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  const insertData: any = {
    goal_id,
    user_id: session.session.user.id,
    logged_at: options?.logged_at || new Date().toISOString(),
  }

  // Only include note if provided
  if (options?.note) {
    insertData.note = options.note
  }

  return supabase
    .from('goal_progress')
    .insert(insertData)
    .select()
    .single()
}

/**
 * Update a progress entry (e.g., edit note)
 */
export async function updateGoalProgress(
  progressId: string,
  updates: {
    note?: string
  }
) {
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) throw new Error('Not authenticated')

  return supabase
    .from('goal_progress')
    .update(updates)
    .eq('id', progressId)
    .eq('user_id', session.session.user.id) // Ensure user can only update their own progress
    .select()
    .single()
}

/**
 * Delete a progress entry (for corrections)
 */
export async function deleteGoalProgress(progressId: string) {
  return supabase
    .from('goal_progress')
    .delete()
    .eq('id', progressId)
}

