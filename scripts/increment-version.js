#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Automatic Version Incrementer for Nexo Mobile App
 * 
 * This script automatically increments the app version by 0.0001 each time it's run.
 * It updates:
 * - app.json (expo version)
 * - package.json (npm version) 
 * - android/app/build.gradle (versionName and versionCode)
 * 
 * Usage: node scripts/increment-version.js
 */

// File paths
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const GRADLE_PATH = path.join(__dirname, '..', 'android', 'app', 'build.gradle');

// Function to parse version string to number for increment calculation
function parseVersionToNumber(versionString) {
  // Remove any non-numeric characters except dots
  const cleanVersion = versionString.replace(/[^0-9.]/g, '');
  return parseFloat(cleanVersion);
}

// Function to increment version by 0.0001
function incrementVersion(currentVersion) {
  const versionNum = parseVersionToNumber(currentVersion);
  const newVersionNum = versionNum + 0.0001;
  
  // Format to 4 decimal places and remove trailing zeros
  let formattedVersion = newVersionNum.toFixed(4);
  
  // Remove trailing zeros but keep at least one decimal place
  formattedVersion = formattedVersion.replace(/\.?0+$/, '');
  if (!formattedVersion.includes('.')) {
    formattedVersion += '.0';
  }
  
  return formattedVersion;
}

// Function to extract and increment versionCode from gradle file
function extractVersionCode(gradleContent) {
  const versionCodeMatch = gradleContent.match(/versionCode\s+(\d+)/);
  if (versionCodeMatch) {
    return parseInt(versionCodeMatch[1]) + 1;
  }
  return 1; // Default if not found
}

// Function to update app.json
function updateAppJson(newVersion) {
  try {
    const appJsonContent = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    const oldVersion = appJsonContent.expo.version;
    
    appJsonContent.expo.version = newVersion;
    
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJsonContent, null, 2) + '\n');
    console.log(`✅ Updated app.json: ${oldVersion} → ${newVersion}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating app.json:', error.message);
    return false;
  }
}

// Function to update package.json
function updatePackageJson(newVersion) {
  try {
    const packageJsonContent = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const oldVersion = packageJsonContent.version;
    
    packageJsonContent.version = newVersion;
    
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJsonContent, null, 2) + '\n');
    console.log(`✅ Updated package.json: ${oldVersion} → ${newVersion}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    return false;
  }
}

// Function to update android/app/build.gradle
function updateBuildGradle(newVersion) {
  try {
    let gradleContent = fs.readFileSync(GRADLE_PATH, 'utf8');
    
    // Extract current values
    const currentVersionNameMatch = gradleContent.match(/versionName\s+"([^"]+)"/);
    const oldVersionName = currentVersionNameMatch ? currentVersionNameMatch[1] : 'unknown';
    const oldVersionCode = extractVersionCode(gradleContent) - 1; // Subtract 1 since we already incremented
    const newVersionCode = oldVersionCode + 1;
    
    // Update versionName
    gradleContent = gradleContent.replace(
      /versionName\s+"[^"]+"/,
      `versionName "${newVersion}"`
    );
    
    // Update versionCode
    gradleContent = gradleContent.replace(
      /versionCode\s+\d+/,
      `versionCode ${newVersionCode}`
    );
    
    fs.writeFileSync(GRADLE_PATH, gradleContent);
    console.log(`✅ Updated build.gradle:`);
    console.log(`   versionName: ${oldVersionName} → ${newVersion}`);
    console.log(`   versionCode: ${oldVersionCode} → ${newVersionCode}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating build.gradle:', error.message);
    return false;
  }
}

// Function to get current version from app.json
function getCurrentVersion() {
  try {
    const appJsonContent = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    return appJsonContent.expo.version;
  } catch (error) {
    console.error('❌ Error reading current version:', error.message);
    return null;
  }
}

// Main function
function main() {
  console.log('🚀 Starting automatic version increment...\n');
  
  // Get current version
  const currentVersion = getCurrentVersion();
  if (!currentVersion) {
    console.error('❌ Could not read current version. Exiting.');
    process.exit(1);
  }
  
  console.log(`📋 Current version: ${currentVersion}`);
  
  // Calculate new version
  const newVersion = incrementVersion(currentVersion);
  console.log(`📈 New version: ${newVersion}\n`);
  
  // Update all files
  let success = true;
  success = updateAppJson(newVersion) && success;
  success = updatePackageJson(newVersion) && success;
  success = updateBuildGradle(newVersion) && success;
  
  if (success) {
    console.log('\n✅ Version increment completed successfully!');
    console.log(`🎯 Ready to build APK with version ${newVersion}`);
    
    // Show build commands
    console.log('\n📦 To build your APK with the new version, run:');
    console.log('   npx eas build --platform android --profile preview');
    console.log('   or');
    console.log('   npm run build:apk');
  } else {
    console.log('\n❌ Version increment failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  incrementVersion,
  getCurrentVersion,
  updateAppJson,
  updatePackageJson,
  updateBuildGradle
};
