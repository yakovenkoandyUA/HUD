import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import styles from './CarHero.module.css'

/**
 * CarHero
 * -------
 * Інтерактивний 3D McLaren MP4/5 для Dashboard.
 * OrbitControls: drag для обертання, авторотація відновлюється через 3с.
 * Фонові частинки — зоряний ефект навколо болида.
 *
 * Model: McLaren MP4/5 by dark_igorek (CC Attribution)
 */

const MODEL_PATH = '/models/mclaren_mp45__formula_1.glb'
const HEIGHT = 260
const PARTICLE_COUNT = 80

const CarHero: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, HEIGHT)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // ── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / HEIGHT, 0.1, 100)
    camera.position.set(3.5, 0.8, 2.5)
    camera.lookAt(0, 0.3, 0)

    // ── Theme-aware lighting ──────────────────────────────────────────────────
    const isLight = () => ['mimir', 'pixel'].includes(document.documentElement.getAttribute('data-theme') ?? '')

    const ambientLight = new THREE.AmbientLight(0xfff5e0, isLight() ? 0.3 : 0.6)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, isLight() ? 0.6 : 1.2)
    dirLight.position.set(5, 8, 3)
    scene.add(dirLight)

    const pointLight = new THREE.PointLight(0xb83a2d, 0.8, 20)
    pointLight.position.set(0, -1.5, 0)
    scene.add(pointLight)

    const themeObserver = new MutationObserver(() => {
      const light = isLight()
      ambientLight.intensity = light ? 0.3 : 0.6
      dirLight.intensity = light ? 0.6 : 1.2
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // ── Particles ─────────────────────────────────────────────────────────────
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 12
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0x5c5248,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
    })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    // ── OrbitControls ─────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableZoom = false
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.8

    let resumeTimer: ReturnType<typeof setTimeout> | null = null
    const onStart = () => {
      controls.autoRotate = false
      if (resumeTimer) clearTimeout(resumeTimer)
    }
    const onEnd = () => {
      resumeTimer = setTimeout(() => { controls.autoRotate = true }, 3000)
    }
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)

    // ── Load model ────────────────────────────────────────────────────────────
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load(MODEL_PATH, (gltf) => {
      const model = gltf.scene
      const box = new THREE.Box3().setFromObject(model)
      const centre = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const scale = 3.2 / Math.max(size.x, size.y, size.z)
      model.scale.setScalar(scale)
      model.position.copy(centre.multiplyScalar(-scale))
      model.position.y -= size.y * scale * 0.1
      scene.add(model)
    })

    // ── Animation loop ────────────────────────────────────────────────────────
    let animId: number
    const tick = () => {
      animId = requestAnimationFrame(tick)
      controls.update()
      particles.rotation.y += 0.0005
      renderer.render(scene, camera)
    }
    tick()

    // ── Responsive ────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      renderer.setSize(w, HEIGHT)
      camera.aspect = w / HEIGHT
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId)
      if (resumeTimer) clearTimeout(resumeTimer)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      controls.dispose()
      themeObserver.disconnect()
      ro.disconnect()
      dracoLoader.dispose()
      particleGeo.dispose()
      particleMat.dispose()
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      })
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className={styles.hero}>
      <div ref={mountRef} className={styles.canvas} />
      <p className={styles.credit}>McLaren MP4/5 · dark_igorek · CC BY</p>
    </div>
  )
}

export default CarHero
