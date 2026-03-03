import WLChecker from "@/components/wl-checker"

export default function WLCheckerPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl font-bold text-yellow-400 mb-2">
        Whitelist Checker
      </h1>

      <p className="text-gray-400 mb-6 max-w-md">
        Are you in?
Paste your wallet and find out.
      </p>

      <WLChecker />
    </main>
  )
}