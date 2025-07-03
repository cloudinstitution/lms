// Quick Test Script for Attendance Fixes
// Run this in browser console on the student attendance page

console.log("🔧 Testing Attendance Fixes...");

// Test the student data and course lookup
(async function testFixes() {
  try {
    const { auth, db } = window.firebaseApp || {};
    if (!auth || !db) {
      console.error("❌ Firebase not available");
      return;
    }

    const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
    const user = auth.currentUser;
    
    if (!user) {
      console.error("❌ No authenticated user");
      return;
    }

    console.log("👤 Testing with user:", user.uid);

    // Get student document
    const studentDoc = await getDoc(doc(db, "students", user.uid));
    if (!studentDoc.exists()) {
      console.error("❌ Student document not found");
      return;
    }

    const studentData = studentDoc.data();
    console.log("📋 Student Data:", studentData);

    // Test course ID extraction
    const primaryIndex = studentData.primaryCourseIndex || 0;
    const courseIDs = Array.isArray(studentData.courseID) ? studentData.courseID : [studentData.courseID];
    const courseNames = Array.isArray(studentData.courseName) ? studentData.courseName : [studentData.courseName];
    
    const primaryCourseID = courseIDs[primaryIndex]?.toString() || courseIDs[0]?.toString() || "";
    const primaryCourseName = courseNames[primaryIndex] || courseNames[0] || "";

    console.log("🎯 Primary Course:", {
      courseID: primaryCourseID,
      courseName: primaryCourseName
    });

    // Test attendance lookup
    const attendanceByCourse = studentData.attendanceByCourse || {};
    console.log("📊 Attendance By Course:", attendanceByCourse);
    console.log("📊 Available Keys:", Object.keys(attendanceByCourse));

    // Test course ID variants
    const possibleCourseIds = [
      primaryCourseID,
      primaryCourseID.toString(),
      parseInt(primaryCourseID),
      primaryCourseName,
      primaryCourseName.toUpperCase(),
      primaryCourseName.toLowerCase(),
    ].filter(id => {
      if (id === null || id === undefined || id === "") return false;
      if (typeof id === "number" && isNaN(id)) return false;
      return true;
    });

    console.log("🔍 Testing Course ID Variants:", possibleCourseIds);

    let foundAttendance = false;
    for (const courseId of possibleCourseIds) {
      if (attendanceByCourse[courseId]) {
        console.log(`✅ Found attendance for courseID: "${courseId}" (${typeof courseId})`);
        console.log("📊 Attendance Data:", attendanceByCourse[courseId]);
        foundAttendance = true;
        break;
      }
    }

    if (!foundAttendance) {
      console.error("❌ No attendance found for any variant");
    }

    // Test course document lookup
    console.log("\n🏫 Testing Course Document Lookup...");
    
    // Try direct lookup
    let courseDoc = await getDoc(doc(db, "courses", primaryCourseID));
    if (courseDoc.exists()) {
      console.log("✅ Found course by direct ID");
      const courseData = courseDoc.data();
      console.log("📄 Course Data:", courseData);
      
      if (courseData.startDate) {
        let startDate;
        if (courseData.startDate.toDate) {
          startDate = courseData.startDate.toDate();
        } else {
          startDate = new Date(courseData.startDate);
        }
        console.log("📅 Start Date:", startDate);
      }
    } else {
      console.log("❌ Course not found by direct ID, trying courseID field query");
      
      // Try by courseID field as number
      const courseQuery = query(collection(db, "courses"), where("courseID", "==", parseInt(primaryCourseID)));
      const courseSnapshot = await getDocs(courseQuery);
      
      if (!courseSnapshot.empty) {
        console.log("✅ Found course by courseID field (number)");
        const courseData = courseSnapshot.docs[0].data();
        console.log("📄 Course Data:", courseData);
      } else {
        console.log("❌ Course not found by courseID field either");
        
        // Show available courses
        const allCourses = await getDocs(collection(db, "courses"));
        console.log("📋 Available courses:");
        allCourses.docs.slice(0, 5).forEach(doc => {
          const data = doc.data();
          console.log(`- Doc ID: ${doc.id}, Title: ${data.title}, CourseID: ${data.courseID}`);
        });
      }
    }

    console.log("✅ Test completed!");

  } catch (error) {
    console.error("❌ Test error:", error);
  }
})();
