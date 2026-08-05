/**
 * Script to update total class counts for all students
 * Run this script to ensure all existing student data has correct total class counts
 * based on the actual attendance dates in the attendance collection
 */

import { updateAllStudentsTotalClasses } from '../lib/attendance-total-classes-service';

async function runUpdate() {
  try {
    console.log('Starting update of total class counts for all students...');
    await updateAllStudentsTotalClasses();
    console.log('Successfully updated all students total class counts');
  } catch (error) {
    console.error('Error updating students total class counts:', error);
  }
}

// Uncomment the line below to run the update
// runUpdate();

export { runUpdate };

