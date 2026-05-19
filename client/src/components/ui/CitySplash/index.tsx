import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import styles from './CitySplash.module.css'

/**
 * CitySplash
 * ----------
 * Cinematic 3D city intro screen. Shown once per browser session.
 * Three.js city.glb + HUD overlay (corner brackets, scanlines, logo, progress bar).
 *
 * Timeline: load → 1s logo fade-in → 2.5s bar fills → 3s fade-out → 3.8s unmount
 *
 * Props:
 * @prop {() => void} onDone — called after exit animation completes
 */
interface CitySplashProps {
  onDone: () => void
}

const MODEL_PATH = '/models/city.glb'

const CitySplash: React.FC<CitySplashProps> = ({ onDone }) => {
  const mountRef   = useRef<HTMLDivElement>(null)
  const [fading, setFading]           = useState(false)
  const [logoVisible, setLogoVisible] = useState(false)

  // ── UI timeline ────────────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 1000)
    const t2 = setTimeout(() => setFading(true),      3000)
    const t3 = setTimeout(() => {
      sessionStorage.setItem('hud-city-splash', '1')
      onDone()
    }, 3800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  // ── Three.js ───────────────────────────────────────────────────
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const W = window.innerWidth
    const H = window.innerHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x04080f)
    scene.fog = new THREE.FogExp2(0x04080f, 0.006)

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000)
    camera.position.set(0, 15, 80)
    camera.lookAt(0, 40, 0)

    // ── Night lighting ─────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0a0f1a, 0.3))

    const redLight = new THREE.PointLight(0xb83a2d, 2, 300)
    redLight.position.set(0, 20, 30)
    scene.add(redLight)

    const goldLight = new THREE.PointLight(0xdcc9a9, 1, 300)
    goldLight.position.set(-40, 60, -20)
    scene.add(goldLight)

    const greenLight = new THREE.PointLight(0x4e6851, 0.8, 300)
    greenLight.position.set(40, 40, 20)
    scene.add(greenLight)

    // ── Load model ─────────────────────────────────────────────
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load(MODEL_PATH, (gltf) => {
      const model = gltf.scene
      const box   = new THREE.Box3().setFromObject(model)
      const size  = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      // Scale so the tallest dimension becomes ~120 units
      const scale = 120 / Math.max(size.x, size.y, size.z)
      model.scale.setScalar(scale)

      // Center X/Z, sit base on y=0
      model.position.set(
        -center.x * scale,
        -box.min.y * scale,
        -center.z * scale,
      )
      scene.add(model)
    })

    // ── Animation loop (camera drift) ──────────────────────────
    const clock = new THREE.Clock()
    let animId: number

    const tick = () => {
      animId = requestAnimationFrame(tick)
      const t = clock.getElapsedTime()
      // ±5 units on X, full period 8s
      camera.position.x = Math.sin((t * 2 * Math.PI) / 8) * 5
      camera.lookAt(0, 40, 0)
      renderer.render(scene, camera)
    }
    tick()

    // ── Resize ─────────────────────────────────────────────────
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    // ── Cleanup ────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      dracoLoader.dispose()
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div className={`${styles.wrap} ${fading ? styles.fading : ''}`} aria-hidden="true">
      {/* Three.js canvas mount */}
      <div ref={mountRef} className={styles.canvas} />

      {/* HUD overlay */}
      <div className={styles.overlay}>

        {/* Corner brackets */}
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        {/* Scanlines */}
        <div className={styles.scanlines} />

        {/* Center: logo + subtitle */}
        <div className={`${styles.center} ${logoVisible ? styles.centerVisible : ''}`}>
          <div className={styles.logo}>HUD</div>
          <div className={styles.subtitle}>PERSONAL OS</div>
        </div>

        {/* Bottom loading bar */}
        <div className={styles.barWrap}>
          <div className={styles.bar} />
        </div>
      </div>
    </div>
  )
}

export default CitySplash
