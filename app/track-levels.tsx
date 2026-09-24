import { Redirect, useLocalSearchParams } from 'expo-router'
import {
	parseTrackRouteParam,
	TrackLevelsScreen,
} from '@/src/screens/TrackLevelsScreen'

export default function TrackLevelsRoute() {
	const params = useLocalSearchParams<{ track?: string }>()
	const track = parseTrackRouteParam(params.track)

	if (!track) {
		return <Redirect href="/levels" />
	}

	return <TrackLevelsScreen track={track} />
}
