// Compatibility patch for the pinned legacy voice module on modern Expo Gradle.
// Runs on both developer machines and EAS after npm installs dependencies.
const fs = require('fs')
const path = require('path')
const root = path.dirname(require.resolve('@react-native-voice/voice/package.json'))
const version = require(path.join(root, 'package.json')).version
if (version !== '3.2.4') throw new Error('Review voice Android compatibility patch for version ' + version)
const gradle = path.join(root, 'android/build.gradle')
let source = fs.readFileSync(gradle, 'utf8')
source = source.replace(/jcenter\(\)/g, 'mavenCentral()')
if (!source.includes("namespace 'com.wenkesj.voice'")) {
  source = source.replace('android {', "android {\n    namespace 'com.wenkesj.voice'")
}
source = source.replace('minSdkVersion 15', 'minSdkVersion rootProject.ext.minSdkVersion')
source = source.replace('getDefaultProguardFile(\'proguard-android.txt\')', "getDefaultProguardFile('proguard-android-optimize.txt')")
source = source.replace('implementation "com.android.support:appcompat-v7:${supportVersion}"', "implementation 'androidx.appcompat:appcompat:1.7.0'")
source = source.replace("implementation 'com.facebook.react:react-native:+'", "implementation 'com.facebook.react:react-android'")
fs.writeFileSync(gradle, source)
const manifest = path.join(root, 'android/src/main/AndroidManifest.xml')
fs.writeFileSync(manifest, fs.readFileSync(manifest, 'utf8').replace(/\s+package="com.wenkesj.voice"/, ''))
// Modern RN exposes the Android getName() (RCTVoice) without the legacy RCT prefix alias.
for (const relative of ['dist/index.js', 'src/index.ts']) {
  const file = path.join(root, relative)
  let content = fs.readFileSync(file, 'utf8')
  if (relative.startsWith('dist')) {
    content = content.replace('const Voice = react_native_1.NativeModules.Voice;', 'const Voice = react_native_1.NativeModules.Voice || react_native_1.NativeModules.RCTVoice;')
  } else {
    content = content.replace('const Voice = NativeModules.Voice as VoiceModule;', 'const Voice = (NativeModules.Voice || NativeModules.RCTVoice) as VoiceModule;')
  }
  if (!content.includes('NativeModules.RCTVoice')) throw new Error('Voice module lookup patch failed: ' + relative)
  fs.writeFileSync(file, content)
}
console.log('Applied voice Android compatibility patch')
