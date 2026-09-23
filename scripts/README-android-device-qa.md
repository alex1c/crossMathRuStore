# ForestMusic Android device QA startup

This script provides the reusable real-device startup flow for ForestMusic
Expo/RN projects:

```powershell
cd D:\petProject\crossMathRuStore
.\scripts\android-device-qa.ps1
```

Use native build/install verification when native dependencies, plugins, or
native configuration changed:

```powershell
.\scripts\android-device-qa.ps1 -Build
```

Use a bounded PID-filtered logcat snapshot after launch:

```powershell
.\scripts\android-device-qa.ps1 -Logcat
```

The project root is inferred as the parent of the directory containing the
script. To reuse the script from another location, pass an explicit root:

```powershell
.\scripts\android-device-qa.ps1 -ProjectPath D:\petProject\anotherForestMusicApp
```

## Why `--host lan` is required on this Windows PC

On this machine, `npx expo start --dev-client --localhost --port 8081` binds
Metro to IPv6 loopback `::1:8081`. Consequently,
`Test-NetConnection 127.0.0.1 -Port 8081` fails and the phone cannot reach
Metro through `adb reverse`.

The verified flow is:

```text
npx expo start --dev-client --host lan --port 8081
adb reverse tcp:8081 tcp:8081
adb shell curl -s http://127.0.0.1:8081/status
```

The script therefore keeps one project on one Metro port, `8081`, verifies
both the host IPv4 socket and `/status`, applies the reverse mapping, and
then verifies the phone-side HTTP status before launching the dev client.

## Safety behavior

The script does not clean Gradle, delete caches or native folders, install npm
dependencies, run prebuild, change source/version/package configuration, kill
unknown processes, switch Metro ports, launch an AVD, reset Git, clean Git, or
force-push. Dirty Git state, an unknown 8081 owner, an unauthorized device,
missing native project in `-Build` mode, failed version verification, and
other uncertain states stop with a layer-specific diagnostic.

Default mode reuses an installed native build and starts/reuses the current
project's Metro. `-Build` runs only `android\gradlew.bat assembleDebug
--console=plain`, verifies `BUILD SUCCESSFUL`, installs the standard debug APK,
and compares `versionName`/`versionCode` with resolved Expo config.

The final PASS means device connectivity and dev-client startup passed. It
does not prove visual correctness, gameplay, or screen-level QA; the operator
must verify the physical phone UI separately.
