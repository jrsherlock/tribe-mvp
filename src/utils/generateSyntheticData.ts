
import { lumi } from '../lib/lumi';

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
    console.log('🔍 Testing SDK connection...');
    
    // Test collection access
    const testCollection = lumi.collection('daily_checkins');
    if (!testCollection) {
      console.error('❌ Cannot access daily_checkins collection');
      return false;
    }
    
    console.log('✅ SDK connection test successful');
    return true;
  } catch (error) {
    console.error('❌ SDK connection failed:', error);
    return false;
  }
}

// Get user check-in count
export async function getUserCheckinCount(userId: string): Promise<number> {
  try {
    const count = await lumi.collection('daily_checkins').count({
      user_id: userId
    });
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
    
    // Get all user check-ins
    const userCheckins = await lumi.collection('daily_checkins').find({
      user_id: userId
    });

    if (!userCheckins || userCheckins.length === 0) {
      console.log('No check-ins found to delete');
      return { deleted: 0, errors: 0 };
    }

    let deleted = 0;
    let errors = 0;

    // Delete each record
    for (const checkin of userCheckins) {
      try {
        await lumi.collection('daily_checkins').delete(checkin._id);
        deleted++;
      } catch (deleteError) {
        console.error(`Error deleting record ${checkin._id}:`, deleteError);
        errors++;
      }
    }

    console.log(`✅ Deletion complete: ${deleted} deleted, ${errors} errors`);
    return { deleted, errors };
  } catch (error) {
    console.error('Error deleting user check-ins:', error);
    throw error;
  }
}

// Create a single check-in record
export async function createCheckinRecord(checkinData: any): Promise<any> {
  try {
    return await lumi.collection('daily_checkins').create(checkinData);
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
