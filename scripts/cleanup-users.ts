/**
 * Script to delete all users from Supabase except jrsherlock@gmail.com
 * 
 * This script:
 * 1. Lists all users from auth.users
 * 2. Filters out jrsherlock@gmail.com
 * 3. Deletes all other users using the admin API
 * 4. Associated data cascades automatically (user_profiles, daily_checkins, etc.)
 * 
 * Usage:
 *   npx tsx scripts/cleanup-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import * as readline from 'readline'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const PRESERVE_EMAIL = 'jrsherlock@gmail.com'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables')
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupUsers() {
  console.log('🔍 Fetching all users from database...\n')

  try {
    // List all users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }

    console.log(`📊 Found ${users.length} total users\n`)

    // Find the user to preserve
    const preserveUser = users.find(u => u.email === PRESERVE_EMAIL)
    
    if (!preserveUser) {
      console.error(`❌ Error: User ${PRESERVE_EMAIL} not found in database!`)
      console.log('\nAvailable users:')
      users.forEach(u => console.log(`  - ${u.email} (${u.id})`))
      process.exit(1)
    }

    console.log(`✅ Found user to preserve: ${PRESERVE_EMAIL} (${preserveUser.id})\n`)

    // Filter users to delete
    const usersToDelete = users.filter(u => u.email !== PRESERVE_EMAIL)

    if (usersToDelete.length === 0) {
      console.log('✨ No users to delete. Database is already clean!')
      return
    }

    console.log(`🗑️  Users to delete (${usersToDelete.length}):\n`)
    usersToDelete.forEach(u => {
      console.log(`  - ${u.email || 'No email'} (${u.id})`)
    })

    console.log('\n⚠️  WARNING: This action cannot be undone!')
    console.log('   All associated data will be permanently deleted:')
    console.log('   - user_profiles')
    console.log('   - daily_checkins')
    console.log('   - tenant_members')
    console.log('   - group_memberships')
    console.log('   - photo_albums')
    console.log('   - feed_interactions')
    console.log('   - and all other related data\n')

    // Prompt for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const confirmed = await new Promise<boolean>((resolve) => {
      rl.question('Type "DELETE" to confirm: ', (answer: string) => {
        rl.close()
        resolve(answer.trim() === 'DELETE')
      })
    })

    if (!confirmed) {
      console.log('\n❌ Deletion cancelled by user')
      return
    }

    console.log('\n🚀 Starting deletion process...\n')

    let successCount = 0
    let errorCount = 0

    for (const user of usersToDelete) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        
        if (deleteError) {
          console.error(`  ❌ Failed to delete ${user.email}: ${deleteError.message}`)
          errorCount++
        } else {
          console.log(`  ✅ Deleted ${user.email || 'No email'} (${user.id})`)
          successCount++
        }
      } catch (err) {
        console.error(`  ❌ Error deleting ${user.email}:`, err)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Deletion Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Successfully deleted: ${successCount} users`)
    console.log(`❌ Failed to delete: ${errorCount} users`)
    console.log(`🔒 Preserved: ${PRESERVE_EMAIL}`)
    console.log('='.repeat(60) + '\n')

    if (errorCount === 0) {
      console.log('✨ Database cleanup completed successfully!')
    } else {
      console.log('⚠️  Database cleanup completed with errors. Check the log above.')
    }

  } catch (err) {
    console.error('\n❌ Fatal error during cleanup:', err)
    process.exit(1)
  }
}

// Run the cleanup
cleanupUsers()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\n❌ Script failed:', err)
    process.exit(1)
  })

