import { Redirect } from 'expo-router'
import { useAppProgress } from '@/src/features/progress'

/** Endless entry redirects into the shared GameScreen. */
export default function EndlessRoute() {
	const progress = useAppProgress()
	return (
		<Redirect
			href={{
				pathname: '/game',
				params: {
					source: 'endless',
					completed: String(progress.state.endless.completedCount),
				},
			}}
		/>
	)
}
