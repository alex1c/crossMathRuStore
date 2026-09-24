/**
 * Expo config plugin: wire Android release builds to external production signing.
 *
 * Reads D:/secure/android-signing/crossMath/signing.properties (or
 * CROSSMATH_SIGNING_PROPERTIES env override). Never embeds passwords.
 * Debug builds keep the standard debug keystore.
 */

const { withAppBuildGradle, createRunOncePlugin } = require('expo/config-plugins')

const SIGNING_MARKER = '// crossmath-release-signing'
const DEFAULT_SIGNING_PROPERTIES_PATH =
	'D:/secure/android-signing/crossMath/signing.properties'
const EXPECTED_ALIAS = 'crossmath'

/**
 * Injects release signingConfigs that load from external signing.properties.
 * Values are trimmed. Release fails clearly if the file or required keys are absent.
 * Never falls back to debug signing for intended production release.
 */
function applyReleaseSigning(buildGradle) {
	if (buildGradle.includes(SIGNING_MARKER)) {
		return buildGradle
	}

	const releaseSigningBlock = `
        ${SIGNING_MARKER}
        release {
            // External production signing — passwords never live in the repo.
            def signingPropertiesPath = System.getenv('CROSSMATH_SIGNING_PROPERTIES') ?: '${DEFAULT_SIGNING_PROPERTIES_PATH}'
            def signingPropertiesFile = file(signingPropertiesPath)
            if (!signingPropertiesFile.isFile()) {
                throw new GradleException("Production signing properties not found: \${signingPropertiesPath}")
            }
            def signingProperties = new Properties()
            signingPropertiesFile.withInputStream { signingProperties.load(it) }
            ['storeFile', 'storePassword', 'keyAlias', 'keyPassword'].each { requiredKey ->
                def raw = signingProperties.getProperty(requiredKey)
                if (raw == null || raw.toString().trim().isEmpty()) {
                    throw new GradleException("Missing production signing property: \${requiredKey}")
                }
            }
            def trimmedAlias = signingProperties.getProperty('keyAlias').toString().trim()
            if (trimmedAlias != '${EXPECTED_ALIAS}') {
                throw new GradleException("Production signing alias must be ${EXPECTED_ALIAS}")
            }
            def storeFilePath = signingProperties.getProperty('storeFile').toString().trim()
            def storeFileCandidate = new File(storeFilePath)
            if (!storeFileCandidate.isFile()) {
                throw new GradleException("Production keystore not found: \${storeFilePath}")
            }
            storeFile storeFileCandidate
            storePassword signingProperties.getProperty('storePassword').toString().trim()
            keyAlias trimmedAlias
            keyPassword signingProperties.getProperty('keyPassword').toString().trim()
        }`

	let next = buildGradle.replace(
		/signingConfigs\s*\{\s*debug\s*\{[\s\S]*?\}\s*\}/,
		(match) => {
			// Keep the existing debug block; append release next to it.
			const withoutClosing = match.replace(/\}\s*$/, '')
			return `${withoutClosing}${releaseSigningBlock}
    }`
		},
	)

	// Force release buildType to use release signing — never debug for production.
	next = next.replace(
		/(buildTypes\s*\{[\s\S]*?^\s*release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/m,
		'$1signingConfig signingConfigs.release',
	)

	return next
}

function withReleaseSigning(config) {
	return withAppBuildGradle(config, (cfg) => {
		if (cfg.modResults.language !== 'groovy') {
			return cfg
		}
		cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents)
		return cfg
	})
}

module.exports = createRunOncePlugin(
	withReleaseSigning,
	'crossmath-release-signing',
	'1.0.0',
)
