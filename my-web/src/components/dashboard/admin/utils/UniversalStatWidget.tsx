import { memo } from "react"
import { UniversalStatCard, UniversalStatCardProps } from "./UniversalStatCard"

export interface UniversalStatWidgetProps {
  stats: UniversalStatCardProps[]
}

export const UniversalStatWidget: React.FC<UniversalStatWidgetProps> = memo(({ stats }) => (
  <div className='grid gap-3' style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
    {stats.map((stat, i) => (
      <UniversalStatCard key={i} {...stat} />
    ))}
  </div>
))
