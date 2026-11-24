/** @type {import('next').NextConfig} */
const nextConfig = {
  // pg uses Node-only modules, so keep it out of the bundle
  serverExternalPackages: ["pg"],
};

export default nextConfig;
