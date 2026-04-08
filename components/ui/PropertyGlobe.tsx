'use client'

import { useEffect, useRef } from 'react'
import createGlobe from 'cobe'
import { motion } from 'motion/react'

export type GlobeMarker = {
  location: [number, number] // [lat, lng]
  size?: number
  label?: string
}

type PropertyGlobeProps = {
  markers?: GlobeMarker[]
  title?: string
  subtitle?: string
}

// Default markers — replace with real property coords from Supabase later
const DEFAULT_MARKERS: GlobeMarker[] = [
  { location: [37.7749, -122.4194], size: 0.08 }, // SF
  { location: [40.7128, -74.006], size: 0.08 },   // NYC
  { location: [34.0522, -118.2437], size: 0.08 }, // LA
  { location: [41.8781, -87.6298], size: 0.06 },  // Chicago
  { location: [29.7604, -95.3698], size: 0.06 },  // Houston
]

export default function PropertyGlobe({
  markers = DEFAULT_MARKERS,
  title = 'Properties',
  subtitle = 'Live portfolio map',
}: PropertyGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(0)
  const pointerInteracting = useRef<number | null>(null)
  const pointerStart = useRef(0)

  useEffect(() => {
    if (!canvasRef.current) return
    let width = 0
    const onResize = () => {
      if (canvasRef.current) width = canvasRef.current.offsetWidth
    }
    window.addEventListener('resize', onResize)
    onResize()

    // cobe's onRender isn't in its exported types, so cast options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.25,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.18, 0.22, 0.32],
      markerColor: [0.95, 0.65, 0.15], // amber accent — feels distinctive
      glowColor: [0.4, 0.6, 1],
      markers: markers.map(m => ({ location: m.location, size: m.size ?? 0.06 })),
      onRender: (state: { phi: number; width: number; height: number }) => {
        if (pointerInteracting.current === null) phiRef.current += 0.0035
        state.phi = phiRef.current + pointerStart.current
        state.width = width * 2
        state.height = width * 2
      },
    }
    const globe = createGlobe(canvasRef.current, opts)

    return () => {
      globe.destroy()
      window.removeEventListener('resize', onResize)
    }
  }, [markers])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-900/40 p-6 backdrop-blur"
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(245,158,11,0.5) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)',
        }}
      />

      <div className="relative flex items-start justify-between mb-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{subtitle}</p>
          <h2 className="text-2xl font-semibold text-slate-100">{title}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <span className="text-xs font-medium text-amber-200">{markers.length} active</span>
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-md">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            pointerInteracting.current = e.clientX - pointerStart.current
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
          }}
          onPointerUp={() => {
            pointerInteracting.current = null
            if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
          }}
          onPointerOut={() => {
            pointerInteracting.current = null
            if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
          }}
          onMouseMove={(e) => {
            if (pointerInteracting.current !== null) {
              const delta = e.clientX - pointerInteracting.current
              pointerStart.current = delta / 200
            }
          }}
          style={{ width: '100%', height: '100%', cursor: 'grab', contain: 'layout paint size' }}
        />
      </div>
    </motion.div>
  )
}
