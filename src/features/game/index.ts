export type {
	GameSourceKind,
	TrackGameSource,
	DailyGameSource,
	EndlessGameSource,
	MultiplicationGameSource,
	DevFixtureGameSource,
	TutorialGameSource,
	GameSource,
} from './source'
export {
	getCampaignTierLabel,
	getGameSourceTitle,
	getGameSourceSubtitle,
	getGameSourceIdentity,
} from './source'

export {
	computeBoardLayout,
	computeOccupiedBoardLayout,
	getOccupiedBounds,
	toVisualCoordinate,
	toLogicalCoordinate,
	DEFAULT_BOARD_SIZING,
	getCellGlyphFontSize,
} from './boardLayout'
export type { BoardLayout, BoardLayoutInput, OccupiedBounds, CellGlyphKind } from './boardLayout'

export {
	computeGameVerticalLayout,
	computeControlsHeight,
	computeBankControlsHeight,
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
export type { PlayablePuzzle } from './helpers'

export {
	createGameState,
	gameReducer,
	getBlankDisplayValue,
	isBlankShowingError,
	isBlankHinted,
	getFillProgress,
	getRemainingBankItems,
} from './gameReducer'
export type {
	GameState,
	GameAction,
	GameStatus,
	GameInputMode,
	UndoEntry,
	CreateGameStateInput,
} from './gameReducer'

export {
	createSessionFromSource,
	createSessionFromPersisted,
} from './createSession'

export { buildCompletionPresentation } from './completion'
export type { CompletionPresentation } from './completion'

export { MULTI_DIGIT_DEV_FIXTURE } from './devFixture'
export { BANK_DUP_DEV_FIXTURE } from './bankFixture'
