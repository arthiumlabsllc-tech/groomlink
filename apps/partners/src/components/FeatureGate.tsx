import { ReactNode } from 'react'
import { useFeatureCheck } from '../hooks/useSubscription'
import UpgradePrompt from './UpgradePrompt'

interface FeatureGateProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
  description?: string
}

/**
 * Wrapper component that checks feature access.
 * If the salon has the feature, renders children.
 * If not, renders UpgradePrompt with the feature name.
 */
export default function FeatureGate({ feature, children, fallback, description }: FeatureGateProps) {
  const { hasFeature, loading } = useFeatureCheck(feature)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-ghana-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (hasFeature === false) {
    return fallback ? <>{fallback}</> : <UpgradePrompt feature={feature} description={description} />
  }

  return <>{children}</>
}
