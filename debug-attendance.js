// Enhanced Debug script to find student data locations
// Copy and paste this into the browser console while on the student attendance page

console.log("=== ENHANCED ATTENDANCE DEBUG SCRIPT ===");

// Check authentication state
console.log("1. Authentication State:");
const currentUser = firebase?.auth?.currentUser;
console.log("Current user:", currentUser);
if (currentUser) {
  console.log("User UID:", currentUser.uid);
  console.log("User Email:", currentUser.email);
}

// Check session storage
console.log("\n2. Session Storage:");
const studentDataRaw = localStorage.getItem('studentData');
const studentData = studentDataRaw ? JSON.parse(studentDataRaw) : null;
console.log("Student data (parsed):", studentData);
console.log("Student ID:", localStorage.getItem('studentId'));
console.log("Is Admin:", localStorage.getItem('isAdmin'));

// Check if Firebase is available
console.log("\n3. Firebase State:");
console.log("Firebase available:", typeof firebase !== 'undefined');
console.log("Firestore available:", typeof db !== 'undefined');

// Test Firestore access (if available)
if (typeof db !== 'undefined' && currentUser) {
  console.log("\n4. Testing Multiple Document Locations:");
  const userId = currentUser.uid;
  const userEmail = currentUser.email;
  console.log("Searching for user with UID:", userId);
  console.log("Searching for user with email:", userEmail);
  
  // Function to search in different collections
  async function searchForStudent() {
    console.log("\n--- Searching in 'students' collection by UID ---");
    try {
      const studentDoc = await db.collection('students').doc(userId).get();
      if (studentDoc.exists) {
        console.log("✅ Found in students collection by UID:");
        console.log(studentDoc.data());
        analyzeStudentData(studentDoc.data());
      } else {
        console.log("❌ Not found in students collection by UID");
      }
    } catch (error) {
      console.error("Error checking students by UID:", error);
    }

    console.log("\n--- Searching in 'students' collection by email ---");
    try {
      const emailQuery = await db.collection('students').where('email', '==', userEmail).get();
      if (!emailQuery.empty) {
        console.log("✅ Found in students collection by email:");
        emailQuery.docs.forEach(doc => {
          console.log("Document ID:", doc.id);
          console.log("Document data:", doc.data());
          analyzeStudentData(doc.data());
        });
      } else {
        console.log("❌ Not found in students collection by email");
      }
    } catch (error) {
      console.error("Error checking students by email:", error);
    }

    console.log("\n--- Searching in 'students' collection by username ---");
    try {
      const usernameQuery = await db.collection('students').where('username', '==', userEmail).get();
      if (!usernameQuery.empty) {
        console.log("✅ Found in students collection by username:");
        usernameQuery.docs.forEach(doc => {
          console.log("Document ID:", doc.id);
          console.log("Document data:", doc.data());
          analyzeStudentData(doc.data());
        });
      } else {
        console.log("❌ Not found in students collection by username");
      }
    } catch (error) {
      console.error("Error checking students by username:", error);
    }

    console.log("\n--- Listing some documents in 'students' collection ---");
    try {
      const allStudents = await db.collection('students').limit(5).get();
      console.log(`Found ${allStudents.docs.length} students (showing first 5):`);
      allStudents.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}, Name: ${data.name}, Email: ${data.email || data.username}`);
      });
    } catch (error) {
      console.error("Error listing students:", error);
    }
  }

  function analyzeStudentData(data) {
    console.log("\n📊 Student Document Analysis:");
    console.log("Name:", data.name);
    console.log("Email:", data.email);
    console.log("Username:", data.username);
    console.log("Course names:", data.courseName);
    console.log("Course IDs:", data.courseID);
    console.log("Primary course index:", data.primaryCourseIndex);
    console.log("Batch:", data.batch);
    console.log("Joined date:", data.joinedDate);
    console.log("Student ID:", data.studentId);
    console.log("Attendance by course:", data.attendanceByCourse);
    
    // Determine primary course
    const primaryIndex = data.primaryCourseIndex || 0;
    const courseIDs = Array.isArray(data.courseID) ? data.courseID : [data.courseID];
    const courseNames = Array.isArray(data.courseName) ? data.courseName : [data.courseName];
    const primaryCourseID = courseIDs[primaryIndex]?.toString() || courseIDs[0]?.toString() || "";
    const primaryCourseName = courseNames[primaryIndex] || courseNames[0] || "";
    
    console.log("\n🎯 Primary Course Determined:");
    console.log("Primary Course ID:", primaryCourseID);
    console.log("Primary Course Name:", primaryCourseName);
    
    // Check course document if we have a primary course ID
    if (primaryCourseID && typeof db !== 'undefined') {
      console.log("\n🏫 Checking course document...");
      db.collection('courses').doc(primaryCourseID).get().then(courseDoc => {
        if (courseDoc.exists) {
          const courseData = courseDoc.data();
          console.log("✅ Found course document:");
          console.log("Course data:", courseData);
          
          if (courseData.startDate) {
            const startDate = courseData.startDate.toDate ? courseData.startDate.toDate() : new Date(courseData.startDate);
            console.log("📅 Course Start Date:", startDate);
          } else {
            console.warn("⚠️ Course document has no startDate field");
          }
          
          if (courseData.endDate) {
            const endDate = courseData.endDate.toDate ? courseData.endDate.toDate() : new Date(courseData.endDate);
            console.log("📅 Course End Date:", endDate);
          } else {
            console.warn("⚠️ Course document has no endDate field");
          }
        } else {
          console.error("❌ Course document not found for ID:", primaryCourseID);
          console.log("💡 This might indicate a mismatch between student course ID and courses collection");
        }
      }).catch(error => {
        console.error("❌ Error fetching course document:", error);
      });
    }
    
    if (data.attendanceByCourse) {
      console.log("\n📋 Available Attendance Courses:");
      Object.keys(data.attendanceByCourse).forEach(courseKey => {
        const courseData = data.attendanceByCourse[courseKey];
        console.log(`Course "${courseKey}":`, courseData);
        if (courseData.datesPresent) {
          console.log(`  - Dates present (${courseData.datesPresent.length}):`, courseData.datesPresent);
        }
        if (courseData.summary) {
          console.log(`  - Summary:`, courseData.summary);
        }
      });
      
      // Check if attendance exists for primary course
      const possibleCourseIds = [
        primaryCourseID,
        primaryCourseName,
        primaryCourseName.toUpperCase(),
        primaryCourseName.toLowerCase(),
      ].filter(Boolean);
      
      console.log("\n🔍 Checking attendance for primary course variations:", possibleCourseIds);
      
      let foundAttendance = false;
      for (const courseId of possibleCourseIds) {
        if (data.attendanceByCourse[courseId]) {
          console.log(`✅ Found attendance data for course ID: "${courseId}"`);
          console.log("Attendance data:", data.attendanceByCourse[courseId]);
          foundAttendance = true;
          break;
        }
      }
      
      if (!foundAttendance) {
        console.error("❌ No attendance data found for primary course");
        console.log("💡 Available attendance keys:", Object.keys(data.attendanceByCourse));
        console.log("💡 Primary course variations tried:", possibleCourseIds);
      }
    } else {
      console.error("❌ No attendanceByCourse field in student document");
    }
  }

  // Run the search
  searchForStudent();
  
} else {
  console.log("\n4. Cannot test Firestore - user not authenticated or Firebase not available");
  if (!currentUser) {
    console.log("❌ No authenticated user");
  }
  if (typeof db === 'undefined') {
    console.log("❌ Firestore not available");
  }
}

console.log("\n=== END ENHANCED DEBUG SCRIPT ===");

// Additional helper: Check if user can create a test document (to verify permissions)
if (typeof db !== 'undefined' && currentUser) {
  console.log("\n🔧 Testing Firestore write permissions...");
  db.collection('test').doc('permission-test').set({
    test: true,
    timestamp: new Date()
  }).then(() => {
    console.log("✅ Write permissions work");
    // Clean up test document
    return db.collection('test').doc('permission-test').delete();
  }).then(() => {
    console.log("✅ Delete permissions work");
  }).catch(error => {
    console.error("❌ Write/Delete permissions failed:", error);
  });
}
