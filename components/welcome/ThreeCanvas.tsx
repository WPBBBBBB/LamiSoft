"use client"
import React, { useEffect, useRef } from "react"
import * as THREE from "three"

export default function ThreeCanvas({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 10)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    mount.appendChild(renderer.domElement)

    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(5, 5, 5)
    scene.add(light)
    scene.add(new THREE.AmbientLight(0x404040, 1.5))

    // Create main logo group
    const logoGroup = new THREE.Group()

    // Outer circle ring
    const ringGeom = new THREE.TorusGeometry(2, 0.08, 16, 50)
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x6366f1,
      emissiveIntensity: 0.3,
    })
    const ring = new THREE.Mesh(ringGeom, ringMat)
    logoGroup.add(ring)

    // Inner glow circle
    const glowGeom = new THREE.CircleGeometry(1.8, 32)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.1,
    })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    logoGroup.add(glow)

    // Shopping cart icon (stylized)
    const cartGroup = new THREE.Group()
    
    // Cart body - thin and modern
    const cartBodyGeom = new THREE.BoxGeometry(0.8, 0.6, 0.1)
    const cartMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.3,
      metalness: 0.9,
    })
    const cartBody = new THREE.Mesh(cartBodyGeom, cartMat)
    cartBody.position.set(0, 0.3, 0)
    cartGroup.add(cartBody)

    // Cart handle
    const handleGeom = new THREE.BoxGeometry(0.1, 0.8, 0.1)
    const handle = new THREE.Mesh(handleGeom, cartMat)
    handle.position.set(-0.4, 0.6, 0)
    handle.rotation.z = Math.PI / 6
    cartGroup.add(handle)

    // Wheels
    const wheelGeom = new THREE.SphereGeometry(0.12, 16, 16)
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.3,
      metalness: 0.9,
    })
    
    const wheel1 = new THREE.Mesh(wheelGeom, wheelMat)
    wheel1.position.set(-0.25, -0.1, 0.1)
    cartGroup.add(wheel1)
    
    const wheel2 = new THREE.Mesh(wheelGeom, wheelMat)
    wheel2.position.set(0.25, -0.1, 0.1)
    cartGroup.add(wheel2)

    cartGroup.position.set(0, 0.2, 0.2)
    logoGroup.add(cartGroup)

    // Tech circuit elements
    const circuitGroup = new THREE.Group()
    
    // Create circuit lines
    const createCircuitLine = (x: number, y: number, length: number, angle: number) => {
      const lineGeom = new THREE.BoxGeometry(length, 0.05, 0.05)
      const lineMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.5,
      })
      const line = new THREE.Mesh(lineGeom, lineMat)
      line.position.set(x, y, 0)
      line.rotation.z = angle
      return line
    }

    // Add circuit lines around the logo
    circuitGroup.add(createCircuitLine(1.5, 1.2, 0.4, 0))
    circuitGroup.add(createCircuitLine(1.7, 1.2, 0.3, Math.PI / 2))
    circuitGroup.add(createCircuitLine(-1.5, -1.2, 0.4, 0))
    circuitGroup.add(createCircuitLine(-1.7, -1.2, 0.3, Math.PI / 2))
    circuitGroup.add(createCircuitLine(1.3, -1.0, 0.5, Math.PI / 4))
    circuitGroup.add(createCircuitLine(-1.3, 1.0, 0.5, -Math.PI / 4))

    // Circuit nodes
    const nodeGeom = new THREE.SphereGeometry(0.08, 8, 8)
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0xa78bfa,
      emissiveIntensity: 0.7,
    })
    
    const positions = [
      [1.5, 1.2, 0], [1.9, 1.2, 0], [-1.5, -1.2, 0], 
      [-1.9, -1.2, 0], [1.6, -1.2, 0], [-1.6, 1.2, 0]
    ]
    
    positions.forEach(([x, y, z]) => {
      const node = new THREE.Mesh(nodeGeom, nodeMat)
      node.position.set(x, y, z)
      circuitGroup.add(node)
    })

    logoGroup.add(circuitGroup)

    // Floating particles for tech effect
    const particlesGeom = new THREE.BufferGeometry()
    const particleCount = 40
    const particlePositions = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = (i / 3) * (Math.PI * 2 / particleCount)
      const radius = 2.5 + Math.random() * 1
      particlePositions[i] = Math.cos(angle) * radius
      particlePositions[i + 1] = (Math.random() - 0.5) * 2
      particlePositions[i + 2] = Math.sin(angle) * radius
    }
    
    particlesGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    const particlesMat = new THREE.PointsMaterial({
      color: 0x8b5cf6,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    })
    const particles = new THREE.Points(particlesGeom, particlesMat)
    scene.add(particles)

    scene.add(logoGroup)

    let frameId: number

    function onResize() {
      const node = mountRef.current
      if (!node) return
      const w = node.clientWidth
      const h = node.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener("resize", onResize)

    let t = 0
    const animate = () => {
      t += 0.01

      // Rotate main logo slowly
      logoGroup.rotation.y = Math.sin(t * 0.3) * 0.3
      logoGroup.rotation.x = Math.cos(t * 0.2) * 0.1

      // Floating effect
      logoGroup.position.y = Math.sin(t * 0.8) * 0.2

      // Rotate ring separately for depth
      ring.rotation.z += 0.005

      // Pulse glow
      glow.material.opacity = 0.1 + Math.sin(t) * 0.05

      // Animate circuit nodes
      circuitGroup.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
          child.material.emissiveIntensity = 0.7 + Math.sin(t * 2 + i) * 0.3
        }
      })

      // Rotate particles
      particles.rotation.y += 0.003

      // Animate particle positions
      const positions = particles.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i + 1] += Math.sin(t + i) * 0.005
      }
      particles.geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={className || "w-full h-96"} />
}
