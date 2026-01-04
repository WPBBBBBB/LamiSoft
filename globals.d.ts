declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

declare module "next-pwa" {
  type WithPWA = (nextConfig?: import("next").NextConfig) => import("next").NextConfig
  type PwaConfig = Record<string, unknown>
  const withPWAInit: (pwaConfig: PwaConfig) => WithPWA
  export default withPWAInit
}

