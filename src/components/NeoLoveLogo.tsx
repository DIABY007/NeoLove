import Image from 'next/image'

interface NeoLoveLogoProps {
  size?: number
  className?: string
}

export default function NeoLoveLogo({ size = 64, className = '' }: NeoLoveLogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="NeoLove"
      width={size}
      height={size}
      className={`rounded-2xl ${className}`}
      priority
    />
  )
}

