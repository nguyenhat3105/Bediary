const { withAndroidManifest } = require('expo/config-plugins');

// Android 11+ hides recognition services unless the application declares this query.
module.exports = function withSpeechRecognition(config) {
  return withAndroidManifest(config, config => {
    const manifest = config.modResults.manifest;
    const action = 'android.speech.RecognitionService';
    const queries = manifest.queries || (manifest.queries = []);
    const exists = queries.some(query => (query.intent || []).some(intent =>
      (intent.action || []).some(item => item.$?.['android:name'] === action)));
    if (!exists) queries.push({ intent: [{ action: [{ $: { 'android:name': action } }] }] });
    return config;
  });
};
