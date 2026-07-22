export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" style={{ backgroundColor: '#EEF6EE' }}>
      <div
        className="h-full w-1/3"
        style={{
          backgroundColor: '#085508',
          animation: 'route-loading 0.85s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes route-loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}
