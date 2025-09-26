
import { supabase } from '../lib/supabase';

// Export utility functions that can be used by other components
export const getRandomElement = <T,>(array: T[]): T => 
  array[Math.floor(Math.random() * array.length)];

export const getRandomElements = <T,>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const generateScore = (baseScore: number, variance: number = 2): number => {
  const score = baseScore + (Math.random() - 0.5) * variance * 2;
  return Math.max(1, Math.min(10, Math.round(score)));
};

// Test SDK connection
export async function testSDKConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Supabase connection...');
    const { error } = await supabase.from('daily_checkins').select('id').limit(1)
    if (error) throw error
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return false;
  }
}

// Get user check-in count
export async function getUserCheckinCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('daily_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (error) throw error
    return count || 0;
  } catch (error) {
    console.error('Error getting user checkin count:', error);
    return 0;
  }
}

// Delete all user check-ins
export async function deleteAllUserCheckins(userId: string): Promise<{ deleted: number; errors: number }> {
  try {
    console.log(`🧹 Deleting all check-ins for user: ${userId}`);
    const { error, count } = await supabase
      .from('daily_checkins')
      .delete({ count: 'exact' })
      .eq('user_id', userId)
    if (error) throw error
    console.log(`✅ Deletion complete: ${count || 0} deleted`);
    return { deleted: count || 0, errors: 0 };
  } catch (error) {
    console.error('Error deleting user check-ins:', error);
    throw error;
  }
}

// Create a single check-in record
export async function createCheckinRecord(checkinData: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('daily_checkins').insert(checkinData).select().single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating check-in record:', error);
    throw error;
  }
}

// Legacy functions for backward compatibility (deprecated)
export async function generateSyntheticData(): Promise<void> {
  console.warn('⚠️ generateSyntheticData() is deprecated. Use the Data Generator component instead.');
  throw new Error('This function is deprecated. Please use the Data Generator UI component.');
}

export async function clearUserData(userId: string): Promise<void> {
  console.warn('⚠️ clearUserData() is deprecated. Use deleteAllUserCheckins() instead.');
  await deleteAllUserCheckins(userId);
}

export async function diagnoseEntitySchema(): Promise<void> {
  console.warn('⚠️ diagnoseEntitySchema() is deprecated. Use testSDKConnection() instead.');
  await testSDKConnection();
}
