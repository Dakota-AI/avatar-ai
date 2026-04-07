import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Group, AnimationAction } from 'three'

export type AvatarAnimation = 'idle' | 'walk' | 'talk' | 'wave'

interface AvatarCharacterProps {
  modelPath?: string
  currentAnimation: AvatarAnimation
  isWalkingIn: boolean
  isWalkingOff: boolean
  onWalkInComplete?: () => void
  onWalkOffComplete?: () => void
  targetX?: number | null
}

function FallbackAvatar({ isTalking, isWalkingIn, isWalkingOff, onWalkInComplete, onWalkOffComplete }: {
  isTalking: boolean
  isWalkingIn: boolean
  isWalkingOff: boolean
  onWalkInComplete?: () => void
  onWalkOffComplete?: () => void
}) {
  const groupRef = useRef<Group>(null)
  const walkInDoneRef = useRef(false)
  const walkOffDoneRef = useRef(false)
  const blinkRef = useRef(1)

  useEffect(() => {
    if (isWalkingIn) {
      walkInDoneRef.current = false
      if (groupRef.current) groupRef.current.position.x = 5
    }
  }, [isWalkingIn])

  useEffect(() => {
    if (isWalkingOff) walkOffDoneRef.current = false
  }, [isWalkingOff])

  // Random blinking
  useEffect(() => {
    const blink = () => {
      blinkRef.current = 0.1
      setTimeout(() => { blinkRef.current = 1 }, 150)
    }
    const interval = setInterval(blink, 2500 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    const pos = groupRef.current.position

    // Walk in
    if (isWalkingIn && !walkInDoneRef.current) {
      if (pos.x > 0.05) {
        pos.x -= delta * 3
      } else {
        pos.x = 0
        walkInDoneRef.current = true
        onWalkInComplete?.()
      }
    }

    // Walk off
    if (isWalkingOff && !walkOffDoneRef.current) {
      pos.x += delta * 3
      if (pos.x > 6) {
        walkOffDoneRef.current = true
        onWalkOffComplete?.()
      }
    }

    // Idle breathing
    groupRef.current.position.y = -1.8 + Math.sin(t * 1.5) * 0.02

    // Talking head bob
    if (isTalking) {
      groupRef.current.children[0].rotation.z = Math.sin(t * 3) * 0.04
      groupRef.current.children[0].rotation.x = Math.sin(t * 5) * 0.02
    } else {
      groupRef.current.children[0].rotation.z = Math.sin(t * 0.5) * 0.01
      groupRef.current.children[0].rotation.x = 0
    }
  })

  const skin = '#e8b898'
  const shirt = '#4a7cdb'
  const pants = '#2c3e50'
  const hair = '#3d2314'
  const shoe = '#1a1a1a'

  return (
    <group ref={groupRef} position={[5, -1.8, 0]}>
      {/* Upper body group — for head bob */}
      <group>
        {/* Head */}
        <mesh position={[0, 1.62, 0]}>
          <sphereGeometry args={[0.14, 32, 32]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 1.72, -0.02]}>
          <sphereGeometry args={[0.145, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Left eye */}
        <mesh position={[-0.045, 1.64, 0.12]}>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.045, 1.64, 0.135]} scale={[1, blinkRef.current, 1]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>
        {/* Right eye */}
        <mesh position={[0.045, 1.64, 0.12]}>
          <sphereGeometry args={[0.022, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.045, 1.64, 0.135]} scale={[1, blinkRef.current, 1]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>
        {/* Nose */}
        <mesh position={[0, 1.6, 0.14]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Mouth */}
        <mesh position={[0, 1.55, 0.13]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.05, isTalking ? 0.025 : 0.008, 0.01]} />
          <meshStandardMaterial color="#c0756b" />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 1.45, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.08, 16]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>

        {/* Torso — shirt */}
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.32, 0.42, 0.18]} />
          <meshStandardMaterial color={shirt} roughness={0.6} />
        </mesh>
        {/* Collar */}
        <mesh position={[0, 1.39, 0.06]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.12, 0.04, 0.08]} />
          <meshStandardMaterial color="white" roughness={0.5} />
        </mesh>

        {/* Left arm */}
        <mesh position={[-0.22, 1.2, 0]} rotation={[0, 0, 0.12]}>
          <capsuleGeometry args={[0.045, 0.32, 8, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.6} />
        </mesh>
        {/* Left hand */}
        <mesh position={[-0.26, 0.98, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.22, 1.2, 0]} rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[0.045, 0.32, 8, 16]} />
          <meshStandardMaterial color={shirt} roughness={0.6} />
        </mesh>
        {/* Right hand */}
        <mesh position={[0.26, 0.98, 0]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
      </group>

      {/* Belt */}
      <mesh position={[0, 0.96, 0]}>
        <boxGeometry args={[0.3, 0.04, 0.17]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Belt buckle */}
      <mesh position={[0, 0.96, 0.09]}>
        <boxGeometry args={[0.04, 0.03, 0.01]} />
        <meshStandardMaterial color="#c0a060" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Left leg */}
      <mesh position={[-0.08, 0.65, 0]}>
        <capsuleGeometry args={[0.06, 0.4, 8, 16]} />
        <meshStandardMaterial color={pants} roughness={0.7} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.08, 0.65, 0]}>
        <capsuleGeometry args={[0.06, 0.4, 8, 16]} />
        <meshStandardMaterial color={pants} roughness={0.7} />
      </mesh>

      {/* Left shoe */}
      <mesh position={[-0.08, 0.38, 0.03]}>
        <boxGeometry args={[0.08, 0.06, 0.14]} />
        <meshStandardMaterial color={shoe} roughness={0.5} />
      </mesh>
      {/* Right shoe */}
      <mesh position={[0.08, 0.38, 0.03]}>
        <boxGeometry args={[0.08, 0.06, 0.14]} />
        <meshStandardMaterial color={shoe} roughness={0.5} />
      </mesh>
    </group>
  )
}

