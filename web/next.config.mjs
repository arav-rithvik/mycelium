/** @type {import('next').NextConfig} */
const nextConfig = {
  // shared/ ships raw TypeScript — let Next compile it instead of expecting prebuilt JS.
  transpilePackages: ["@mycelium/shared"],
  // The embedding model uses native onnxruntime; keep it out of the bundler so /api/search can load it.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
};

export default nextConfig;
