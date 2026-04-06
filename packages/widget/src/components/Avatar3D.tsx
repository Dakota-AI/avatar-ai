import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, Group } from 'three'

interface Avatar3DProps {
  isIdle?: boolean
  isTalking?: boolean
  isWalkingIn?: boolean
}

export function Avatar3D({ isIdle = true, isTalking = false, isWalkingIn = false }: Avatar3DProps) {
  const groupRef = useRef<Group>(null)
  const headRef = useRef<Mesh>(null)
  const bodyRef = useRef<Mesh>(null)
  const leftArmRef = useRef<Mesh>(null)
  const rightArmRef = useRef<Mesh>(null)
  const leftEyeRef = useRef<Mesh>(null)
  const rightEyeRef = useRef<Mesh>(null)

  // Autonomous behaviors
  const [isBlinking, setIsBlinking] = useState(false)
  const [nextGesture, setNextGesture] = useState<'wave' | 'nod' | 'tilt' | null>(null)
  const [gestureTime, setGestureTime] = useState(0)

  // Random blink every 2-4 seconds
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, Math.random() * 2000 + 2000)
    return () => clearInterval(blinkInterval)
  }, [])

  // Random gestures every 5-10 seconds
  useEffect(() => {
    const gestureInterval = setInterval(() => {
      const gestures: Array<'wave' | 'nod' | 'tilt'> = ['wave', 'nod', 'tilt']
      const randomGesture = gestures[Math.floor(Math.random() * gestures.length)]
      setNextGesture(randomGesture)
      setGestureTime(0)
      setTimeout(() => setNextGesture(null), 2000)
    }, Math.random() * 5000 + 5000)
    return () => clearInterval(gestureInterval)
  }, [])

  // Animations
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    // Walk-in animation
    if (groupRef.current && isWalkingIn && time < 1) {
      groupRef.current.position.x = (1 - time) * 3
    }

    // Idle animation - gentle breathing motion
    if (headRef.current && isIdle) {
      headRef.current.position.y = Math.sin(time * 2) * 0.03 + 2.8
    }

    if (bodyRef.current && isIdle) {
      bodyRef.current.scale.y = 1 + Math.sin(time * 2) * 0.015
    }

    // Talking animation - head bobbing and slight movement
    if (headRef.current && isTalking) {
      headRef.current.rotation.x = Math.sin(time * 8) * 0.04
      headRef.current.rotation.z = Math.sin(time * 6) * 0.02
    }

    // Autonomous gestures
    if (nextGesture && headRef.current) {
      setGestureTime(prev => prev + delta)

      if (nextGesture === 'nod') {
        headRef.current.rotation.x = Math.sin(gestureTime * 6) * 0.15
      } else if (nextGesture === 'tilt') {
        headRef.current.rotation.z = Math.sin(gestureTime * 3) * 0.2
      }
    }

    if (nextGesture === 'wave' && rightArmRef.current) {
      rightArmRef.current.rotation.z = Math.sin(gestureTime * 8) * 0.4 - 0.5
      rightArmRef.current.rotation.x = Math.sin(gestureTime * 8) * 0.2
    }

    // Arm sway when idle
    if (leftArmRef.current && isIdle && !nextGesture) {
      leftArmRef.current.rotation.z = Math.sin(time * 1.5) * 0.1 + 0.2
    }
    if (rightArmRef.current && isIdle && nextGesture !== 'wave') {
      rightArmRef.current.rotation.z = Math.sin(time * 1.5) * 0.1 - 0.2
    }

    // Blinking animation
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkScale = isBlinking ? 0.1 : 1
      leftEyeRef.current.scale.y = blinkScale
      rightEyeRef.current.scale.y = blinkScale
    }
  })

  return (
    <group ref={groupRef} scale={1.8} position={[0, -1.5, 0]}>
      {/* Legs */}
      <mesh position={[-0.25, 0.9, 0]}>
        <capsuleGeometry args={[0.15, 0.9, 16, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0.25, 0.9, 0]}>
        <capsuleGeometry args={[0.15, 0.9, 16, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Torso - business shirt */}
      <mesh ref={bodyRef} position={[0, 1.8, 0]}>
        <capsuleGeometry args={[0.45, 1.0, 16, 32]} />
        <meshStandardMaterial
          color="#4a90e2"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Shoulders - jacket */}
      <mesh position={[0, 2.3, 0]}>
        <boxGeometry args={[1.2, 0.3, 0.4]} />
        <meshStandardMaterial
          color="#2c3e50"
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Collar */}
      <mesh position={[0, 2.5, 0.1]}>
        <boxGeometry args={[0.35, 0.08, 0.15]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>

      {/* Tie */}
      <mesh position={[0, 2.15, 0.22]}>
        <boxGeometry args={[0.08, 0.6, 0.02]} />
        <meshStandardMaterial
          color="#c0392b"
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* Arms - skin tone */}
      <mesh ref={leftArmRef} position={[-0.65, 2.0, 0]}>
        <capsuleGeometry args={[0.12, 0.8, 16, 32]} />
        <meshStandardMaterial
          color="#8d5524"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>
      <mesh ref={rightArmRef} position={[0.65, 2.0, 0]}>
        <capsuleGeometry args={[0.12, 0.8, 16, 32]} />
        <meshStandardMaterial
          color="#8d5524"
          roughness={0.8}
          metalness={0.0}
        />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 2.55, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 16]} />
        <meshStandardMaterial
          color="#8d5524"
          roughness={0.8}
        />
      </mesh>

      {/* Head - improved skin tone */}
      <mesh ref={headRef} position={[0, 2.8, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#a0703d"
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Hair - modern style */}
      <mesh position={[0, 3.0, -0.05]}>
        <sphereGeometry args={[0.37, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Hair front detail */}
      <mesh position={[0, 2.95, 0.25]}>
        <boxGeometry args={[0.3, 0.15, 0.1]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.9}
        />
      </mesh>

      {/* Eyes - white part */}
      <mesh position={[-0.15, 2.85, 0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[0.15, 2.85, 0.3]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Eyes - iris */}
      <mesh position={[-0.15, 2.85, 0.34]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color="#1e88e5"
          roughness={0.3}
          emissive="#1e88e5"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0.15, 2.85, 0.34]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color="#1e88e5"
          roughness={0.3}
          emissive="#1e88e5"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Eyes - pupils */}
      <mesh ref={leftEyeRef} position={[-0.15, 2.85, 0.36]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.15, 2.85, 0.36]}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Eyebrows */}
      <mesh position={[-0.15, 2.95, 0.3]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.12, 0.025, 0.02]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0.15, 2.95, 0.3]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.12, 0.025, 0.02]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.9}
        />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 2.75, 0.35]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial
          color="#8d5524"
          roughness={0.8}
        />
      </mesh>

      {/* Smile */}
      <mesh position={[0, 2.65, 0.32]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.15, 0.025, 16, 32, Math.PI]} />
        <meshStandardMaterial
          color="#d35400"
          roughness={0.6}
        />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.65, 1.4, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#8d5524"
          roughness={0.8}
        />
      </mesh>
      <mesh position={[0.65, 1.4, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color="#8d5524"
          roughness={0.8}
        />
      </mesh>

      {/* Feet - dress shoes */}
      <mesh position={[-0.25, 0.15, 0.1]}>
        <boxGeometry args={[0.2, 0.15, 0.35]} />
        <meshStandardMaterial
          color="#0f0f0f"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0.25, 0.15, 0.1]}>
        <boxGeometry args={[0.2, 0.15, 0.35]} />
        <meshStandardMaterial
          color="#0f0f0f"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Belt */}
      <mesh position={[0, 1.4, 0.15]}>
        <boxGeometry args={[0.55, 0.08, 0.05]} />
        <meshStandardMaterial
          color="#3d2817"
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {/* Belt buckle */}
      <mesh position={[0, 1.4, 0.19]}>
        <boxGeometry args={[0.08, 0.06, 0.02]} />
        <meshStandardMaterial
          color="#ffd700"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>
    </group>
  )
}
