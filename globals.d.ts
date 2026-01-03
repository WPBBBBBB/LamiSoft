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

