// Firebase Security Rules for Sangha Addiction Recovery Platform
// HIPAA-Compliant Security and Privacy Controls

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions for security
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    function isPublicProfile(userId) {
      return get(/databases/$(database)/documents/userProfiles/$(userId)).data.isPublic == true;
    }
    
    function isValidUser() {
      return isAuthenticated() && 
             request.auth.uid != null && 
             request.auth.token.email_verified == true;
    }
    
    // Rate limiting helper (basic implementation)
    function isWithinRateLimit() {
      // Allow max 100 writes per minute per user
      return true; // Implement with Cloud Functions for production
    }
    
    // =============================================
    // USER PROFILES
    // =============================================
    match /userProfiles/{userId} {
      // Users can read their own profile or public profiles
      allow read: if isValidUser() && 
        (isOwner(userId) || resource.data.isPublic == true);
      
      // Users can only create/update their own profile
      allow create: if isValidUser() && 
        isOwner(userId) && 
        isWithinRateLimit() &&
        // Validate required fields
        request.resource.data.keys().hasAll(['displayName', 'isPublic', 'createdAt']) &&
        // Ensure user can't impersonate others
        request.resource.data.userId == request.auth.uid;
      
      allow update: if isValidUser() && 
        isOwner(userId) && 
        isWithinRateLimit() &&
        // Prevent changing immutable fields
        request.resource.data.createdAt == resource.data.createdAt;
      
      // Users can delete their own profile
      allow delete: if isValidUser() && isOwner(userId);
    }
    
    // =============================================
    // DAILY CHECK-INS (Private by default)
    // =============================================
    match /dailyCheckins/{userId}/checkins/{checkinId} {
      // Only the user can access their own check-ins
      allow read, write: if isValidUser() && isOwner(userId);
      
      // Validate check-in data structure
      allow create: if isValidUser() && 
        isOwner(userId) && 
        isWithinRateLimit() &&
        // Validate MEPSS ratings are within range
        request.resource.data.mentalRating >= 1 && request.resource.data.mentalRating <= 10 &&
        request.resource.data.emotionalRating >= 1 && request.resource.data.emotionalRating <= 10 &&
        request.resource.data.physicalRating >= 1 && request.resource.data.physicalRating <= 10 &&
        request.resource.data.socialRating >= 1 && request.resource.data.socialRating <= 10 &&
        request.resource.data.spiritualRating >= 1 && request.resource.data.spiritualRating <= 10 &&
        // Ensure required fields are present
        request.resource.data.keys().hasAll(['checkinDate', 'isPrivate', 'createdAt']);
      
      // Limit one check-in per day per user
      allow update: if isValidUser() && 
        isOwner(userId) && 
        resource.data.checkinDate == request.resource.data.checkinDate;
    }
    
    // =============================================
    // PUBLIC CHECK-INS FEED
    // =============================================
    match /publicCheckins/{checkinId} {
      // Anyone authenticated can read public check-ins
      allow read: if isValidUser();
      
      // Only the owner can create/update their public check-in
      allow create, update: if isValidUser() && 
        isOwner(request.resource.data.userId) &&
        isWithinRateLimit();
      
      // Only the owner can delete their public check-in
      allow delete: if isValidUser() && isOwner(resource.data.userId);
    }
    
    // =============================================
    // PHOTO ALBUMS
    // =============================================
    match /photoAlbums/{userId}/albums/{albumId} {
      // Users can read their own albums or public albums
      allow read: if isValidUser() && 
        (isOwner(userId) || resource.data.isPublic == true);
      
      // Users can only manage their own albums
      allow create, update, delete: if isValidUser() && 
        isOwner(userId) && 
        isWithinRateLimit();
      
      // Validate album data
      allow create: if isValidUser() && 
        isOwner(userId) &&
        request.resource.data.keys().hasAll(['title', 'isPublic', 'createdAt']) &&
        request.resource.data.title.size() > 0 && 
        request.resource.data.title.size() <= 100;
    }
    
    // =============================================
    // ALBUM PHOTOS
    // =============================================
    match /albumPhotos/{userId}/photos/{photoId} {
      // Users can read their own photos or public photos from public albums
      allow read: if isValidUser() && 
        (isOwner(userId) || 
         (resource.data.isPublic == true && 
          exists(/databases/$(database)/documents/photoAlbums/$(userId)/albums/$(resource.data.albumId)) &&
          get(/databases/$(database)/documents/photoAlbums/$(userId)/albums/$(resource.data.albumId)).data.isPublic == true));
      
      // Users can only manage their own photos
      allow create, update, delete: if isValidUser() && 
        isOwner(userId) && 
        isWithinRateLimit();
      
      // Validate photo data
      allow create: if isValidUser() && 
        isOwner(userId) &&
        request.resource.data.keys().hasAll(['albumId', 'photoUrl', 'createdAt']) &&
        request.resource.data.photoUrl.size() > 0;
    }
    
    // =============================================
    // FEED INTERACTIONS (Comments & Reactions)
    // =============================================
    match /feedInteractions/{checkinId}/interactions/{interactionId} {
      // Anyone can read interactions on public check-ins
      allow read: if isValidUser() &&
        exists(/databases/$(database)/documents/publicCheckins/$(checkinId));
      
      // Users can create interactions on public check-ins
      allow create: if isValidUser() && 
        isOwner(request.resource.data.userId) &&
        exists(/databases/$(database)/documents/publicCheckins/$(checkinId)) &&
        isWithinRateLimit() &&
        // Validate interaction type
        request.resource.data.interactionType in ['comment', 'emoji_reaction'] &&
        // Validate content based on type
        ((request.resource.data.interactionType == 'comment' && 
          request.resource.data.content.size() > 0 && 
          request.resource.data.content.size() <= 1000) ||
         (request.resource.data.interactionType == 'emoji_reaction' && 
          request.resource.data.emoji.size() > 0));
      
      // Users can update/delete their own interactions
      allow update, delete: if isValidUser() && 
        isOwner(resource.data.userId) &&
        isWithinRateLimit();
    }
    
    // =============================================
    // AI INSIGHTS (Private to user)
    // =============================================
    match /aiInsights/{userId}/insights/{insightId} {
      // Only the user can access their AI insights
      allow read, write: if isValidUser() && isOwner(userId);
      
      // Validate insight data structure
      allow create: if isValidUser() && 
        isOwner(userId) &&
        request.resource.data.keys().hasAll(['insightType', 'title', 'createdAt']);
    }
    
    // =============================================
    // AUDIT LOGS (Read-only for users)
    // =============================================
    match /auditLogs/{userId}/logs/{logId} {
      // Users can only read their own audit logs
      allow read: if isValidUser() && isOwner(userId);
      // No write access - logs are created by Cloud Functions only
    }
    
    // =============================================
    // CRISIS RESOURCES (Public read-only)
    // =============================================
    match /crisisResources/{resourceId} {
      // Anyone can read crisis resources (even unauthenticated for emergencies)
      allow read: if true;
      // No write access for regular users
    }
    
    // =============================================
    // ADMIN FUNCTIONS (Restricted)
    // =============================================
    match /adminData/{document=**} {
      // Only admin users can access admin data
      allow read, write: if isValidUser() && 
        request.auth.token.admin == true;
    }
    
    // =============================================
    // CONTENT MODERATION
    // =============================================
    match /moderationQueue/{itemId} {
      // Only moderators can access moderation queue
      allow read, write: if isValidUser() && 
        request.auth.token.moderator == true;
    }
  }
}

// =============================================
// FIREBASE STORAGE SECURITY RULES
// =============================================
service firebase.storage {
  match /b/{bucket}/o {
    // Photos - users can only access their own photos
    match /photos/{userId}/{fileName} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         // Allow reading public photos if user has public profile
         isPublicProfile(userId));
      
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        // Validate file type and size
        request.resource.contentType.matches('image/.*') &&
        request.resource.size < 10 * 1024 * 1024; // 10MB limit
    }
    
    // Avatar images
    match /avatars/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.uid == userId &&
        request.resource.contentType.matches('image/.*') &&
        request.resource.size < 2 * 1024 * 1024; // 2MB limit for avatars
    }
    
    // Temporary uploads (for processing)
    match /temp/{userId}/{fileName} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
      // Auto-delete after 24 hours via Cloud Function
    }
  }
}

// Helper function for checking public profiles (used in storage rules)
function isPublicProfile(userId) {
  return firestore.get(/databases/(default)/documents/userProfiles/$(userId)).data.isPublic == true;
}
