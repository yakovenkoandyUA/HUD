import React, { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import styles from './McLarenViewer.module.css'

/**
 * McLarenViewer
 * -------------
 * Cinematic hero 3D McLaren MP4/5 — full-width, fades into background.
 * Авторотація по осі Y, responsive, повне прибирання на unmount.
 *
 * Model: McLaren MP4/5 by dark_igorek (CC Attribution)
 */

const MODEL_PATH = '/models/mclaren_mp45__formula_1.glb'
const HEIGHT = 180

const McLarenViewer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, HEIGHT)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = false
    container.appendChild(renderer.domElement)

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // ── Camera — side view, slight elevation ──────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / HEIGHT, 0.1, 100)
    camera.position.set(4.2, 0.6, 1.6)
    camera.lookAt(0, 0.5, 0)

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 2))

    const key = new THREE.DirectionalLight(0xfff5e0, 4.5)
    key.position.set(5, 8, 3)
    scene.add(key)

    const fill = new THREE.DirectionalLight(0xb83a2d, 1.2)
    fill.position.set(-5, 1, -4)
    scene.add(fill)

    // ── Load model ────────────────────────────────────────────────────────────
    let model: THREE.Object3D | null = null

    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')

    const loader = new GLTFLoader()
    loader.setDRACOLoader(dracoLoader)

    loader.load(MODEL_PATH, (gltf) => {
      model = gltf.scene

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
      if (model) model.rotation.y += 0.003
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
      ro.disconnect()
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
    <div className={styles.hero}>
      <div ref={mountRef} className={styles.canvas} />
      <p className={styles.credit}>McLaren MP4/5 · dark_igorek · CC BY</p>
    </div>
  )
}

export default McLarenViewer
