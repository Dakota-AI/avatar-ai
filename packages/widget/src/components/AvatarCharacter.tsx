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

function FallbackAvatar({ isTalking }: { isTalking: boolean }) {
  const groupRef = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.position.y = -1 + Math.sin(t * 2) * 0.03
    if (isTalking) {
      groupRef.current.rotation.x = Math.sin(t * 8) * 0.03
    } else {
      groupRef.current.rotation.x = 0
    }
  })

  return (
    <group ref={groupRef} scale={1.5} position={[0, -1, 0]}>
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.3, 1.2, 16, 32]} />
        <meshStandardMaterial color="#667eea" />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#f5d5b8" />
      </mesh>
      <mesh position={[-0.1, 2.18, 0.28]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0.1, 2.18, 0.28]}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial color="#2c3e50" />
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
    return <FallbackAvatar isTalking={currentAnimation === 'talk'} />
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