function findClip(actions: Record<string, AnimationAction | null>, type: AvatarAnimation): AnimationAction | null {
  const nameMap: Record<AvatarAnimation, string[]> = {
    idle:  ['idle', 'standing', 'stand', 'breathe', 'mixamo'],
    walk:  ['walk', 'walking', 'run'],
    talk:  ['talk', 'talking', 'speak', 'gesture', 'wave_hip'],
    wave:  ['wave', 'greet', 'hi'],
  }
  const keywords = nameMap[type]
  const key = Object.keys(actions).find((name) =>
    keywords.some((kw) => name.toLowerCase().includes(kw))
  )
  return key ? actions[key] : null
}

function GLBAvatar({
  modelPath,
  currentAnimation,
  isWalkingIn,
  isWalkingOff,
  onWalkInComplete,
  onWalkOffComplete,
}: Required<Pick<AvatarCharacterProps, 'modelPath' | 'currentAnimation' | 'isWalkingIn' | 'isWalkingOff'>> & {
  onWalkInComplete?: () => void
  onWalkOffComplete?: () => void
}) {
  const groupRef = useRef<Group>(null)
  const walkInDoneRef = useRef(false)
  const walkOffDoneRef = useRef(false)
  const gltf = useGLTF(modelPath)
  const { actions } = useAnimations(gltf.animations, groupRef)

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.x = isWalkingIn ? 6 : 0
    }
  }, [])

  useEffect(() => {
    if (isWalkingIn) {
      walkInDoneRef.current = false
      if (groupRef.current) groupRef.current.position.x = 6
    }
  }, [isWalkingIn])

  useEffect(() => {
    if (isWalkingOff) walkOffDoneRef.current = false
  }, [isWalkingOff])

  useEffect(() => {
    if (!actions) return
    const target = findClip(actions, currentAnimation)
    if (!target) return
    Object.values(actions).forEach((a) => a?.fadeOut(0.3))
    target.reset().fadeIn(0.3).play()
  }, [currentAnimation, actions])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const pos = groupRef.current.position

    if (isWalkingIn && !walkInDoneRef.current) {
      if (pos.x > 0.05) {
        pos.x -= delta * 3.5
      } else {
        pos.x = 0
        walkInDoneRef.current = true
        onWalkInComplete?.()
      }
    }

    if (isWalkingOff && !walkOffDoneRef.current) {
      pos.x += delta * 3.5
      if (pos.x > 7) {
        walkOffDoneRef.current = true
        onWalkOffComplete?.()
      }
    }
  })

  return (
    <group ref={groupRef} scale={2.5} position={[0, -1, 0]}>
      <primitive object={gltf.scene} />
    </group>
  )
}

export function AvatarCharacter({
  modelPath = '/models/avatar.glb',
  currentAnimation,
  isWalkingIn,
  isWalkingOff,
  onWalkInComplete,
  onWalkOffComplete,
}: AvatarCharacterProps) {
  const [modelFailed, setModelFailed] = useState(false)

  useEffect(() => {
    fetch(modelPath, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) setModelFailed(true)
      })
      .catch(() => setModelFailed(true))
  }, [modelPath])

  if (modelFailed) {
    return (
      <FallbackAvatar
        isTalking={currentAnimation === 'talk'}
        isWalkingIn={isWalkingIn}
        isWalkingOff={isWalkingOff}
        onWalkInComplete={onWalkInComplete}
        onWalkOffComplete={onWalkOffComplete}
      />
    )
  }

  return (
    <GLBAvatar
      modelPath={modelPath}
      currentAnimation={currentAnimation}
      isWalkingIn={isWalkingIn}
      isWalkingOff={isWalkingOff}
      onWalkInComplete={onWalkInComplete}
      onWalkOffComplete={onWalkOffComplete}
    />
  )
}
