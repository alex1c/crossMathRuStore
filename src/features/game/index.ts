export type {
	GameSourceKind,
	CampaignGameSource,
	DailyGameSource,
	EndlessGameSource,
	DevFixtureGameSource,
	GameSource,
} from './source'
export {
	getCampaignTierLabel,
	getGameSourceTitle,
	getGameSourceSubtitle,
} from './source'

export {
	computeBoardLayout,
	computeOccupiedBoardLayout,
	getOccupiedBounds,
	toVisualCoordinate,
	toLogicalCoordinate,
	DEFAULT_BOARD_SIZING,
} from './boardLayout'
export type { BoardLayout, BoardLayoutInput, OccupiedBounds } from './boardLayout'

export {
	computeGameVerticalLayout,
	computeControlsHeight,
	CONTROL_TOUCH,
	CONTROL_ROW_GAP,
	GAME_BANNER_RESERVED_HEIGHT,
} from './gameLayout'
export type {
	ControlMetrics,
	GameVerticalLayout,
	GameVerticalLayoutInput,
} from './gameLayout'

export {
	listBlankCells,
	buildSolutionMap,
	createInitialEntries,
	findRelatedCoordinates,
	nextBlankCoordinate,
	areAllBlanksFilled,
	isSolutionCorrect,
	appendDraftDigit,
	formatElapsed,
} from './helpers'

export {
	createGameState,
	gameReducer,
	getBlankDisplayValue,
	isBlankShowingError,
	getFillProgress,
} from './gameReducer'
export type {
	GameState,
	GameAction,
	GameStatus,
	UndoEntry,
	CreateGameStateInput,
} from './gameReducer'

export {
	createSessionFromSource,
	createSessionFromPersisted,
} from './createSession'

export { MULTI_DIGIT_DEV_FIXTURE } from './devFixture'
