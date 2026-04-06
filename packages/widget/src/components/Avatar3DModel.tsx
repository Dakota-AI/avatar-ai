import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Group } from 'three'

interface Avatar3DModelProps {
  modelPath?: string
  isIdle?: boolean
  isTalking?: boolean
  isWalkingIn?: boolean
}

export function Avatar3DModel({
  modelPath = '/models/avatar.glb',
  isIdle = true,
  isTalking = false,
  isWalkingIn = false
}: Avatar3DModelProps) {
  const groupRef = useRef<Group>(null)
  const [modelError, setModelError] = useState(false)

  // Autonomous behaviors
  const [isBlinking, setIsBlinking] = useState(false)
  const [nextGesture, setNextGesture] = useState<'wave' | 'nod' | 'tilt' | null>(null)
  const [gestureTime, setGestureTime] = useState(0)

  // Try to load the GLTF model
  let gltf: any = null
  let animations: any = null

  try {
    gltf = useGLTF(modelPath)
    const animationsData = useAnimations(gltf.animations || [], groupRef)
    animations = animationsData
  } catch (error) {
    console.error('Failed to load model:', error)
    if (!modelError) setModelError(true)
  }

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

  // Play animations if available
  useEffect(() => {
    if (animations && animations.actions) {
      const actionNames = Object.keys(animations.actions)

      // Try to find and play idle animation
      const idleAction = actionNames.find(name =>
        name.toLowerCase().includes('idle') ||
        name.toLowerCase().includes('standing')
      )

      if (idleAction && animations.actions[idleAction]) {
        animations.actions[idleAction].play()
      } else if (actionNames.length > 0) {
        // Play first animation as fallback
        animations.actions[actionNames[0]].play()
      }
    }
  }, [animations])

  // Animations
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime

    if (!groupRef.current) return

    // Walk-in animation
    if (isWalkingIn && time < 1.2) {
      groupRef.current.position.x = (1 - time / 1.2) * 4
    }

    // Gentle breathing - subtle up and down
    if (isIdle && !isTalking && !nextGesture) {
      groupRef.current.position.y = -1 + Math.sin(time * 2) * 0.03
    }

    // Gentle idle sway
    if (isIdle && !isTalking && !nextGesture) {
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05
      groupRef.current.rotation.z = Math.sin(time * 0.7) * 0.02
    }

    // Head bob when talking
    if (isTalking) {
      groupRef.current.rotation.x = Math.sin(time * 8) * 0.03
      groupRef.current.position.y = -1 + Math.sin(time * 12) * 0.02
    }

    // Autonomous gestures - more pronounced
    if (nextGesture) {
      setGestureTime(prev => prev + delta)

      if (nextGesture === 'nod') {
        groupRef.current.rotation.x = Math.sin(gestureTime * 5) * 0.15
      } else if (nextGesture === 'tilt') {
        groupRef.current.rotation.z = Math.sin(gestureTime * 3) * 0.2
      } else if (nextGesture === 'wave') {
        groupRef.current.rotation.y = Math.sin(gestureTime * 4) * 0.3
        groupRef.current.position.y = -1 + Math.sin(gestureTime * 4) * 0.1
      }
    }
  })

  // Fallback if model fails to load
  if (modelError || !gltf) {
    return (
      <group ref={groupRef} scale={1.5} position={[0, -1, 0]}>
        {/* Simple fallback avatar */}
        <mesh position={[0, 1, 0]}>
          <capsuleGeometry args={[0.3, 1.2, 16, 32]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshStandardMaterial color="#f5d5b8" />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={groupRef} scale={2.5} position={[0, -1, 0]}>
      <primitive object={gltf.scene} />
    </group>
  )
}

// Preload the model
useGLTF.preload('/models/avatar.glb')
