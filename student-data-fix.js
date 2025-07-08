// Student Data Fix Script
// This script helps diagnose and potentially fix student data issues
// Copy and paste this into the browser console

console.log("=== STUDENT DATA FIX SCRIPT ===");

async function fixStudentData() {
  const currentUser = firebase?.auth?.currentUser;
  
  if (!currentUser) {
    console.error("❌ No authenticated user found");
    return;
  }
  
  console.log("✅ Authenticated user:", currentUser.email, currentUser.uid);
  
  try {
    // Check if student document exists by UID
    const studentByUID = await db.collection('students').doc(currentUser.uid).get();
    
    if (studentByUID.exists) {
      console.log("✅ Student document exists by UID - no fix needed");
      console.log("Document data:", studentByUID.data());
      return;
    }
    
    console.log("❌ Student document not found by UID, searching by email...");
    
    // Search by email
    const emailQuery = await db.collection('students').where('email', '==', currentUser.email).get();
    
    if (!emailQuery.empty) {
      const existingDoc = emailQuery.docs[0];
      const existingData = existingDoc.data();
      
      console.log("✅ Found student document by email:");
      console.log("Existing document ID:", existingDoc.id);
      console.log("Existing data:", existingData);
      
      // Option 1: Copy data to UID-based document
      console.log("🔧 Copying student data to UID-based document...");
      
      await db.collection('students').doc(currentUser.uid).set({
        ...existingData,
        // Ensure we have the UID as a reference
        originalDocId: existingDoc.id,
        updatedAt: new Date()
      });
      
      console.log("✅ Successfully copied student data to UID-based document");
      
      // Note: We're not deleting the original document to be safe
      console.log("ℹ️ Original document preserved for safety");
      
      return;
    }
    
    // Search by username
    const usernameQuery = await db.collection('students').where('username', '==', currentUser.email).get();
    
    if (!usernameQuery.empty) {
      const existingDoc = usernameQuery.docs[0];
      const existingData = existingDoc.data();
      
      console.log("✅ Found student document by username:");
      console.log("Existing document ID:", existingDoc.id);
      console.log("Existing data:", existingData);
      
      // Copy data to UID-based document
      console.log("🔧 Copying student data to UID-based document...");
      
      await db.collection('students').doc(currentUser.uid).set({
        ...existingData,
        // Ensure we have the UID as a reference
        originalDocId: existingDoc.id,
        updatedAt: new Date(),
        // Standardize email field
        email: currentUser.email
      });
      
      console.log("✅ Successfully copied student data to UID-based document");
      return;
    }
    
    console.log("❌ No student document found by email or username");
    console.log("📋 Available student documents (first 10):");
    
    // List some existing students for reference
    const allStudents = await db.collection('students').limit(10).get();
    allStudents.docs.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Name: ${data.name || 'N/A'}, Email: ${data.email || data.username || 'N/A'}`);
    });
    
    console.log("\n🔧 Creating basic student document...");
    
    // Create a basic student document
    await db.collection('students').doc(currentUser.uid).set({
      name: currentUser.displayName || "Student",
      email: currentUser.email,
      username: currentUser.email,
      studentId: `STU${Date.now().toString().slice(-6)}`,
      joinedDate: new Date().toISOString(),
      courseName: ["AWS"], // Default course
      courseID: [1],
      primaryCourseIndex: 0,
      coursesEnrolled: 1,
      status: "Active",
      attendanceByCourse: {},
      createdAt: new Date(),
      createdBy: "auto-fix-script"
    });
    
    console.log("✅ Created basic student document");
    
  } catch (error) {
    console.error("❌ Error in fix script:", error);
  }
}

// Run the fix
fixStudentData();

console.log("=== END STUDENT DATA FIX SCRIPT ===");
