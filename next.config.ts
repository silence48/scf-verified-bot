import dotenv from "dotenv";
import withBundleAnalyzer from '@next/bundle-analyzer'
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import  { type NextConfig } from 'next';
// Load environment variables
dotenv.config();

/*
// Apply Plausible proxy and retain your existing Next.js config
const nextConfig = withPlausibleProxy({
  customDomain: "https://hoops-analytics.hoops.finance" // Plausible instance
  // subdirectory: "plausible", // Optional, to customize the script URL
  //scriptName: "plausible-script" // Optional, customize the script name if needed
})({
*/
/** @type {NextConfig} */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  },
  productionBrowserSourceMaps: true,
  staticPageGenerationTimeout: 600,
  experimental: {
    ppr: "incremental", 
    optimizePackageImports: [],
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
    staticGenerationRetryCount: 20,
    parallelServerCompiles: false,
  },

  
webpack(config, { isServer }) {
  config.stats = 'verbose';
  config.infrastructureLogging = {
    level: 'verbose',
  };
  config.devtool = 'source-map';
        config.module.rules.push({
          test: /\.node/,
          use: 'node-loader'
        })
     
  if (isServer) {
    interface DevtoolModuleFilenameTemplateInfo {
      absoluteResourcePath: string;
      allLoaders: string | undefined;
      hash: string | undefined;
      id: string | undefined;
      loaders: string | undefined;
      resource: string | undefined;
      resourcePath: string | undefined;
    }
    
    config.output.devtoolModuleFilenameTemplate = (info: DevtoolModuleFilenameTemplateInfo): string => {
      // 1) get absolute path, e.g. "C:\dev\..."
      const absolute: string = path.resolve(info.absoluteResourcePath);
      // 2) convert backslashes to forward slashes => "C:/dev/..."
      const normalized: string = absolute.replace(/\\/g, "/");
      // 3) **do NOT** prepend "file:///"
      return normalized;
    };
    // fallback can just show the resource path
    config.output.devtoolFallbackModuleFilenameTemplate = "[resource-path]?[hash]";
  }

  return config;
},};

// Export the Next.js configuration
// Wrap your config with the analyzer plugin:

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
  // optional: openAnalyzer: false,
})(nextConfig);
//export default nextConfig;