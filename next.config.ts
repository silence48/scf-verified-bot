import dotenv from "dotenv";
import withBundleAnalyzer from "@next/bundle-analyzer";
import  { type NextConfig } from "next";
// Load environment variables
dotenv.config();

/*
// Apply Plausible proxy and retain your existing Next.js config
const nextConfig = withPlausibleProxy({
  customDomain: "https://" // Plausible instance
  // subdirectory: "plausible", // Optional, to customize the script URL
  //scriptName: "plausible-script" // Optional, customize the script name if needed
})({
*/
/** @type {NextConfig} */
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.stellar.quest",
        pathname: "/badge/**",
      },
      {
        protocol: "https",
        hostname: "assets.rpciege.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
  },
  serverExternalPackages: ["sodium-native", "@stellar/stellar-sdk"],
  productionBrowserSourceMaps: false,
  staticPageGenerationTimeout: 6000,
  experimental: {
    ppr: "incremental", 
    optimizePackageImports: [],
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 1,
    staticGenerationRetryCount: 20,
    parallelServerCompiles: false,
  },

webpack(config, options/* { isServer }*/ ) {
  config.stats = "verbose";
  //config.infrastructureLogging = {
    //level: 'verbose',
  // };
  config.ignoreWarnings = [
    {
      module: /@discordjs\/ws/,
      message: /the request of a dependency is an expression/,
    },
  ];
  config.module.rules.push({
    test: /\.node/,
    use: "node-loader"
  });
  if (!options.dev){
    config.devtool = options.isServer ? false : "source-map";
       
  }
  
     /*
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
*/
  return config;
},

};

// Export the Next.js configuration
// Wrap your config with the analyzer plugin:

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
  // optional: openAnalyzer: false,
})(nextConfig);
//export default nextConfig;