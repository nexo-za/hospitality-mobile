/**
 * Post-install patch for @heasy/react-native-sunmi-printer
 *
 * Several @ReactMethod annotations use parameter types (TransBean[], Bitmap)
 * that are incompatible with React Native New Architecture (TurboModules).
 * This script comments them out so the module can load without crashing.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@heasy',
  'react-native-sunmi-printer',
  'android',
  'src',
  'main',
  'java',
  'com',
  'reactnativesunmiprinter',
  'SunmiPrinterModule.java'
);

if (!fs.existsSync(filePath)) {
  console.log('[fix-sunmi-printer] SunmiPrinterModule.java not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');
let patched = false;

// Patch 1: commitPrint(TransBean[]) — unsupported array param type
const commitPrintRegex =
  /(\s*)@ReactMethod\n\s*public void commitPrint\(TransBean\[\] tranBean\) throws RemoteException \{\n\s*printerService\.commitPrint\(tranBean, innerResultCallback\);\n\s*\}/;
if (commitPrintRegex.test(content)) {
  content = content.replace(
    commitPrintRegex,
    '$1// [PATCHED] commitPrint(TransBean[]) removed - incompatible with RN New Architecture\n$1// @ReactMethod\n$1// public void commitPrint(TransBean[] tranBean) throws RemoteException {\n$1//   printerService.commitPrint(tranBean, innerResultCallback);\n$1// }'
  );
  patched = true;
  console.log('[fix-sunmi-printer] Patched commitPrint(TransBean[])');
}

// Patch 2: printBitmapCustom(Bitmap, int) — unsupported Bitmap param type
const printBitmapCustomRegex =
  /(\s*)@ReactMethod\n\s*public void printBitmapCustom\(Bitmap bitmap, int type\) throws RemoteException \{\n\s*printerService\.printBitmapCustom\(bitmap, type, innerResultCallback\);\n\s*\}/;
if (printBitmapCustomRegex.test(content)) {
  content = content.replace(
    printBitmapCustomRegex,
    '$1// [PATCHED] printBitmapCustom(Bitmap, int) removed - incompatible with RN New Architecture\n$1// Use printBitmapBase64Custom() instead.\n$1// @ReactMethod\n$1// public void printBitmapCustom(Bitmap bitmap, int type) throws RemoteException {\n$1//   printerService.printBitmapCustom(bitmap, type, innerResultCallback);\n$1// }'
  );
  patched = true;
  console.log('[fix-sunmi-printer] Patched printBitmapCustom(Bitmap, int)');
}

if (patched) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[fix-sunmi-printer] All patches applied successfully.');
} else {
  console.log('[fix-sunmi-printer] Already patched or methods not found, skipping.');
}
