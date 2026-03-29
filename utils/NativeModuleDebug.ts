import { NativeModules } from 'react-native';

/**
 * Helper function to debug native modules
 * Lists all available native modules and their methods
 */
export function logAvailableNativeModules() {
  console.log('==== AVAILABLE NATIVE MODULES ====');
  
  // List all available native modules
  const moduleNames = Object.keys(NativeModules);
  console.log(`Found ${moduleNames.length} native modules:`);
  
  // Log each module and its methods
  moduleNames.forEach(name => {
    const module = NativeModules[name];
    console.log(`- ${name}:`);
    
    // Try to log the methods of each module
    try {
      const methods = Object.getOwnPropertyNames(module)
        .filter(prop => typeof module[prop] === 'function');
      
      if (methods.length > 0) {
        console.log(`  Methods (${methods.length}):`);
        methods.forEach(method => {
          console.log(`    - ${method}`);
        });
      } else {
        console.log('  No methods found');
      }
    } catch (error: unknown) {
      console.log(`  Error inspecting methods: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  
  // Specifically check for our target modules
  console.log('\n==== TARGET MODULE CHECK ====');
  ['EcentricPaymentModule', 'EcentricPaymentModuleWrapper'].forEach(moduleName => {
    const exists = !!NativeModules[moduleName];
    console.log(`${moduleName}: ${exists ? 'AVAILABLE' : 'NOT FOUND'}`);
  });

  console.log('================================');
}

/**
 * Helper function to search for modules with a name pattern
 */
export function findModulesByNamePattern(pattern: string) {
  const regex = new RegExp(pattern, 'i');
  const matches = Object.keys(NativeModules).filter(name => regex.test(name));
  
  console.log(`\n==== MODULES MATCHING "${pattern}" ====`);
  if (matches.length > 0) {
    matches.forEach(name => {
      console.log(`- ${name}`);
    });
  } else {
    console.log('No matching modules found');
  }
  console.log('================================');
}

/**
 * Get the methods of a specific module
 */
export function getModuleMethods(reactModule: any): string[] {
  try {
    if (!reactModule) {
      console.log('[NativeModuleDebug] Module is null or undefined');
      return [];
    }
    
    // Get all methods from the module
    const methods = Object.getOwnPropertyNames(reactModule.__proto__)
      .filter(prop => typeof reactModule[prop] === 'function' && prop !== 'constructor');
      
    console.log(`[NativeModuleDebug] Available methods for module: ${methods.join(', ')}`);
    return methods;
  } catch (error: unknown) {
    // Properly handle unknown error type with type checking
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[NativeModuleDebug] Error getting module methods: ${errorMessage}`);
    return [];
  }
}

export default {
  logAvailableNativeModules,
  findModulesByNamePattern,
  getModuleMethods
}; 