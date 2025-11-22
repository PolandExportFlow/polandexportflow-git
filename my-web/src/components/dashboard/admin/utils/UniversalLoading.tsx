function UniversalLoadingg({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none">
      <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-middle-blue/10 shadow-sm">
        <div className="w-4 h-4 rounded-full border-2 border-middle-blue border-t-transparent animate-spin" />
        <span className="text-middle-blue/70 text-xs">{label}</span>
      </div>
    </div>
  )
}
